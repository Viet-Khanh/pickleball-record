'use client'

import { useCallback, useState } from 'react'

const ADMIN_SESSION_KEY = 'pickleball_admin'

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState(() =>
    typeof window !== 'undefined' && sessionStorage.getItem(ADMIN_SESSION_KEY) === '1'
  )

  const login = useCallback((password: string) => {
    if (password !== process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      return false
    }

    sessionStorage.setItem(ADMIN_SESSION_KEY, '1')
    setIsAdmin(true)
    return true
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY)
    setIsAdmin(false)
  }, [])

  return { isAdmin, login, logout }
}
