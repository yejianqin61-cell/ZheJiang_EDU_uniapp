// === API Response ===
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

export interface PaginatedData<T> {
  list: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// === User ===
export interface UserInfo {
  id: string;
  role: 'teacher' | 'admin';
  nickname: string | null;
  avatarUrl: string | null;
}

export interface LoginResult {
  accessToken: string;
  user: UserInfo;
}

// === Paper ===
export interface GradeOption {
  stage: string;
  grades: string[];
}

export interface DifficultyOption {
  value: number | string;
  label: string;
}

export interface KnowledgePointItem {
  id: string;
  name: string;
  questionCount: number;
}

export interface PaperCondition {
  subject: string;
  grade: string;
  knowledgePointIds?: string[];
  difficulty: string;
  questionCount: number;
}

export interface QuestionPreview {
  index: number;
  type: string;
  content: string;
  options: string[];
}

export interface PaperResult {
  paperId: string;
  title: string;
  questions: QuestionPreview[];
  generateTime: number;
}

// === Order ===
export interface OrderItem {
  orderId: string;
  orderNo: string;
  paperTitle: string;
  amount: number;
  status: string;
  createdAt: string;
}

export interface CreateOrderResult {
  orderId: string;
  orderNo: string;
  amount: number;
  wxPayParams: Record<string, string> | null;
}

// === Admin - Question ===
export interface QuestionDetail {
  id: string;
  type: string;
  content: string;
  options: string[] | null;
  answer: string;
  analysis: string | null;
  difficulty: number;
  subject: string;
  grade: string;
  status: string;
  sourceFile: { id: string; filename: string } | null;
  isDeleted: boolean;
}

// === Admin - Knowledge Point ===
export interface KnowledgePoint {
  id: string;
  name: string;
  subject: string;
  grade: string;
  questionCount: number;
}

// === Admin - File ===
export interface KbFileItem {
  fileId: string;
  filename: string;
  fileType: string;
  fileSize: number;
  subject: string;
  grade: string;
  status: string;
  questionCount: number;
  createdAt: string;
}

// === Admin - Stats ===
export interface DashboardStats {
  totalQuestions: number;
  bySubject: { subject: string; count: number }[];
  byGrade: { grade: string; count: number }[];
  byDifficulty: { level: number; label: string; count: number }[];
  totalKnowledgePoints: number;
}
