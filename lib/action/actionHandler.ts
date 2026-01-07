import { createSafeActionClient } from 'next-safe-action'
import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'

/**
 * 인증 불필요한 액션
 */
export const action = createSafeActionClient()

/**
 * 인증 필요한 액션 (자동 인증 체크)
 */
export const actionAuth = createSafeActionClient()
  .use(async ({ next }) => {
    const user = await getCurrentUser()

    if (!user) {
      redirect('/login')
    }

    return next({ ctx: { userId: user.id, user } })
  })

