'use client'

import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const error = searchParams.get('error')

  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(error ? '로그인에 실패했습니다' : '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')

    const email = `${userId}@servermate.net`

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setErrorMessage('이메일 또는 비밀번호가 올바르지 않습니다')
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setErrorMessage('로그인 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-gray-900">SMERP</h1>
          <h2 className="mt-2 text-center text-xl text-gray-600">로그인</h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {errorMessage}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="userId" className="block text-sm font-medium text-gray-700">
                사용자 ID
              </label>
              <div className="mt-1 flex">
                <input
                  id="userId"
                  name="userId"
                  type="text"
                  required
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder=""
                />
                <span className="inline-flex items-center px-4 py-3 border border-l-0 border-gray-300 bg-gray-50 text-gray-500 rounded-r-lg text-sm">
                  @servermate.net
                </span>
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="비밀번호"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>

          <div className="text-center text-sm text-gray-600">
            계정이 없으신가요?{' '}
            <Link href="/register" className="text-blue-600 hover:text-blue-700 font-medium">
              회원가입
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse">로딩 중...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
