
import React, { useState, useMemo, useEffect } from 'react';
import { Question, QuestionFile, Certificate } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType } from "docx";
import { 
  Search, Trash2, FileText, Plus, Edit3, 
  LayoutList, Files, Power, CheckCircle2, 
  Filter, ChevronDown, Book, Database, Image as ImageIcon,
  Sparkles, Loader2, BrainCircuit, Check, ArrowRight, AlertCircle, Upload,
  CheckSquare, Square, Tags, FilterX, Download
} from 'lucide-react';

interface QuestionBankProps {
  questions: Question[];
  files: QuestionFile[];
  selectedCert: Certificate | null; // 新增：传入当前选中的证书以获取知识点描述
  onDelete?: (id: string) => void;
  onDeleteFile?: (fileId: string) => void;
  onToggleFile?: (fileId: string) => void;
  onClear?: () => void;
  onEdit?: (question: Question) => void;
  onAdd?: (question?: Question) => void;
  onAddAiQuestion?: (question: Question, batchTime: number) => void;
  onImport?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const QuestionBank: React.FC<QuestionBankProps> = ({ 
  questions, 
  files,
  selectedCert,
  onDelete, 
  onDeleteFile,
  onToggleFile,
  onClear,
  onEdit,
  onAdd,
  onAddAiQuestion,
  onImport
}) => {
  const [viewTab, setViewTab] = useState<'files' | 'questions' | 'ai'>('files');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'single' | 'multiple'>('all');
  const [filterFileId, setFilterFileId] = useState<string>('all');
  const [filterSourceType, setFilterSourceType] = useState<'all' | 'manual' | 'ai' | 'imported'>('all');
  
  // AI Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<Partial<Question>[]>([]);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [lastBatchTime, setLastBatchTime] = useState<number>(0);
  const [addedAiIds, setAddedAiIds] = useState<Set<string>>(new Set());

  // Activation Statistics
  const activeStats = useMemo(() => {
    const activeFileIds = new Set(files.filter(f => f.isActive).map(f => f.id));
    const activeQs = questions.filter(q => activeFileIds.has(q.fileId));
    
    return {
      total: activeQs.length,
      single: activeQs.filter(q => q.type === 'single').length,
      multiple: activeQs.filter(q => q.type === 'multiple').length,
      fileCount: activeFileIds.size,
      activeQs: activeQs
    };
  }, [files, questions]);

  // Helper to try parsing partial JSON array of questions
  const parseIncrementalJson = (text: string): Partial<Question>[] => {
    const start = text.indexOf('[');
    if (start === -1) return [];
    
    let content = text.substring(start);
    const lastBrace = content.lastIndexOf('}');
    if (lastBrace === -1) return [];

    const tempJson = content.substring(0, lastBrace + 1) + ']';
    try {
      return JSON.parse(tempJson);
    } catch (e) {
      return [];
    }
  };

  const handleGenerateAI = async () => {
    // 基础校验：如果没有权重描述，则必须有参考题库
    const hasWeights = !!selectedCert?.description && selectedCert.description.trim().length > 0;
    
    if (!hasWeights && activeStats.total === 0) {
      alert("大模型出题需要参考。请先在证书设置中填写'知识点及比重描述'，或激活至少一个含有题目的题库文件。");
      return;
    }

    setIsGenerating(true);
    setAiSuggestions([]);
    setGenerationProgress(10); 
    setAddedAiIds(new Set());
    setLastBatchTime(Date.now());
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let systemContext = "";

      if (hasWeights) {
        // 模式 1：基于知识点权重
        systemContext = `参考以下考试大纲及知识点权重分布：\n${selectedCert?.description}`;
      } else {
        // 模式 2：基于现有题库采样（单多选 2:1 采样）
        let sample: Question[] = [];
        const pool = activeStats.activeQs;

        if (pool.length <= 20) {
          sample = pool;
        } else {
          const singles = pool.filter(q => q.type === 'single').sort(() => 0.5 - Math.random());
          const multiples = pool.filter(q => q.type === 'multiple').sort(() => 0.5 - Math.random());

          let targetSinglesCount = 13; // 2:1 ratio approx
          let targetMultiplesCount = 7;

          if (singles.length < targetSinglesCount) {
            targetSinglesCount = singles.length;
            targetMultiplesCount = Math.min(20 - targetSinglesCount, multiples.length);
          } else if (multiples.length < targetMultiplesCount) {
            targetMultiplesCount = multiples.length;
            targetSinglesCount = Math.min(20 - targetMultiplesCount, singles.length);
          }

          sample = [
            ...singles.slice(0, targetSinglesCount),
            ...multiples.slice(0, targetMultiplesCount)
          ].sort(() => 0.5 - Math.random());
        }
        
        const questionReferences = sample.map(q => `
          题干: ${q.content}
          题型: ${q.type === 'single' ? '单选' : '多选'}
          选项: ${q.options.map(o => `${o.label}.${o.text}`).join(', ')}
          答案: ${q.answer.join('')}
          知识点: ${q.knowledgePoint}
        `).join('\n---\n');

        systemContext = `参考以下已有的 ${sample.length} 道高仿真考题风格：\n${questionReferences}`;
      }

      const streamResponse = await ai.models.generateContentStream({
        model: 'gemini-3-pro-preview',
        contents: `你是一名${selectedCert?.fullName || '阿里云大模型'}认证专家。
        任务：生成 5 道全新的高仿真模拟考题。
        
        生成要求：
        1. 题型比例：单选题:多选题 必须为 2:1（即生成 3 道单选，2 道多选）。
        2. 难度对标官方认证。
        3. 严禁与参考内容完全重复。
        4. 如果提供了权重分布，请优先确保生成的 5 道题目覆盖权重最高的知识点。
        
        上下文信息：
        ${systemContext}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                content: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["single", "multiple"] },
                options: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING },
                      text: { type: Type.STRING }
                    },
                    required: ["label", "text"]
                  }
                },
                answer: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                knowledgePoint: { type: Type.STRING }
              },
              required: ["content", "type", "options", "answer", "knowledgePoint"]
            }
          }
        }
      });

      let fullText = "";
      for await (const chunk of streamResponse) {
        fullText += chunk.text;
        const parsed = parseIncrementalJson(fullText);
        if (parsed.length > 0) {
          setAiSuggestions(parsed);
          const prog = Math.min(10 + (parsed.length / 5) * 90, 100);
          setGenerationProgress(prog);
        }
      }

      try {
        const finalJson = JSON.parse(fullText);
        setAiSuggestions(finalJson);
        setGenerationProgress(100);
      } catch (e) {}

    } catch (error) {
      console.error("AI Streaming Generation failed:", error);
      alert("大模型流式生成失败，请检查网络后重试。");
    } finally {
      setIsGenerating(false);
      setTimeout(() => setGenerationProgress(0), 1000);
    }
  };

  const handleAddAiQuestion = (q: Partial<Question>) => {
    if (onAddAiQuestion) {
      const id = `q-ai-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const newQuestion: Question = {
        ...q as any,
        id,
        hash: Math.random().toString(36).substring(7),
        images: []
      };
      onAddAiQuestion(newQuestion, lastBatchTime);
      setAddedAiIds(prev => new Set([...prev, q.content!]));
    }
  };

  const handleExportActiveBank = async () => {
    if (activeStats.activeQs.length === 0) {
      alert("当前没有已激活的题目可以导出！");
      return;
    }

    const sections = [];
    
    for (let i = 0; i < activeStats.activeQs.length; i++) {
      const q = activeStats.activeQs[i];
      const children: any[] = [
        new Paragraph({
          children: [new TextRun({ text: `题目 ${i + 1}`, bold: true, size: 28 })],
          spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
          children: [new TextRun({ text: q.content, bold: true })],
          spacing: { after: 200 }
        })
      ];

      if (q.images && q.images.length > 0) {
        for (const imgBase64 of q.images) {
          try {
            const base64Data = imgBase64.split(',')[1] || imgBase64;
            const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            children.push(new Paragraph({
              children: [
                new ImageRun({
                  data: buffer,
                  transformation: { width: 400, height: 200 }
                } as any)
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 }
            }));
          } catch (e) { console.error("Export image error:", e); }
        }
      }

      children.push(new Paragraph({ children: [new TextRun({ text: "选项：", bold: true })] }));
      q.options.forEach(opt => {
        children.push(new Paragraph({
          children: [new TextRun({ text: `${opt.label}. ${opt.text}` })],
          indent: { left: 400 }
        }));
      });

      children.push(new Paragraph({
        children: [
          new TextRun({ text: "正确答案：", bold: true }),
          new TextRun({ text: q.answer.join('') })
        ],
        spacing: { before: 200 }
      }));
      children.push(new Paragraph({
        children: [
          new TextRun({ text: "相关知识点：", bold: true }),
          new TextRun({ text: q.knowledgePoint })
        ],
        spacing: { after: 400 }
      }));

      sections.push({ children });
    }

    const doc = new Document({ sections });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `阿里云ACP题库导出_${new Date().toLocaleDateString()}.docx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const matchesSearch = q.content.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            q.knowledgePoint.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || q.type === filterType;
      const matchesFile = filterFileId === 'all' || q.fileId === filterFileId;
      let matchesSource = true;
      if (filterSourceType === 'manual') matchesSource = q.fileId.startsWith('manual');
      else if (filterSourceType === 'ai') matchesSource = q.fileId.startsWith('ai-file');
      else if (filterSourceType === 'imported') matchesSource = !q.fileId.startsWith('manual') && !q.fileId.startsWith('ai-file');
      return matchesSearch && matchesType && matchesFile && matchesSource;
    }).sort((a, b) => a.type === 'single' ? -1 : 1);
  }, [questions, searchTerm, filterType, filterFileId, filterSourceType]);

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleToggleAll = () => {
    const allActive = files.every(f => f.isActive);
    files.forEach(f => {
      if (allActive) { if (f.isActive && onToggleFile) onToggleFile(f.id); }
      else { if (!f.isActive && onToggleFile) onToggleFile(f.id); }
    });
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterFileId('all');
    setFilterSourceType('all');
  };

  const isUsingWeights = !!selectedCert?.description && selectedCert.description.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5">
        <div className="flex gap-2 p-1.5 bg-slate-100/80 rounded-2xl w-fit shadow-inner">
          <button onClick={() => setViewTab('files')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${viewTab === 'files' ? 'bg-white text-slate-800 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}><Files size={18} /> 题库文件 ({files.length})</button>
          <button onClick={() => setViewTab('questions')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${viewTab === 'questions' ? 'bg-white text-slate-800 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}><LayoutList size={18} /> 全部题目 ({questions.length})</button>
          <button onClick={() => setViewTab('ai')} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${viewTab === 'ai' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-700'}`}><Sparkles size={18} /> AI 智能生成</button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-3">
            <label className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm cursor-pointer hover:bg-slate-800 transition-all shadow-md active:scale-95"><Upload size={18} /> 导入题库<input type="file" className="hidden" accept=".md,.docx" onChange={onImport} /></label>
            <button onClick={() => onAdd?.()} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-md active:scale-95"><Plus size={18} /> 录入单题</button>
            <button onClick={handleExportActiveBank} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-md active:scale-95"><Download size={18} /> 导出已激活</button>
            <button onClick={onClear} className="flex items-center gap-2 px-6 py-3 bg-white text-red-500 border border-red-100 rounded-xl font-bold text-sm hover:bg-red-50 transition-all shadow-sm active:scale-95"><Trash2 size={18} /> 清空</button>
          </div>
          <div className="flex items-center gap-4 bg-blue-50/50 border border-blue-100 px-6 py-3 rounded-2xl">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">已激活题库统计</span>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2"><span className="text-slate-400 text-[10px] font-bold">总数:</span><span className="text-blue-600 font-black text-lg">{activeStats.total}</span></div>
                <div className="flex items-center gap-2"><span className="text-slate-400 text-[10px] font-bold">单选:</span><span className="text-slate-700 font-black text-lg">{activeStats.single}</span></div>
                <div className="flex items-center gap-2"><span className="text-slate-400 text-[10px] font-bold">多选:</span><span className="text-slate-700 font-black text-lg">{activeStats.multiple}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/50 min-h-[600px] relative">
        {viewTab === 'ai' ? (
          <div className="p-10 md:p-16 space-y-16 max-w-5xl mx-auto">
            <div className="text-center space-y-5">
              <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner ring-1 ring-blue-100"><BrainCircuit size={48} strokeWidth={1.5} /></div>
              <h3 className="text-3xl font-black text-slate-800 tracking-tight">大模型智能出题</h3>
              <p className="text-slate-500 font-medium text-lg">
                {isUsingWeights ? (
                  <>基于证书设置中的 <span className="text-blue-600 font-black">知识点权重描述</span> 进行专业命题。</>
                ) : activeStats.total <= 20 ? (
                  <>基于当前全部 <span className="text-blue-600 font-black">{activeStats.total}</span> 道题目进行采样命题。</>
                ) : (
                  <>基于随机抽取的 <span className="text-blue-600 font-black">20</span> 道题目（单多选 2:1 比例）进行采样命题。</>
                )}
              </p>
              {isUsingWeights && (
                <div className="bg-slate-50 p-4 rounded-2xl max-w-md mx-auto border border-slate-100 text-left">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">当前权重参考：</span>
                   <p className="text-xs text-slate-500 whitespace-pre-wrap leading-relaxed italic">{selectedCert?.description}</p>
                </div>
              )}
            </div>
            
            <div className="max-w-xl mx-auto space-y-8">
              <div className="flex justify-center">
                <button onClick={handleGenerateAI} disabled={isGenerating} className={`flex items-center gap-4 px-14 py-6 rounded-[2rem] font-black text-xl transition-all shadow-xl active:scale-95 disabled:opacity-50 ${isGenerating ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'}`}>
                  {isGenerating ? <Loader2 className="animate-spin" size={28} /> : <Sparkles size={28} />}
                  {isGenerating ? '正在实时生成题目...' : '立即生成'}
                </button>
              </div>

              {isGenerating && (
                <div className="space-y-4 animate-in fade-in duration-500">
                  <div className="flex justify-between items-end mb-1">
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                      AI 深度生成进度
                    </span>
                    <span className="text-sm font-black text-slate-700">
                      {Math.round(generationProgress)}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 p-0.5">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 rounded-full transition-all duration-500 ease-out relative"
                      style={{ width: `${generationProgress}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-4 py-1.5 rounded-full">
                      已实时解析出 {aiSuggestions.length} / 5 道题目（目标 3 单 2 多）
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-10 pt-12 border-t border-slate-50">
              {aiSuggestions.map((q, idx) => {
                const isAdded = addedAiIds.has(q.content!);
                return (
                  <div key={idx} className="bg-slate-50/50 rounded-[2.5rem] p-10 border border-slate-100 transition-all hover:bg-white hover:shadow-xl hover:border-blue-100 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-start gap-8 mb-8">
                      <div className="flex items-start gap-5">
                        <span className={`mt-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shrink-0 ${q.type === 'single' ? 'bg-blue-500' : 'bg-purple-600'}`}>{q.type === 'single' ? '单选' : '多选'}</span>
                        <h4 className="font-bold text-slate-800 text-2xl leading-relaxed">{q.content}</h4>
                      </div>
                      <button disabled={isAdded} onClick={() => handleAddAiQuestion(q)} className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center border transition-all active:scale-90 ${isAdded ? 'bg-green-500 text-white border-green-500' : 'bg-white text-blue-600 border-slate-200 hover:bg-blue-600 hover:text-white hover:shadow-md'}`}>{isAdded ? <Check size={24} strokeWidth={3} /> : <Plus size={24} strokeWidth={2.5} />}</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-16">
                      {q.options?.map((opt, oIdx) => (
                        <div key={oIdx} className={`text-base p-5 rounded-2xl border flex items-center gap-5 transition-all ${q.answer?.includes(opt.label) ? 'bg-green-50/50 border-green-200 text-green-700 font-bold' : 'bg-white border-slate-100 text-slate-600'}`}><span className={`w-10 h-10 rounded-xl flex items-center justify-center border text-[11px] font-black ${q.answer?.includes(opt.label) ? 'bg-white border-green-300' : 'bg-slate-50 border-slate-200'}`}>{opt.label}</span><span>{opt.text}</span></div>
                      ))}
                    </div>
                    <div className="mt-8 ml-16 flex items-center gap-4"><span className="text-[10px] font-black text-slate-400 bg-slate-100 px-4 py-1.5 rounded-full uppercase tracking-widest">考点: {q.knowledgePoint}</span></div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : viewTab === 'files' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[11px] font-black uppercase tracking-widest border-b border-slate-100">
                  <th className="px-10 py-6 text-center w-28"><button onClick={handleToggleAll} className="flex items-center justify-center mx-auto hover:text-blue-600 transition-colors" title="全选/全取消激活">{files.every(f => f.isActive) ? <CheckSquare size={20} /> : <Square size={20} />}</button></th>
                  <th className="px-10 py-6">文件名</th>
                  <th className="px-10 py-6 w-48">上传日期</th>
                  <th className="px-10 py-6 text-center w-44">题目量</th>
                  <th className="px-10 py-6 text-right w-28">管理</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFiles.map((f) => (
                  <tr key={f.id} className={`hover:bg-slate-50/50 transition-all ${!f.isActive ? 'bg-slate-50/40 grayscale opacity-50' : ''}`}>
                    <td className="px-10 py-6 text-center"><button onClick={() => onToggleFile?.(f.id)} className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center transition-all shadow-sm ${f.isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400 hover:bg-slate-300'}`}><Power size={22} /></button></td>
                    <td className="px-10 py-6"><div className="flex items-center gap-4"><Database size={20} className="text-blue-500 shrink-0" /><span className="font-black text-slate-700 text-xl">{f.name}</span>{f.id.startsWith('ai-file') && <Sparkles size={16} className="text-blue-500 animate-pulse" />}</div></td>
                    <td className="px-10 py-6 text-slate-400 text-base font-bold">{new Date(f.uploadDate).toLocaleDateString()}</td>
                    <td className="px-10 py-6 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-slate-700 text-lg font-black">{f.questionCount}</span>
                        {!!f.skippedCount && f.skippedCount > 0 && (
                          <span className="text-[10px] text-orange-500 font-black mt-1 uppercase tracking-tighter" title={`检测到 ${f.skippedCount} 道重复题目并已自动过滤`}>
                            (跳过 {f.skippedCount} 题重复)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-10 py-6 text-right"><button onClick={() => onDeleteFile?.(f.id)} className="p-3.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"><Trash2 size={22} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="p-6 bg-slate-50/50 border-b border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4 items-end animate-in fade-in duration-300">
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Search size={12}/> 题干内容筛选</label><div className="relative"><input type="text" placeholder="关键字模糊搜索..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} /></div></div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Database size={12}/> 按题库文件</label><select className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none cursor-pointer focus:ring-2 focus:ring-blue-500" value={filterFileId} onChange={(e) => setFilterFileId(e.target.value)}><option value="all">全部题库</option>{files.map(f => (<option key={f.id} value={f.id}>{f.name} ({f.questionCount})</option>))}</select></div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Tags size={12}/> 按来源类型</label><select className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none cursor-pointer focus:ring-2 focus:ring-blue-500" value={filterSourceType} onChange={(e) => setFilterSourceType(e.target.value as any)}><option value="all">全部来源</option><option value="imported">导入文件</option><option value="manual">手动录入</option><option value="ai">AI 智能生成</option></select></div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Filter size={12}/> 按题目类型</label><div className="flex gap-2"><select className="flex-grow px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none cursor-pointer focus:ring-2 focus:ring-blue-500" value={filterType} onChange={(e) => setFilterType(e.target.value as any)}><option value="all">全部类型</option><option value="single">单选题</option><option value="multiple">多选题</option></select><button onClick={resetFilters} className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl border border-slate-200 transition-all" title="重置筛选"><FilterX size={20} /></button></div></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 text-[11px] font-black uppercase tracking-widest border-b border-slate-100">
                    <th className="px-10 py-6 w-32">类型</th>
                    <th className="px-10 py-6">题干摘要</th>
                    <th className="px-10 py-6 w-56">知识点</th>
                    <th className="px-10 py-6 text-right w-36">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredQuestions.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-10 py-6"><span className={`px-3 py-1.5 rounded-xl text-[10px] font-black text-white uppercase tracking-widest ${q.type === 'single' ? 'bg-blue-500' : 'bg-purple-600'}`}>{q.type === 'single' ? '单选' : '多选'}</span></td>
                      <td className="px-10 py-6"><p className="text-slate-700 font-bold text-lg line-clamp-1">{q.content}</p></td>
                      <td className="px-10 py-6"><span className="text-[10px] font-black text-slate-400 bg-slate-100 px-4 py-1.5 rounded-full uppercase truncate block max-w-[200px]">{q.knowledgePoint}</span></td>
                      <td className="px-10 py-6 text-right"><div className="flex justify-end gap-2"><button onClick={() => onEdit?.(q)} className="p-3 text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"><Edit3 size={20}/></button><button onClick={() => onDelete?.(q.id)} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"><Trash2 size={20}/></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {((viewTab === 'files' && filteredFiles.length === 0) || (viewTab === 'questions' && filteredQuestions.length === 0)) && (<div className="p-40 flex flex-col items-center justify-center text-slate-200"><Database size={100} strokeWidth={1} className="mb-6" /><p className="font-black text-3xl text-slate-300 uppercase tracking-widest">Empty Storage</p>{(searchTerm || filterFileId !== 'all' || filterType !== 'all' || filterSourceType !== 'all') && (<button onClick={resetFilters} className="mt-6 text-blue-500 font-bold hover:underline">清除所有筛选条件</button>)}</div>)}
      </div>
    </div>
  );
};
