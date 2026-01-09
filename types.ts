
export type QuestionType = 'single' | 'multiple';

export interface QuestionOption {
  label: string;
  text: string;
}

export interface Certificate {
  id: string;
  name: string; // Short name, e.g. "ACP"
  fullName: string; // e.g. "Alibaba Cloud Certified Professional"
  domain: string; // e.g. "LLM"
  level: 'Professional' | 'Associate' | 'Expert';
  status: 'obtained' | 'not_obtained'; // 新增：证书状态
  description?: string; // 知识点及比重描述
  imageUrl?: string; // 证书范例图片
  updatedAt: number;
  certNumber?: string;
  issueDate?: string;
}

export interface ExamConfig {
  certId: string;
  totalScore: number;
  duration: number; // in minutes
  passingScore: number;
  singleCount: number;
  singlePoints: number;
  multipleCount: number;
  multiplePoints: number;
}

export interface QuestionFile {
  id: string;
  certId: string; // Linked certificate
  name: string;
  uploadDate: number;
  questionCount: number;
  skippedCount?: number; // 记录跳过的重复题目数
  isActive: boolean;
}

export interface Question {
  id: string;
  certId: string; // Linked certificate
  fileId: string;
  type: QuestionType;
  content: string;
  images?: string[];
  options: QuestionOption[];
  answer: string[];
  knowledgePoint: string;
  hash: string;
}

export interface PracticeSession {
  id: string;
  certId: string;
  date: number;
  type: 'practice' | 'exam';
  score: number;
  totalQuestions: number;
  duration: number;
  wrongQuestionIds: string[];
  // Resumption fields
  currentIndex: number;
  sessionQuestionIds: string[];
  savedAnswers: Record<string, string[]>;
  isCompleted: boolean;
}

export interface UserStats {
  totalAnswered: number;
  correctCount: number;
  knowledgeStats: Record<string, { total: number; correct: number }>;
  history: PracticeSession[];
}
