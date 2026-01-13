import 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    email: string
    name: string
    department?: string
    position?: string
    roles?: string[]
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      department?: string
      position?: string
      roles?: string[]
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    department?: string
    position?: string
    roles?: string[]
  }
}
