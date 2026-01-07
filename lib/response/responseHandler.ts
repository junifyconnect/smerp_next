// 응답 코드 타입
export type ResponseCode = 
  | 'OK'
  | 'CREATED'
  | 'UPDATED'
  | 'DELETED'
  | 'USER_NOT_FOUND'
  | 'DUPLICATE_LOGIN_ID'
  | 'INTERNAL_SERVER_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'SIGNUP_FAILED'
  | 'LOGIN_FAILED'
  | 'USER_CREATE_FAILED'

// 페이지네이션 메타데이터
export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

// 성공 응답
export interface SuccessResponse<T> {
  success: true
  code: ResponseCode
  data: T
  pagination?: PaginationMeta
}

// 에러 응답
export interface ErrorResponse {
  success: false
  code: ResponseCode
  message: string
  error?: unknown
}

// 통합 응답 타입
export type ActionResponse<T> = SuccessResponse<T> | ErrorResponse

/**
 * 성공 응답 생성
 */
export function actionSuccess<T>(
  data: T,
  code: ResponseCode = 'OK',
  pagination?: PaginationMeta
): SuccessResponse<T> {
  return {
    success: true,
    code,
    data,
    ...(pagination && { pagination }),
  }
}

/**
 * 에러 응답 생성
 */
export function actionError(
  code: ResponseCode,
  error?: unknown
): ErrorResponse {
  const message = getErrorMessage(code, error)
  
  const response: ErrorResponse = {
    success: false,
    code,
    message,
  }

  if (error !== undefined) {
    response.error = error
  }

  return response
}

/**
 * 에러 코드에 따른 메시지 반환
 */
function getErrorMessage(code: ResponseCode, error?: unknown): string {
  const errorMessages: Record<ResponseCode, string> = {
    OK: '성공',
    CREATED: '생성되었습니다',
    UPDATED: '수정되었습니다',
    DELETED: '삭제되었습니다',
    USER_NOT_FOUND: '사용자를 찾을 수 없습니다',
    DUPLICATE_LOGIN_ID: '이미 사용 중인 아이디입니다',
    INTERNAL_SERVER_ERROR: '서버 오류가 발생했습니다',
    UNAUTHORIZED: '인증이 필요합니다',
    FORBIDDEN: '권한이 없습니다',
    NOT_FOUND: '리소스를 찾을 수 없습니다',
    VALIDATION_ERROR: '입력값 검증에 실패했습니다',
    SIGNUP_FAILED: '회원가입에 실패했습니다',
    LOGIN_FAILED: '로그인에 실패했습니다',
    USER_CREATE_FAILED: '사용자 생성에 실패했습니다',
  }

  if (error instanceof Error) {
    return error.message || errorMessages[code]
  }

  return errorMessages[code]
}

