'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { ActionResponse } from '@/lib/response/responseHandler'

interface ExecuteActionOptions {
  errorMessage?: string
  redirectUrl?: string
  successMessage?: string
}

/**
 * Server Action 실행 시 에러 처리, validation, toast 알림을 통합 관리하는 Hook
 * 
 * @returns executeAction 함수
 */
export function useExecuteAction() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const executeAction = async <T,>(
    action: () => Promise<{ data?: ActionResponse<T>; serverError?: string; validationErrors?: unknown }>,
    options?: ExecuteActionOptions
  ): Promise<ActionResponse<T> | null> => {
    setIsLoading(true)

    try {
      const result = await action()

      // Validation 에러 체크
      if (result.validationErrors) {
        toast.error('입력값 검증에 실패했습니다')
        return null
      }

      // Server 에러 체크
      if (result.serverError) {
        toast.error(options?.errorMessage || result.serverError)
        if (options?.redirectUrl) {
          router.push(options.redirectUrl)
        }
        return null
      }

      // Data 존재 여부 체크
      if (!result.data) {
        toast.error(options?.errorMessage || '응답 데이터가 없습니다')
        return null
      }

      // Success 체크
      if (!result.data.success) {
        toast.error(result.data.message || options?.errorMessage || '요청 처리에 실패했습니다')
        if (options?.redirectUrl) {
          router.push(options.redirectUrl)
        }
        return null
      }

      // 성공 메시지 표시
      if (options?.successMessage) {
        toast.success(options.successMessage)
      }

      // 성공 응답 반환
      return result.data
    } catch (error) {
      toast.error(options?.errorMessage || '예상치 못한 오류가 발생했습니다')
      if (options?.redirectUrl) {
        router.push(options.redirectUrl)
      }
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return executeAction
}

