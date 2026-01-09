
import React, { useState, useEffect, useCallback } from 'react';
import { Question, UserStats, PracticeSession, QuestionFile, Certificate, ExamConfig } from './types';
import { parseMarkdownQuestions, parseDocxHtmlQuestions } from './utils/parser';
import { Dashboard } from './components/Dashboard';
import { QuestionCard } from './components/QuestionCard';
import { QuestionBank } from './components/QuestionBank';
import { QuestionModal } from './components/QuestionModal';
import { CertificateManager } from './components/CertificateManager';
import * as mammoth from 'mammoth';
import { 
  LayoutDashboard, BookOpen, FileText, Settings, 
  Upload, ChevronLeft, ChevronRight, Timer, 
  CheckCircle, Play, RefreshCw, Star, Award, AlertCircle, Database,
  BrainCircuit, MousePointer2, Menu, X, ArrowLeft, ShieldCheck,
  History, Flame, Target, Clock, Trash2, RotateCcw,
  Sliders, Info, Zap, PlayCircle
} from 'lucide-react';

const INITIAL_STATS: UserStats = {
  totalAnswered: 0,
  correctCount: 0,
  knowledgeStats: {},
  history: []
};

const DEFAULT_EXAM_CONFIG: Omit<ExamConfig, 'certId'> = {
  totalScore: 100,
  duration: 120,
  passingScore: 80,
  singleCount: 50,
  singlePoints: 1,
  multipleCount: 25,
  multiplePoints: 2
};

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'practice' | 'exam' | 'bank' | 'bookmarks' | 'certs'>('certs');
  
  // Certificate Scoping State
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);

  // Persistence
  const [certificates, setCertificates] = useState<Certificate[]>(() => {
    const saved = localStorage.getItem('acp_certs');
    return saved ? JSON.parse(saved) : [];
  });

  const [questions, setQuestions] = useState<Question[]>(() => {
    const saved = localStorage.getItem('acp_questions');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [questionFiles, setQuestionFiles] = useState<QuestionFile[]>(() => {
    const saved = localStorage.getItem('acp_files');
    return saved ? JSON.parse(saved) : [];
  });

  const [examConfigs, setExamConfigs] = useState<Record<string, ExamConfig>>(() => {
    const saved = localStorage.getItem('acp_exam_configs');
    return saved ? JSON.parse(saved) : {};
  });

  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('acp_stats');
    return saved ? JSON.parse(saved) : INITIAL_STATS;
  });

  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    const saved = localStorage.getItem('acp_bookmarks');
    return saved ? JSON.parse(saved) : [];
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Session State
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string[]>>({});
  const [showResults, setShowResults] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [sessionMode, setSessionMode] = useState<'practice' | 'exam'>('practice');
  const [practiceSubMode, setPracticeSubMode] = useState<'answer' | 'recitation'>('answer');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Persistence Effects
  useEffect(() => { localStorage.setItem('acp_certs', JSON.stringify(certificates)); }, [certificates]);
  useEffect(() => { localStorage.setItem('acp_questions', JSON.stringify(questions)); }, [questions]);
  useEffect(() => { localStorage.setItem('acp_files', JSON.stringify(questionFiles)); }, [questionFiles]);
  useEffect(() => { localStorage.setItem('acp_stats', JSON.stringify(stats)); }, [stats]);
  useEffect(() => { localStorage.setItem('acp_bookmarks', JSON.stringify(bookmarks)); }, [bookmarks]);
  useEffect(() => { localStorage.setItem('acp_exam_configs', JSON.stringify(examConfigs)); }, [examConfigs]);

  const currentCertId = selectedCert?.id || 'undefined';

  // Scoped Data
  const scopedQuestions = questions.filter(q => q.certId === currentCertId);
  const scopedFiles = questionFiles.filter(f => f.certId === currentCertId);
  const scopedHistory = stats.history.filter(h => h.certId === currentCertId);
  const currentExamConfig = examConfigs[currentCertId] || { ...DEFAULT_EXAM_CONFIG, certId: currentCertId };
  
  // Collect all unique wrong question IDs for this certificate
  const wrongQuestionIds = Array.from(new Set(scopedHistory.flatMap(h => h.wrongQuestionIds)));
  const wrongQuestions = scopedQuestions.filter(q => wrongQuestionIds.includes(q.id));

  // Timer for exams
  useEffect(() => {
    let interval: any;
    if (isSessionActive && sessionMode === 'exam' && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleCompleteSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSessionActive, sessionMode, timeRemaining]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileId = `file-${Date.now()}`;
    const fileType = file.name.split('.').pop()?.toLowerCase();
    let parsed: Question[] = [];
    if (fileType === 'md') {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        parsed = parseMarkdownQuestions(text, fileId, currentCertId);
        finalizeImport(file.name, fileId, parsed);
        e.target.value = '';
      };
      reader.readAsText(file);
    } else if (fileType === 'docx') {
      const arrayBuffer = await file.arrayBuffer();
      try {
        const result = await mammoth.convertToHtml({ arrayBuffer });
        parsed = parseDocxHtmlQuestions(result.value, fileId, currentCertId);
        finalizeImport(file.name, fileId, parsed);
        e.target.value = '';
      } catch (err) { alert("DOCX 转换失败"); }
    }
  };

  const finalizeImport = (fileName: string, fileId: string, parsed: Question[]) => {
    if (parsed.length === 0) {
      alert("解析失败：文件中未发现符合格式的题目。");
      return;
    }

    const existingHashes = new Set(questions.map(q => q.hash));
    const uniqueNew = parsed.filter(q => !existingHashes.has(q.hash));
    const skippedCount = parsed.length - uniqueNew.length;

    if (uniqueNew.length === 0) {
      alert(`导入提示：文件 "${fileName}" 中的所有题目 (${skippedCount} 题) 已存在于题库中，已跳过重复导入。`);
    } else if (skippedCount > 0) {
      alert(`导入成功：新增 ${uniqueNew.length} 题，跳过 ${skippedCount} 道重复题目。`);
    } else {
      alert(`导入成功：已成功导入 ${uniqueNew.length} 道题目。`);
    }

    if (uniqueNew.length > 0) {
      setQuestions(prev => [...prev, ...uniqueNew]);
    }

    const newFile: QuestionFile = {
      id: fileId,
      certId: currentCertId,
      name: fileName,
      uploadDate: Date.now(),
      questionCount: uniqueNew.length,
      skippedCount: skippedCount,
      isActive: true
    };
    setQuestionFiles(files => [...files, newFile]);
  };

  const handleSaveQuestion = (q: Question) => {
    if (!q) { setEditingQuestion(null); setIsModalOpen(true); return; }
    setQuestions(prev => {
      const index = prev.findIndex(item => item.id === q.id);
      if (index > -1) {
        const updated = [...prev];
        updated[index] = { ...q, certId: prev[index].certId };
        return updated;
      } else {
        const fileId = `manual-${Date.now()}`;
        const newQuestion = { ...q, certId: currentCertId, fileId };
        if (!questionFiles.find(f => f.id === fileId)) {
           setQuestionFiles(f => [...f, { id: fileId, certId: currentCertId, name: '手动录入', uploadDate: Date.now(), questionCount: 1, isActive: true }]);
        } else {
          setQuestionFiles(f => f.map(file => file.id === fileId ? { ...file, questionCount: file.questionCount + 1 } : file));
        }
        return [...prev, newQuestion];
      }
    });
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions(prev => {
      const q = prev.find(item => item.id === id);
      if (q && q.fileId) {
        setQuestionFiles(files => files.map(f => 
          f.id === q.fileId ? { ...f, questionCount: Math.max(0, f.questionCount - 1) } : f
        ));
      }
      return prev.filter(item => item.id !== id);
    });
  };

  const handleAddAiQuestion = (q: Question, batchTime: number) => {
    const formattedTime = new Date(batchTime).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).replace(/\//g, '-');
    
    const fileId = `ai-file-${batchTime}`;
    const fileName = `AI智能生成_${formattedTime}`;

    setQuestions(prev => {
      if (prev.find(item => item.id === q.id)) return prev;

      setQuestionFiles(files => {
        const existing = files.find(f => f.id === fileId);
        if (existing) {
          return files.map(f => f.id === fileId ? { ...f, questionCount: f.questionCount + 1 } : f);
        } else {
          return [...files, {
            id: fileId,
            certId: currentCertId,
            name: fileName,
            uploadDate: batchTime,
            questionCount: 1,
            isActive: true
          }];
        }
      });

      return [...prev, { ...q, certId: currentCertId, fileId }];
    });
  };

  const updateExamConfig = (config: ExamConfig) => {
    setExamConfigs(prev => ({ ...prev, [currentCertId]: config }));
  };

  const startSession = (mode: 'practice' | 'exam', filter?: (q: Question) => boolean) => {
    const activeFileIds = new Set(scopedFiles.filter(f => f.isActive).map(f => f.id));
    let basePool = scopedQuestions.filter(q => activeFileIds.has(q.fileId));
    if (filter) basePool = basePool.filter(filter);
    if (basePool.length === 0) { alert("当前题库无题目！"); return; }
    
    let selected: Question[] = [];
    if (mode === 'exam') {
      const config = currentExamConfig;
      const singles = basePool.filter(q => q.type === 'single').sort(() => 0.5 - Math.random());
      const multiples = basePool.filter(q => q.type === 'multiple').sort(() => 0.5 - Math.random());
      
      const targetSingle = Math.min(singles.length, config.singleCount);
      const targetMultiple = Math.min(multiples.length, config.multipleCount);
      
      selected = [...singles.slice(0, targetSingle), ...multiples.slice(0, targetMultiple)].sort(() => 0.5 - Math.random());
      setTimeRemaining(config.duration * 60);
    } else {
       selected = basePool.sort(() => 0.5 - Math.random());
    }
    
    setSessionQuestions(selected);
    setCurrentIndex(0);
    setUserAnswers({});
    setShowResults(false);
    setIsSessionActive(true);
    setSessionMode(mode);
    setPracticeSubMode('answer');
    setActiveSessionId(`session-${Date.now()}`);
  };

  const resumeSession = (session: PracticeSession) => {
    const restoredQuestions = session.sessionQuestionIds.map(id => questions.find(q => q.id === id)).filter(Boolean) as Question[];
    if (restoredQuestions.length === 0) {
      alert("题目数据已丢失，无法继续。");
      return;
    }
    setSessionQuestions(restoredQuestions);
    setCurrentIndex(session.currentIndex);
    setUserAnswers(session.savedAnswers || {});
    setSessionMode(session.type);
    setIsSessionActive(true);
    setShowResults(false);
    setActiveSessionId(session.id);
    if (session.type === 'practice') {
      setPracticeSubMode('answer');
    }
  };

  const startWrongQuestionRedo = () => {
    if (wrongQuestions.length === 0) {
      alert("太棒了！当前没有任何错题。");
      return;
    }
    setSessionQuestions(wrongQuestions.sort(() => 0.5 - Math.random()));
    setCurrentIndex(0);
    setUserAnswers({});
    setShowResults(false);
    setIsSessionActive(true);
    setSessionMode('practice');
    setPracticeSubMode('answer');
    setActiveSessionId(`redo-${Date.now()}`);
  };

  const handleCompleteSession = () => {
    if (practiceSubMode === 'recitation') { setIsSessionActive(false); return; }
    
    let correctCount = 0;
    let examScore = 0;
    const wrongIds: string[] = [];
    const newKnowledgeStats = { ...stats.knowledgeStats };
    const config = currentExamConfig;

    const answeredCount = Object.keys(userAnswers).length;
    const isCompleted = answeredCount === sessionQuestions.length;

    sessionQuestions.forEach(q => {
      const uAns = userAnswers[q.id] || [];
      const isCorrect = uAns.length > 0 && uAns.sort().join('') === q.answer.sort().join('');
      if (isCorrect) {
        correctCount++;
        if (sessionMode === 'exam') {
          examScore += (q.type === 'single' ? config.singlePoints : config.multiplePoints);
        }
      } else if (uAns.length > 0) {
        wrongIds.push(q.id);
      }
      
      if (uAns.length > 0) {
        if (!newKnowledgeStats[q.knowledgePoint]) newKnowledgeStats[q.knowledgePoint] = { total: 0, correct: 0 };
        newKnowledgeStats[q.knowledgePoint].total += 1;
        if (isCorrect) newKnowledgeStats[q.knowledgePoint].correct += 1;
      }
    });

    const finalScore = sessionMode === 'exam' ? examScore : Math.round((correctCount / (answeredCount || 1)) * 100);
    
    const newSession: PracticeSession = {
      id: activeSessionId || `session-${Date.now()}`,
      certId: currentCertId,
      date: Date.now(),
      type: sessionMode,
      score: finalScore,
      totalQuestions: sessionQuestions.length,
      duration: sessionMode === 'exam' ? (config.duration * 60 - timeRemaining) : 0,
      wrongQuestionIds: wrongIds,
      currentIndex: currentIndex,
      sessionQuestionIds: sessionQuestions.map(q => q.id),
      savedAnswers: userAnswers,
      isCompleted: sessionMode === 'exam' ? true : isCompleted
    };

    setStats(prev => {
      const existingIdx = prev.history.findIndex(h => h.id === newSession.id);
      let newHistory = [...prev.history];
      if (existingIdx > -1) {
        newHistory[existingIdx] = newSession;
      } else {
        newHistory.push(newSession);
      }
      return {
        ...prev,
        totalAnswered: prev.totalAnswered + answeredCount,
        correctCount: prev.correctCount + correctCount,
        knowledgeStats: newKnowledgeStats,
        history: newHistory
      };
    });

    if (sessionMode === 'exam') {
      const isPass = examScore >= config.passingScore;
      alert(`考试结束！${isPass ? '恭喜及格！' : '很遗憾未及格。'}\n最终得分：${examScore} / ${config.totalScore}`);
    } else {
      if (!isCompleted) {
        alert("练习进度已保存，可在历史记录中继续答题。");
      } else {
        alert(`练习结束！本次练习正确率：${finalScore}%`);
      }
    }

    setIsSessionActive(false);
    setShowResults(false);
    setActiveSessionId(null);
  };

  const toggleBookmark = (id: string) => {
    setBookmarks(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const activeQuestionCount = scopedQuestions.filter(q => 
    scopedFiles.find(f => f.id === q.fileId)?.isActive
  ).length;

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}分${s}秒`;
  };

  const renderHistoryTable = () => (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
      <div className="p-8 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <History className="text-blue-500" size={24} />
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest">练习历史记录</h3>
        </div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">仅展示当前证书记录</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <tr>
              <th className="px-8 py-5">日期</th>
              <th className="px-8 py-5">类型</th>
              <th className="px-8 py-5">进度/成绩</th>
              <th className="px-8 py-5">耗时</th>
              <th className="px-8 py-5 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {scopedHistory.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-8 py-20 text-center text-slate-300 font-bold italic">暂无历史记录</td>
              </tr>
            ) : (
              scopedHistory.sort((a, b) => b.date - a.date).map((h) => {
                const answeredCount = Object.keys(h.savedAnswers || {}).length;
                const progress = Math.round((answeredCount / h.totalQuestions) * 100);
                
                return (
                  <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-5 text-sm font-bold text-slate-600">{new Date(h.date).toLocaleString()}</td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${h.type === 'exam' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                        {h.type === 'exam' ? '模拟考试' : '自由练习'}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-black ${h.type === 'exam' ? (h.score >= (examConfigs[h.certId]?.passingScore || 80) ? 'text-green-600' : 'text-red-500') : 'text-slate-800'}`}>
                            {h.score}{h.type === 'exam' ? '分' : '%'}
                          </span>
                          {h.type === 'practice' && !h.isCompleted && (
                             <span className="text-[10px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-md font-black uppercase tracking-tighter">未完成</span>
                          )}
                        </div>
                        {h.type === 'practice' && (
                          <div className="flex items-center gap-2 w-32">
                             <div className="flex-grow h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: `${progress}%` }}></div>
                             </div>
                             <span className="text-[9px] font-black text-slate-400">{progress}%</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm text-slate-500 font-medium">{h.duration > 0 ? formatDuration(h.duration) : '--'}</td>
                    <td className="px-8 py-5 text-right">
                       {h.type === 'practice' && !h.isCompleted && (
                         <button 
                           onClick={() => resumeSession(h)}
                           className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md active:scale-95"
                         >
                            <PlayCircle size={14} /> 继续答题
                         </button>
                       )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderWrongQuestionCard = () => (
    <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden">
      <div className="bg-red-50 text-red-600 w-20 h-20 rounded-3xl flex items-center justify-center mb-8"><RotateCcw size={40} /></div>
      <h3 className="text-2xl font-black text-slate-800 mb-3 uppercase tracking-tight">错题本</h3>
      <p className="text-slate-500 mb-10 text-sm font-medium">自动捕获做错的题目。提供“重做”功能，直到完全掌握。当前错题：{wrongQuestions.length} 题。</p>
      <button 
        onClick={startWrongQuestionRedo}
        disabled={wrongQuestions.length === 0}
        className="w-full border-2 border-red-100 text-red-600 font-black py-5 rounded-3xl hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        错题重做 <ChevronRight size={20} />
      </button>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden selection:bg-blue-100 relative">
      {isSidebarOpen && <div className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60]" onClick={() => setIsSidebarOpen(false)} />}
      <aside className={`fixed md:relative inset-y-0 left-0 w-64 bg-slate-900 text-white flex flex-col p-4 z-[70] transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex items-center justify-between gap-3 px-2 py-6 mb-8 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2.5 rounded-2xl shadow-lg shadow-orange-500/20"><ShieldCheck className="text-white" size={24} /></div>
            <div>
              <h1 className="font-black text-lg leading-tight tracking-tight uppercase">Cert Master</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Multi-Cert Practice</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 hover:bg-slate-800 rounded-lg"><X size={20} /></button>
        </div>
        <nav className="flex-grow space-y-1">
          {[
            { id: 'certs', label: '证书与题库管理', icon: Award },
            { id: 'dashboard', label: '学习数据', icon: LayoutDashboard, disabled: !selectedCert },
            { id: 'practice', label: '自由练习', icon: BookOpen, disabled: !selectedCert },
            { id: 'exam', label: '模拟考试', icon: FileText, disabled: !selectedCert },
            { id: 'bank', label: '题库管理', icon: Database, disabled: !selectedCert },
            { id: 'bookmarks', label: '我的收藏', icon: Star, disabled: !selectedCert },
          ].map(item => (
            <button
              key={item.id}
              disabled={item.disabled}
              onClick={() => { setActiveTab(item.id as any); setIsSessionActive(false); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all relative group ${
                item.disabled ? 'opacity-30 cursor-not-allowed' :
                activeTab === item.id ? 'bg-orange-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <item.icon size={20} />
              <span className="font-bold text-sm tracking-wide">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-grow overflow-y-auto relative w-full h-full">
        {!isSessionActive && (
          <header className="flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-50">
             <div className="flex items-center gap-4">
               <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 hover:bg-slate-100 rounded-lg"><Menu size={24} /></button>
               {selectedCert && (
                 <button onClick={() => { setSelectedCert(null); setActiveTab('certs'); }} className="flex items-center gap-2 text-slate-500 hover:text-orange-600 font-bold text-sm transition-colors">
                    <ArrowLeft size={18} /> 返回证书列表
                 </button>
               )}
             </div>
             {selectedCert && <div className="bg-orange-50 text-orange-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-orange-100">{selectedCert.name} - {selectedCert.domain}</div>}
             <div className="w-10"></div>
          </header>
        )}

        <div className="p-4 md:p-8">
          {!isSessionActive ? (
            <div className="max-w-6xl mx-auto space-y-12">
              {activeTab === 'certs' && (
                <CertificateManager 
                  certificates={certificates}
                  setCertificates={setCertificates}
                  onSelect={(c) => { setSelectedCert(c); setActiveTab('bank'); }}
                  questionStats={certificates.reduce((acc, c) => ({...acc, [c.id]: questions.filter(q => q.certId === c.id).length }), {})}
                />
              )}
              {activeTab === 'dashboard' && <Dashboard stats={stats} />}
              {activeTab === 'bank' && (
                <QuestionBank 
                  questions={scopedQuestions} 
                  files={scopedFiles}
                  selectedCert={selectedCert}
                  onDelete={handleDeleteQuestion}
                  onDeleteFile={(fid) => { setQuestionFiles(f => f.filter(x => x.id !== fid)); setQuestions(q => q.filter(x => x.fileId !== fid)); }}
                  onToggleFile={(fid) => setQuestionFiles(f => f.map(x => x.id === fid ? {...x, isActive: !x.isActive} : x))}
                  onClear={() => { setQuestions(q => q.filter(x => x.certId !== currentCertId)); setQuestionFiles(f => f.filter(x => x.certId !== currentCertId)); }}
                  onEdit={(q) => { setEditingQuestion(q); setIsModalOpen(true); }}
                  onAdd={() => { setEditingQuestion(null); setIsModalOpen(true); }}
                  onAddAiQuestion={handleAddAiQuestion}
                  onImport={handleFileUpload}
                />
              )}
              
              {activeTab === 'exam' && (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="xl:col-span-2 space-y-8">
                      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                          <Sliders className="text-blue-600" size={24} />
                          <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">模拟考试规则管理</h3>
                        </div>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                          <div className="space-y-4">
                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <Zap size={14} className="text-orange-500" /> 试卷总分
                            </label>
                            <div className="flex items-center gap-3">
                              <input 
                                type="number" 
                                value={currentExamConfig.totalScore} 
                                onChange={(e) => updateExamConfig({...currentExamConfig, totalScore: Number(e.target.value)})}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xl text-slate-800 outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                              />
                              <span className="font-bold text-slate-400 shrink-0">分</span>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <Clock size={14} className="text-blue-500" /> 考试时长
                            </label>
                            <div className="flex items-center gap-3">
                              <input 
                                type="number" 
                                value={currentExamConfig.duration} 
                                onChange={(e) => updateExamConfig({...currentExamConfig, duration: Number(e.target.value)})}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xl text-slate-800 outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                              />
                              <span className="font-bold text-slate-400 shrink-0">分钟</span>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <Target size={14} className="text-green-500" /> 及格分数线
                            </label>
                            <div className="flex items-center gap-3">
                              <input 
                                type="number" 
                                value={currentExamConfig.passingScore} 
                                onChange={(e) => updateExamConfig({...currentExamConfig, passingScore: Number(e.target.value)})}
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xl text-slate-800 outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                              />
                              <span className="font-bold text-slate-400 shrink-0">分</span>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <Info size={14} className="text-blue-400" /> 规则说明
                            </label>
                            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                              <p className="text-xs text-blue-600/80 font-bold leading-relaxed">
                                系统将根据配置随机抽取对应数量的单选题和多选题。若题库不足，则抽取全部激活题目。
                              </p>
                            </div>
                          </div>

                          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-100">
                            <div className="space-y-6">
                              <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span> 单选题配置
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <span className="text-[9px] font-black text-slate-400 uppercase">题目数量</span>
                                  <input type="number" value={currentExamConfig.singleCount} onChange={(e) => updateExamConfig({...currentExamConfig, singleCount: Number(e.target.value)})} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold" />
                                </div>
                                <div className="space-y-2">
                                  <span className="text-[9px] font-black text-slate-400 uppercase">每题分值</span>
                                  <input type="number" value={currentExamConfig.singlePoints} onChange={(e) => updateExamConfig({...currentExamConfig, singlePoints: Number(e.target.value)})} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold" />
                                </div>
                              </div>
                            </div>

                            <div className="space-y-6">
                              <h4 className="text-[10px] font-black text-purple-500 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-500"></span> 多选题配置
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <span className="text-[9px] font-black text-slate-400 uppercase">题目数量</span>
                                  <input type="number" value={currentExamConfig.multipleCount} onChange={(e) => updateExamConfig({...currentExamConfig, multipleCount: Number(e.target.value)})} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold" />
                                </div>
                                <div className="space-y-2">
                                  <span className="text-[9px] font-black text-slate-400 uppercase">每题分值</span>
                                  <input type="number" value={currentExamConfig.multiplePoints} onChange={(e) => updateExamConfig({...currentExamConfig, multiplePoints: Number(e.target.value)})} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="bg-slate-900 text-white p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group h-full flex flex-col justify-between">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                          <FileText size={120} />
                        </div>
                        <div>
                          <h3 className="text-3xl font-black mb-6 uppercase tracking-tight">模拟考场</h3>
                          <div className="space-y-6 mb-12">
                            <div className="flex justify-between items-center py-3 border-b border-slate-800">
                              <span className="text-slate-400 font-bold text-sm">当前激活总量</span>
                              <span className="font-black text-xl">{activeQuestionCount} 题</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-slate-800">
                              <span className="text-slate-400 font-bold text-sm">单选建议数</span>
                              <span className="font-black text-xl">{currentExamConfig.singleCount}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-slate-800">
                              <span className="text-slate-400 font-bold text-sm">多选建议数</span>
                              <span className="font-black text-xl">{currentExamConfig.multipleCount}</span>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => startSession('exam')} 
                          className="w-full bg-orange-600 text-white font-black py-6 rounded-[2rem] hover:bg-orange-500 transition-all flex items-center justify-center gap-2 shadow-xl shadow-orange-900/40"
                        >
                          <Play size={24} /> 立即开始考试
                        </button>
                      </div>
                    </div>
                  </div>

                  {scopedHistory.length > 0 && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                      {renderHistoryTable()}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'practice' && (
                <div className="space-y-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden">
                      <div className="bg-orange-50 text-orange-600 w-20 h-20 rounded-3xl flex items-center justify-center mb-8"><Play size={40} /></div>
                      <h3 className="text-2xl font-black text-slate-800 mb-3 uppercase tracking-tight">自由练习</h3>
                      <p className="text-slate-500 mb-10 text-sm font-medium">针对当前证书题库进行强化训练。库容量：{activeQuestionCount} 题。</p>
                      <button onClick={() => startSession('practice')} className="w-full bg-slate-900 text-white font-black py-5 rounded-3xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2">立即开启 <ChevronRight size={20} /></button>
                    </div>

                    {renderWrongQuestionCard()}
                  </div>

                  {scopedHistory.length > 0 && renderHistoryTable()}
                </div>
              )}
              {activeTab === 'bookmarks' && (
                <div className="space-y-6">
                  {scopedQuestions.filter(q => bookmarks.includes(q.id)).length === 0 ? (
                    <div className="bg-white p-24 rounded-[3rem] text-center border border-dashed border-slate-200"><Star className="text-slate-100 mx-auto mb-4" size={64} /><p className="text-slate-400 font-bold">暂无收藏题目</p></div>
                  ) : (
                    scopedQuestions.filter(q => bookmarks.includes(q.id)).map((q, idx) => (
                      <QuestionCard key={q.id} question={q} index={idx} total={bookmarks.length} onAnswer={() => {}} isBookmarked={true} onToggleBookmark={toggleBookmark} />
                    ))
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-4xl mx-auto pb-32 animate-in zoom-in-95 duration-500">
               <div className="fixed top-0 right-0 md:left-64 left-0 bg-white/90 backdrop-blur-xl border-b border-slate-200 z-50 px-4 md:px-8 py-3 md:py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3 md:gap-6">
                  <button onClick={() => setIsSessionActive(false)} className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-xl md:rounded-2xl transition-all"><ChevronLeft size={20} className="text-slate-600" /></button>
                  <div className="h-6 md:h-8 w-px bg-slate-200"></div>
                  <h4 className="font-black text-slate-800 text-sm md:text-lg truncate">{sessionMode === 'exam' ? '模拟考场' : '练习模式'}</h4>
                  
                  {sessionMode === 'practice' && (
                    <div className="hidden md:flex bg-slate-100 p-1 rounded-xl gap-1">
                      <button 
                        onClick={() => setPracticeSubMode('answer')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${practiceSubMode === 'answer' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                      >
                        答题模式
                      </button>
                      <button 
                        onClick={() => setPracticeSubMode('recitation')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${practiceSubMode === 'recitation' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                      >
                        背题模式
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                  {sessionMode === 'exam' && (
                    <div className="flex items-center gap-2 mr-4 bg-orange-50 px-4 py-2 rounded-xl border border-orange-100">
                      <Timer className="text-orange-600" size={18} />
                      <span className="font-black text-orange-600 text-sm">
                        {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  )}
                  <span className="flex items-center gap-1.5 font-black text-xs md:text-sm text-slate-400"><BookOpen size={16}/> {currentIndex + 1} / {sessionQuestions.length}</span>
                  <button onClick={handleCompleteSession} className="bg-green-600 text-white px-4 md:px-8 py-2 md:py-3 rounded-xl font-black text-[10px] md:text-sm tracking-widest uppercase hover:bg-green-700 transition-all shadow-sm flex items-center gap-2">提交</button>
                </div>
              </div>
              <div className="mt-20 md:mt-28">
                {sessionMode === 'practice' && (
                  <div className="md:hidden flex bg-white border border-slate-100 p-1 rounded-2xl gap-1 mb-6 shadow-sm">
                    <button 
                      onClick={() => setPracticeSubMode('answer')}
                      className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${practiceSubMode === 'answer' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}
                    >
                      答题模式
                    </button>
                    <button 
                      onClick={() => setPracticeSubMode('recitation')}
                      className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${practiceSubMode === 'recitation' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}
                    >
                      背题模式
                    </button>
                  </div>
                )}
                <QuestionCard question={sessionQuestions[currentIndex]} index={currentIndex} total={sessionQuestions.length} userAnswer={userAnswers[sessionQuestions[currentIndex].id]} showResult={showResults} onAnswer={(ans) => setUserAnswers(p => ({...p, [sessionQuestions[currentIndex].id]: ans}))} isBookmarked={bookmarks.includes(sessionQuestions[currentIndex].id)} onToggleBookmark={toggleBookmark} isRecitationMode={practiceSubMode === 'recitation'} />
                <div className="flex justify-between items-center mt-12 px-2">
                  <button disabled={currentIndex === 0} onClick={() => { setCurrentIndex(p => p-1); window.scrollTo(0,0); }} className="flex items-center gap-2 text-slate-400 font-black uppercase text-xs px-8 py-4 rounded-xl border border-slate-200 disabled:opacity-30"><ChevronLeft size={16} /> Prev</button>
                  
                  {currentIndex < sessionQuestions.length - 1 && (
                    <button onClick={() => { setCurrentIndex(p => p+1); window.scrollTo(0,0); }} className="flex items-center gap-2 bg-slate-900 text-white font-black uppercase text-xs px-8 py-4 rounded-xl shadow-lg">Next <ChevronRight size={16} /></button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <QuestionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveQuestion} 
        editingQuestion={editingQuestion} 
        certId={currentCertId}
      />
    </div>
  );
};

export default App;
