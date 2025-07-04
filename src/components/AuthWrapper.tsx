'use client'

import { useState, useEffect } from 'react'
import LoginForm from './LoginForm'

interface AuthWrapperProps {
  children: React.ReactNode
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Sayfa yüklendiğinde session kontrolü yap
    const isLoggedIn = sessionStorage.getItem('admin_authenticated') === 'true'
    setIsAuthenticated(isLoggedIn)
    setIsLoading(false)
  }, [])

  const handleLogin = async (password: string) => {
    setError('')
    
    try {
      // Environment'tan admin şifresini kontrol et
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      if (response.ok) {
        sessionStorage.setItem('admin_authenticated', 'true')
        setIsAuthenticated(true)
      } else {
        setError('Hatalı şifre! Lütfen tekrar deneyin.')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('Giriş yaparken bir hata oluştu.')
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('admin_authenticated')
    setIsAuthenticated(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-2xl font-semibold text-purple-600">Yükleniyor...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} error={error} />
  }

  return (
    <div>
      {/* Logout butonu */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Çıkış Yap
        </button>
      </div>
      {children}
    </div>
  )
} 