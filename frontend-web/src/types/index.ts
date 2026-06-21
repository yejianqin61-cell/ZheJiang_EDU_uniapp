// === Paper ===
export interface KnowledgePointItem {
  id: string
  name: string
  questionCount: number
}

export interface PaperCondition {
  subject: string
  grade: string
  knowledgePointIds?: string[]
  difficulty: string
  questionCount: number
}

export interface QuestionPreview {
  index: number
  type: string
  content: string
  options: string[]
}

export interface PaperResult {
  paperId: string
  title: string
  questions: QuestionPreview[]
  generateTime: number
}

// === Order ===
export interface OrderItem {
  orderId: string
  orderNo: string
  type?: 'download' | 'print' | 'exercise'
  paperTitle: string
  amount: number
  unitPrice?: number
  status: string
  copies?: number | null
  printStatus?: string | null
  shipping?: {
    receiverName: string
    phone: string
    fullAddress: string
  }
  hasExport?: boolean
  createdAt: string
}

export interface OrderDetail {
  orderId: string
  orderNo: string
  type: 'download' | 'print' | 'exercise'
  paperId: string
  paperTitle: string
  questionCount: number
  amount: number
  unitPrice: number
  status: string
  pricingSnapshot?: Record<string, any>
  copies?: number | null
  printStatus?: string | null
  shipping?: {
    receiverName: string
    phone: string
    fullAddress: string
  } | null
  printStatusLog?: Array<{ status: string; time: string }>
  hasExport?: boolean
  paidAt?: string | null
  createdAt: string
}

export interface CreateOrderResult {
  orderId: string
  orderNo: string
  type: 'download' | 'print' | 'exercise'
  amount: number
  unitPrice: number
  copies?: number | null
  payment?: {
    provider: string
    payForm?: string
    codeUrl?: string
    amount: number
  }
}

export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

// === Shipping ===
export interface ShippingAddress {
  id: string
  receiverName: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
  isDefault: boolean
}

// === Pricing ===
export interface PricingConfig {
  download: { unitPrice: number; description: string }
  print: Array<{
    tier: number
    minQuantity: number
    maxQuantity: number | null
    unitPrice: number
  }>
  cashback: { unitPrice: number; description?: string }
  exerciseCashback: { unitPrice: number; description?: string }
  exercise: { unitPrice: number; description?: string }
}

// === Dashboard ===
export interface DashboardStats {
  totalQuestions: number
  bySubject: { subject: string; count: number }[]
  byGrade: { grade: string; count: number }[]
  byDifficulty: { level: number; label: string; count: number }[]
  totalKnowledgePoints: number
}

// === Admin Question ===
export interface QuestionDetail {
  id: string
  type: string
  content: string
  options: string[] | null
  answer: string
  analysis: string | null
  difficulty: number
  subject: string
  grade: string
  status: string
  sourceFile: { id: string; filename: string } | null
  isDeleted: boolean
}

// === Knowledge Point ===
export interface KnowledgePoint {
  id: string
  name: string
  subject: string
  grade: string
  questionCount: number
}

// === Exercise Contribution ===
export interface ExerciseUploadItem {
  id: string
  title: string
  subject: string
  grade: string
  exerciseType: 'sync' | 'unit' | 'topic' | 'exam'
  categoryId?: string | null
  lessonId?: string | null
  fileUrl: string
  fileType: string
  fileSize?: number | null
  status: 'pending_review' | 'approved' | 'rejected'
  reviewNote?: string | null
  cashbackAmount: number
  uploaderPhone?: string | null
  createdAt: string
}
