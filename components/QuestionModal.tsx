
import React, { useState, useEffect, useCallback } from 'react';
import { Question, QuestionType, QuestionOption } from '../types';
import { X, Plus, Trash2, Image as ImageIcon, Check, MousePointerSquareDashed } from 'lucide-react';

interface QuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (question: Question) => void;
  editingQuestion?: Question | null;
  certId: string; // Added to fulfill certId requirement in Question interface
}

export const QuestionModal: React.FC<QuestionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingQuestion,
  certId
}) => {
  const [content, setContent] = useState('');
  const [type, setType] = useState<QuestionType>('single');
  const [knowledgePoint, setKnowledgePoint] = useState('');
  const [options, setOptions] = useState<QuestionOption[]>([
    { label: 'A', text: '' },
    { label: 'B', text: '' },
    { label: 'C', text: '' },
    { label: 'D', text: '' }
  ]);
  const [answer, setAnswer] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);

  const resetForm = useCallback(() => {
    setContent('');
    setType('single');
    setKnowledgePoint('');
    setOptions([
      { label: 'A', text: '' },
      { label: 'B', text: '' },
      { label: 'C', text: '' },
      { label: 'D', text: '' }
    ]);
    setAnswer([]);
    setImages([]);
  }, []);

  useEffect(() => {
    if (editingQuestion) {
      setContent(editingQuestion.content);
      setType(editingQuestion.type);
      setKnowledgePoint(editingQuestion.knowledgePoint);
      setOptions(editingQuestion.options);
      setAnswer(editingQuestion.answer);
      setImages(editingQuestion.images || []);
    } else {
      resetForm();
    }
  }, [editingQuestion, isOpen, resetForm]);

  // Handle Clipboard Paste for Images
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              const base64 = ev.target?.result as string;
              setImages(prev => [...prev, base64]);
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        setImages(prev => [...prev, base64]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const toggleAnswer = (label: string) => {
    if (type === 'single') {
      setAnswer([label]);
    } else {
      setAnswer(prev => 
        prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label].sort()
      );
    }
  };

  const handleSave = () => {
    if (!content || options.some(o => !o.text) || answer.length === 0) {
      alert('请完整填写题干、选项和正确答案');
      return;
    }

    /**
     * Fix: Added certId to satisfy the Question interface. 
     * Uses passed certId for new questions or maintains existing certId for edits.
     */
    const newQuestion: Question = {
      id: editingQuestion?.id || `q-manual-${Date.now()}`,
      certId: editingQuestion?.certId || certId,
      fileId: editingQuestion?.fileId || '',
      content,
      type,
      knowledgePoint: knowledgePoint || '未分类',
      options,
      answer,
      images,
      hash: editingQuestion?.hash || Math.random().toString(36).substring(7)
    };

    onSave(newQuestion);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-800">
            {editingQuestion ? '编辑题目' : '新增题目'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Question Type */}
          <div className="flex gap-4">
            {(['single', 'multiple'] as QuestionType[]).map(t => (
              <button
                key={t}
                onClick={() => { setType(t); setAnswer([]); }}
                className={`px-6 py-2 rounded-xl border-2 transition-all font-bold ${
                  type === t ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400 hover:border-slate-200'
                }`}
              >
                {t === 'single' ? '单选题' : '多选题'}
              </button>
            ))}
          </div>

          {/* Question Body */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">题干内容</label>
            <textarea
              className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-32 resize-none"
              placeholder="请输入题目描述..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          {/* Image Upload Area */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">配图 (可选)</label>
              <span className="text-[10px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1">
                <MousePointerSquareDashed size={10} /> 支持直接粘贴截图 (Ctrl+V)
              </span>
            </div>
            <div className="flex flex-wrap gap-4">
              {images.map((img, idx) => (
                <div key={idx} className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200 group">
                  <img src={img} className="w-full h-full object-cover" />
                  <button 
                    onClick={() => removeImage(idx)}
                    className="absolute inset-0 bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
              <label className="w-24 h-24 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-400 cursor-pointer transition-all">
                <ImageIcon size={24} />
                <span className="text-xs mt-1">添加图片</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">选项与答案</label>
              <button 
                onClick={() => setOptions([...options, { label: String.fromCharCode(65 + options.length), text: '' }])}
                className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline"
              >
                <Plus size={16} /> 添加选项
              </button>
            </div>
            {options.map((opt, idx) => (
              <div key={idx} className="flex gap-3">
                <button
                  onClick={() => toggleAnswer(opt.label)}
                  className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center font-bold border-2 transition-all ${
                    answer.includes(opt.label) ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-100' : 'border-slate-100 text-slate-400 hover:border-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
                <input
                  className="flex-grow p-2 border-b border-slate-100 focus:border-blue-500 outline-none"
                  placeholder={`选项 ${opt.label} 的描述...`}
                  value={opt.text}
                  onChange={(e) => {
                    const newOpts = [...options];
                    newOpts[idx].text = e.target.value;
                    setOptions(newOpts);
                  }}
                />
                {options.length > 2 && (
                  <button 
                    onClick={() => setOptions(options.filter((_, i) => i !== idx))}
                    className="text-slate-300 hover:text-red-500"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Knowledge Point */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">相关知识点</label>
            <input
              className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="例如：RAG, Fine-tuning..."
              value={knowledgePoint}
              onChange={(e) => setKnowledgePoint(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 flex gap-4">
          <button onClick={onClose} className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all">取消</button>
          <button 
            onClick={handleSave}
            className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
          >
            <Check size={20} /> 保存题目
          </button>
        </div>
      </div>
    </div>
  );
};