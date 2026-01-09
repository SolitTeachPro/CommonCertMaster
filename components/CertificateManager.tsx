
import React, { useState, useEffect, useCallback } from 'react';
import { Certificate } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Plus, Grid, List, Search, Trash2, Edit3, 
  Award, ShieldCheck, ArrowUpRight, X, AlignLeft,
  Image as ImageIcon, Loader2, Zap, Sparkles, Upload,
  CheckCircle2, Trophy, Check, Layers, Circle
} from 'lucide-react';

/**
 * 辅助函数：裁剪并压缩图片
 * 根据归一化的坐标 [ymin, xmin, ymax, xmax] 从原图中裁剪并压缩
 */
const cropAndCompressImage = (
  base64Str: string, 
  box: [number, number, number, number] | undefined,
  targetSize = 400
): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('');
        return;
      }

      let sx = 0, sy = 0, sw = img.width, sh = img.height;

      // 如果提供了坐标框 (归一化 0-1000)
      if (box && box.length === 4) {
        const [ymin, xmin, ymax, xmax] = box;
        sx = (xmin / 1000) * img.width;
        sy = (ymin / 1000) * img.height;
        sw = ((xmax - xmin) / 1000) * img.width;
        sh = ((ymax - ymin) / 1000) * img.height;
      }

      // 设定目标尺寸（等比缩放）
      const ratio = sw / sh;
      if (sw > sh) {
        canvas.width = targetSize;
        canvas.height = targetSize / ratio;
      } else {
        canvas.height = targetSize;
        canvas.width = targetSize * ratio;
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve('');
  });
};

/**
 * 基础压缩函数（用于单图）
 */
const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(base64Str); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => resolve(base64Str);
  });
};

interface CertificateManagerProps {
  certificates: Certificate[];
  setCertificates: React.Dispatch<React.SetStateAction<Certificate[]>>;
  onSelect: (cert: Certificate) => void;
  questionStats: Record<string, number>;
}

