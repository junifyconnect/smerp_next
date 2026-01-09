export type DocType = 'SALES_QUOTE' | 'SALES_APPROVAL' | 'SALES_ORDER' | 'MA_QUOTE' | 'MA_APPROVAL'
export type DocStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED'
export type ApprovalStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED'

// API 응답 타입
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// 페이지네이션
export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// 문서 필터
export interface DocumentFilter {
  docType?: DocType
  status?: DocStatus
  clientCompany?: string
  createdById?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

// 문서 생성/수정 DTO
export interface CreateDocumentDto {
  docType: DocType
  title?: string
  projectName?: string
  clientCompany?: string
  clientContact?: string
  clientPhone?: string
  clientFax?: string
  clientEmail?: string
  vendorCompany?: string
  vendorContact?: string
  vendorPhone?: string
  vendorEmail?: string
  quoteDate?: string
  deliveryDate?: string
  validUntil?: string
  paymentTerms?: string
  notes?: string
  parentDocId?: string
  items: CreateDocumentItemDto[]
}

export interface CreateDocumentItemDto {
  partNumber?: string
  description?: string
  quantity: number
  srpPrice?: number
  unitPrice?: number
  purchasePrice?: number
}

export interface UpdateDocumentDto extends Partial<CreateDocumentDto> {
  status?: DocStatus
}

// 결재 DTO
export interface CreateApprovalDto {
  approverId: string
  step: number
}

export interface ProcessApprovalDto {
  status: 'APPROVED' | 'REJECTED'
  comment?: string
}

// 사용자 관련
export interface UserSession {
  id: string
  email: string
  name: string
  department?: string
  roles: string[]
}

export interface LoginDto {
  email: string
  password: string
}

// 파일 업로드
export interface UploadedFile {
  id: string
  fileName: string
  filePath: string
  fileSize: number
  mimeType: string
  url?: string
}

// 엑셀 임포트
export interface ImportResult {
  jobId: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  totalCount: number
  successCount: number
  errorCount: number
  errors?: ImportError[]
}

export interface ImportError {
  row: number
  fileName?: string
  message: string
}
