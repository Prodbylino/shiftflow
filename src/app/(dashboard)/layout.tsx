'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar, MobileHeader } from '@/components/layout/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { LoadingSpinner } from '@/components/ui/loading'
import { useAuth } from '@/lib/hooks'
import { DashboardAuthProvider } from '@/lib/dashboard-auth-context'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, profile, signOut, loading } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [loading, user, router])

  if (loading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return null
  }

  return (
    <DashboardAuthProvider value={{ user, profile, signOut }}>
      <div className="flex min-h-screen min-h-dvh bg-gray-50">
        <Sidebar
          mobileOpen={mobileMenuOpen}
          onMobileClose={() => setMobileMenuOpen(false)}
        />
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <MobileHeader onMenuClick={() => setMobileMenuOpen(true)} />
          <main className="flex-1 min-h-0">
            {children}
          </main>
        </div>
        <Toaster />
      </div>
    </DashboardAuthProvider>
  )
}