export const CertificateManager: React.FC<CertificateManagerProps> = ({ 
  certificates, 
  setCertificates, 
  onSelect,
  questionStats
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<Certificate | null>(null);

  const filteredCerts = certificates.filter(c => 
    c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除此证书及关联的所有题库吗？')) {
      setCertificates(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleEdit = (cert: Certificate, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCert(cert);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">证书与题库管理</h2>
          <p className="text-slate-500 font-medium">选择或创建一个认证类别，开启专属练习空间</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1 shadow-inner">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}><Grid size={20} /></button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}><List size={20} /></button>
          </div>
          <button 
            onClick={() => { setEditingCert(null); setIsModalOpen(true); }}
            className="bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-orange-700 transition-all shadow-lg shadow-orange-100 flex-1 md:flex-none"
          >
            <Plus size={20} /> 添加证书
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="搜索证书名称、简称或领域..." 
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium text-slate-700 shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCerts.map((cert) => (
            <div 
              key={cert.id}
              onClick={() => onSelect(cert)}
              className="group bg-white rounded-[2.5rem] p-1 border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer overflow-hidden relative min-h-[340px] flex flex-col"
            >
              <div className="p-8 pb-10 flex-grow relative z-10">
                <div className="flex justify-between items-start mb-10">
                   <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all shadow-inner overflow-hidden border ${
                     cert.imageUrl ? 'bg-white border-slate-100' : 'bg-orange-50 text-orange-600 border-orange-100'
                   }`}>
                     {cert.imageUrl ? (
                        <img src={cert.imageUrl} className="w-full h-full object-cover" />
                     ) : (
                        <ShieldCheck size={40} />
                     )}
                   </div>
                   
                   <div className="text-slate-100 opacity-40 group-hover:opacity-70 group-hover:scale-105 transition-all duration-700 transform">
                     <ShieldCheck size={80} strokeWidth={1} />
                   </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-[10px] font-black text-orange-600 uppercase tracking-widest leading-none">{cert.name} Certification</h4>
                    {cert.status === 'obtained' && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 leading-tight tracking-tight group-hover:text-slate-900 transition-colors">{cert.fullName}</h3>
                  <div className="pt-4 flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 bg-slate-900/5 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-tighter border border-slate-900/5">{cert.level}</span>
                    <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">{cert.domain}</span>
                    {cert.status === 'obtained' && (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 bg-orange-600 text-white rounded-lg text-[10px] font-black uppercase tracking-tighter shadow-sm shadow-orange-100">
                        <CheckCircle2 size={10} strokeWidth={3} /> 已获取
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-10 pt-6 border-t border-slate-50 flex items-center justify-between transition-colors">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Question Count</span>
                    <span className="text-xl font-black text-slate-800">{questionStats[cert.id] || 0}</span>
                  </div>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 bg-slate-900 text-white group-hover:bg-orange-600 shadow-slate-100">
                    <ArrowUpRight size={24} />
                  </div>
                </div>
              </div>

              <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                <button onClick={(e) => handleEdit(cert, e)} className="p-2.5 bg-white/95 backdrop-blur rounded-xl text-slate-400 hover:text-blue-600 shadow-xl transition-colors border border-slate-100"><Edit3 size={18}/></button>
                <button onClick={(e) => handleDelete(cert.id, e)} className="p-2.5 bg-white/95 backdrop-blur rounded-xl text-slate-400 hover:text-red-600 shadow-xl transition-colors border border-slate-100"><Trash2 size={18}/></button>
              </div>
            </div>
          ))}

          {filteredCerts.length === 0 && (
            <button 
              onClick={() => { setEditingCert(null); setIsModalOpen(true); }}
              className="group border-2 border-dashed border-slate-200 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-slate-300 hover:border-orange-300 hover:text-orange-400 transition-all bg-slate-50/50 min-h-[340px]"
            >
              <div className="w-16 h-16 rounded-full border-2 border-current flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Plus size={32} /></div>
              <p className="font-bold">添加新证书</p>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
           <table className="w-full text-left">
             <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
               <tr>
                 <th className="px-8 py-5">证书名称</th>
                 <th className="px-8 py-5">认证领域</th>
                 <th className="px-8 py-5">级别</th>
                 <th className="px-8 py-5">状态</th>
                 <th className="px-8 py-5 text-right">管理</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {filteredCerts.map((cert) => (
                 <tr 
                   key={cert.id} 
                   onClick={() => onSelect(cert)}
                   className="hover:bg-orange-50/30 transition-colors cursor-pointer group"
                 >
                   <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-slate-100 flex items-center justify-center bg-slate-50">
                           {cert.imageUrl ? (
                             <img src={cert.imageUrl} className="w-full h-full object-cover" />
                           ) : (
                             <Award className="text-orange-500" size={20} />
                           )}
                        </div>
                        <span className="font-bold text-slate-700">{cert.fullName}</span>
                      </div>
                   </td>
                   <td className="px-8 py-5 text-slate-500 font-bold text-sm uppercase tracking-tight">{cert.domain}</td>
                   <td className="px-8 py-5">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-wider">{cert.level}</span>
                   </td>
                   <td className="px-8 py-5">
                      {cert.status === 'obtained' ? (
                        <div className="flex items-center gap-2 text-emerald-600 whitespace-nowrap">
                          <CheckCircle2 size={20} strokeWidth={3} />
                          <span className="text-[10px] font-black uppercase tracking-widest">已获取</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-300 whitespace-nowrap">
                          <Circle size={20} strokeWidth={3} />
                          <span className="text-[10px] font-black uppercase tracking-widest">未获取</span>
                        </div>
                      )}
                   </td>
                   <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => handleEdit(cert, e)} className="p-2 text-slate-300 hover:text-blue-500 transition-colors"><Edit3 size={18}/></button>
                        <button onClick={(e) => handleDelete(cert.id, e)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                      </div>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      )}

      {isModalOpen && (
        <CertificateModal 
          onClose={() => setIsModalOpen(false)} 
          onSave={(certs) => {
            if (editingCert) {
              const updated = certs[0];
              setCertificates(prev => prev.map(c => c.id === updated.id ? updated : c));
            } else {
              setCertificates(prev => [...prev, ...certs]);
            }
            setIsModalOpen(false);
          }}
          editingCert={editingCert}
        />
      )}
    </div>
  );
};

const CertificateModal: React.FC<{ onClose: () => void, onSave: (c: Certificate[]) => void, editingCert: Certificate | null }> = ({ onClose, onSave, editingCert }) => {
  const [formData, setFormData] = useState<Partial<Certificate>>(editingCert || {
    name: '',
    fullName: '',
    domain: '',
    level: 'Professional',
    status: 'not_obtained',
    description: '',
    imageUrl: '',
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [originalImage, setOriginalImage] = useState<string>(''); // 存储原始大图供裁剪
  const [parsedResults, setParsedResults] = useState<(Partial<Certificate> & { box_2d?: [number, number, number, number] })[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  const analyzeImage = async (base64: string) => {
    setIsAnalyzing(true);
    setOriginalImage(base64);
    setFormData(prev => ({ ...prev, imageUrl: base64 }));

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const imagePart = {
        inlineData: {
          mimeType: 'image/png',
          data: base64.split(',')[1],
        },
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            imagePart,
            { text: "这是一张包含一个或多个 IT 认证证书的图片。请识别并提取其中所有的证书信息。对于每个证书，提取其全称 (fullName)、简称 (name)、专业领域 (domain)、级别 (level: Associate, Professional, Expert)、知识点比重 (description)，以及该证书在原图中的检测框 [ymin, xmin, ymax, xmax] (归一化到 0-1000)。请返回 JSON 格式的列表。" }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              certificates: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    fullName: { type: Type.STRING },
                    name: { type: Type.STRING },
                    domain: { type: Type.STRING },
                    level: { type: Type.STRING, enum: ["Associate", "Professional", "Expert"] },
                    description: { type: Type.STRING },
                    box_2d: { 
                      type: Type.ARRAY, 
                      items: { type: Type.NUMBER },
                      description: "检测框坐标 [ymin, xmin, ymax, xmax]" 
                    }
                  },
                  required: ["fullName", "name", "domain", "level", "box_2d"]
                }
              }
            },
            required: ["certificates"]
          }
        }
      });

      const result = JSON.parse(response.text || '{"certificates":[]}');
      const certs = result.certificates || [];

      if (certs.length > 1 && !editingCert) {
        setParsedResults(certs);
        setSelectedIndices(new Set(certs.map((_: any, i: number) => i)));
      } else if (certs.length > 0) {
        const first = certs[0];
        setFormData(prev => ({ ...prev, ...first, imageUrl: base64 }));
        setParsedResults([]);
      }
    } catch (error) {
      console.error("AI Analysis failed:", error);
      alert("AI 证书解析失败，请手动填写。");
    } finally { setIsAnalyzing(false); }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => analyzeImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (ev) => analyzeImage(ev.target?.result as string);
          reader.readAsDataURL(blob);
        }
      }
    }
  }, []);

  const handleToggleSelect = (idx: number) => {
    const next = new Set(selectedIndices);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setSelectedIndices(next);
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);
    try {
      if (parsedResults.length > 1 && !editingCert) {
        const now = Date.now();
        const results: Certificate[] = [];
        
        // 依次裁剪每个证书
        const selectedArr = Array.from(selectedIndices);
        for (let i = 0; i < selectedArr.length; i++) {
          const idx = selectedArr[i];
          const item = parsedResults[idx];
          
          let croppedUrl = '';
          if (originalImage && item.box_2d) {
            croppedUrl = await cropAndCompressImage(originalImage, item.box_2d);
          }

          results.push({
            ...item,
            id: `cert-${now}-${i}`,
            status: 'not_obtained',
            updatedAt: now,
            imageUrl: croppedUrl,
            fullName: item.fullName || '未命名证书',
            name: item.name || 'CERT',
            domain: item.domain || 'General',
            level: (item.level as any) || 'Professional',
            description: item.description || ''
          } as Certificate);
        }
        onSave(results);
      } else {
        // 单个保存：尝试裁剪或全图压缩
        let finalImageUrl = formData.imageUrl || '';
        // 如果是从多选后的单个编辑，且有 box 信息，可以裁剪
        if (finalImageUrl && finalImageUrl.startsWith('data:')) {
           finalImageUrl = await compressImage(finalImageUrl);
        }

        onSave([{
          ...formData as Certificate, 
          imageUrl: finalImageUrl,
          id: formData.id || `cert-${Date.now()}`,
          status: formData.status || 'not_obtained',
          updatedAt: Date.now()
        }]);
      }
    } catch (error) {
      console.error("Save failed:", error);
      alert("保存失败。");
    } finally { setIsSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden scale-in-center flex flex-col max-h-[90vh]" onPaste={handlePaste}>
        <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
             <div className="bg-orange-50 p-2 rounded-xl text-orange-600"><ShieldCheck size={20} /></div>
             <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
               {editingCert ? '编辑证书信息' : parsedResults.length > 1 ? '识别到多个证书' : '创建新证书类别'}
             </h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><X size={20}/></button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
              <span>证书范例图片 (Example Image)</span>
              {isAnalyzing && <span className="text-blue-500 animate-pulse flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> 正在智能解析与分割图片...</span>}
            </label>
            <div className={`relative h-40 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 overflow-hidden bg-slate-50 group cursor-pointer ${formData.imageUrl ? 'border-orange-500' : 'border-slate-200 hover:border-orange-300'}`}>
              {formData.imageUrl ? (
                <>
                  <img src={formData.imageUrl} className="absolute inset-0 w-full h-full object-contain bg-white" />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                     <span className="text-xs font-black text-white bg-orange-600 px-4 py-2 rounded-xl shadow-lg">更换图片 (或 Ctrl+V 粘贴)</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-slate-100 p-3 rounded-2xl group-hover:scale-110 transition-transform"><ImageIcon className="text-slate-400" size={32} /></div>
                  <div className="text-center px-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">点击上传或直接在此粘贴证书截图</p>
                    <p className="text-[9px] text-blue-500 font-bold mt-1 uppercase">支持自动分割大图中的多个证书并独立保存</p>
                  </div>
                </>
              )}
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleImageUpload} />
            </div>
          </div>

          {parsedResults.length > 1 && !editingCert ? (
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">选择要导入的证书 ({selectedIndices.size}/{parsedResults.length})</span>
                 <button onClick={() => setSelectedIndices(selectedIndices.size === parsedResults.length ? new Set() : new Set(parsedResults.map((_, i) => i)))} className="text-[10px] font-bold text-blue-600 uppercase hover:underline">
                   {selectedIndices.size === parsedResults.length ? '取消全选' : '全选'}
                 </button>
               </div>
               <div className="space-y-2">
                 {parsedResults.map((res, idx) => (
                   <div 
                    key={idx} 
                    onClick={() => handleToggleSelect(idx)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${selectedIndices.has(idx) ? 'bg-orange-50 border-orange-200 ring-1 ring-orange-100' : 'bg-slate-50 border-slate-100 opacity-60'}`}
                   >
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${selectedIndices.has(idx) ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                       {selectedIndices.has(idx) ? <Check size={20} strokeWidth={3} /> : <Plus size={20} />}
                     </div>
                     <div className="flex-grow overflow-hidden">
                       <h4 className="font-bold text-slate-800 text-sm truncate">{res.fullName}</h4>
                       <div className="flex items-center gap-2 mt-0.5">
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{res.name}</span>
                         <span className="w-1 h-1 rounded-full bg-slate-300" />
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{res.level}</span>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">证书全称 (Full Name)</label>
                <input 
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold"
                  placeholder="例如: Alibaba Cloud Certified Professional"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">简称 (Short Name)</label>
                  <input 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold"
                    placeholder="例如: ACP"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">专业领域 (Domain)</label>
                  <input 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold"
                    placeholder="例如: LLM, Cloud Computing"
                    value={formData.domain}
                    onChange={(e) => setFormData({...formData, domain: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">级别 (Level)</label>
                  <select 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold cursor-pointer"
                    value={formData.level}
                    onChange={(e) => setFormData({...formData, level: e.target.value as any})}
                  >
                    <option value="Associate">Associate (助理工程師)</option>
                    <option value="Professional">Professional (高級工程師)</option>
                    <option value="Expert">Expert (專家)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">证书状态 (Status)</label>
                  <div className="flex gap-2 p-1.5 bg-slate-100 rounded-xl">
                    <button 
                      onClick={() => setFormData({...formData, status: 'not_obtained'})}
                      className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${formData.status === 'not_obtained' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
                    >
                      未获取
                    </button>
                    <button 
                      onClick={() => setFormData({...formData, status: 'obtained'})}
                      className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${formData.status === 'obtained' ? 'bg-orange-600 text-white shadow-md' : 'text-slate-400'}`}
                    >
                      已获取
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <AlignLeft size={12} /> 知识点及比重描述 (Knowledge Weights)
                </label>
                <textarea 
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all font-bold h-32 resize-none text-sm"
                  placeholder="知识点比重..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
            </>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-all">取消</button>
          <button 
            disabled={isAnalyzing || isSaving || (parsedResults.length > 1 && selectedIndices.size === 0)}
            onClick={handleConfirmSave}
            className="flex-1 py-3 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 shadow-lg shadow-orange-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isAnalyzing || isSaving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : parsedResults.length > 1 ? (
              <Layers size={18} />
            ) : (
              <Sparkles size={18} />
            )}
            {isSaving ? '正在优化存储...' : parsedResults.length > 1 ? `确认导入 ${selectedIndices.size} 个证书` : '保存并开启题库'}
          </button>
        </div>
      </div>
    </div>
  );
};
