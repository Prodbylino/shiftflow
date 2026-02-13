'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar, MobileHeader } from '@/components/layout/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { LoadingSpinner } from '@/components/ui/loading'
import { useAuth } from '@/lib/hooks'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [loading, user, router])

  if (loading || !user) {
    return <LoadingSpinner />
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-auto">
        <MobileHeader onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  )
}
