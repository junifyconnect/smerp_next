import type { ActionResponse, SuccessResponse } from '@/lib/response/responseHandler'

/**
 * Server Action의 복잡한 응답 구조를 자동으로 처리하고 SuccessResponse를 반환합니다.
 * 
 * @param actions - Server Action 호출 배열
 * @returns SuccessResponse 배열
 * @throws 에러 발생 시 throw (error.tsx로 이동)
 */
export async function unwrapAll<T extends readonly unknown[]>(
  actions: T
): Promise<{
  [K in keyof T]: T[K] extends Promise<infer R>
    ? R extends { data?: ActionResponse<infer D>; serverError?: string; validationErrors?: unknown }
      ? SuccessResponse<D>
      : never
    : never
}> {
  const results = await Promise.all(actions)

  return results.map((result) => {
    // next-safe-action의 result 구조 처리
    if (result && typeof result === 'object' && 'data' in result) {
      const actionResult = result as {
        data?: ActionResponse<unknown>
        serverError?: string
        validationErrors?: unknown
      }

      // Validation 에러 체크
      if (actionResult.validationErrors) {
        throw new Error('입력값 검증에 실패했습니다')
      }

      // Server 에러 체크
      if (actionResult.serverError) {
        throw new Error(actionResult.serverError)
      }

      // Data 존재 여부 체크
      if (!actionResult.data) {
        throw new Error('응답 데이터가 없습니다')
      }

      // Success 체크
      if (!actionResult.data.success) {
        throw new Error(actionResult.data.message || '요청 처리에 실패했습니다')
      }

      // SuccessResponse 반환
      return actionResult.data
    }

    // 이미 ActionResponse인 경우
    if (result && typeof result === 'object' && 'success' in result) {
      const response = result as ActionResponse<unknown>

      if (!response.success) {
        throw new Error(response.message || '요청 처리에 실패했습니다')
      }

      return response
    }

    throw new Error('예상치 못한 응답 형식입니다')
  }) as {
    [K in keyof T]: T[K] extends Promise<infer R>
      ? R extends { data?: ActionResponse<infer D>; serverError?: string; validationErrors?: unknown }
        ? SuccessResponse<D>
        : never
      : never
  }
}

