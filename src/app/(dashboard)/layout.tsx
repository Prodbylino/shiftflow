'use client'

import { useState } from 'react'
import { Sidebar, MobileHeader } from '@/components/layout/sidebar'
import { Toaster } from '@/components/ui/sonner'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
