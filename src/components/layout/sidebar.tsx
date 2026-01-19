'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/hooks'

const navItems = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" />
        <rect x="14" y="3" width="7" height="5" />
        <rect x="14" y="12" width="7" height="9" />
        <rect x="3" y="16" width="7" height="5" />
      </svg>
    ),
  },
  {
    name: 'Organizations',
    href: '/organizations',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
        <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
        <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
        <path d="M10 6h4" />
        <path d="M10 10h4" />
        <path d="M10 14h4" />
        <path d="M10 18h4" />
      </svg>
    ),
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </svg>
    ),
  },
]

interface SidebarProps {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const { user, profile, signOut, loading } = useAuth()

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User'
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  const handleNavClick = () => {
    // Close mobile menu when navigating
    if (onMobileClose) {
      onMobileClose()
    }
  }

  const sidebarContent = (
    <>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <span className="text-2xl font-bold text-gray-900 font-display">ShiftFlow</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={handleNavClick}
            className={cn(
              'flex items-center gap-4 px-4 py-4 rounded-xl text-xl font-medium transition-colors',
              pathname === item.href
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )}
          >
            {item.icon}
            {item.name}
          </Link>
        ))}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-4 px-4 py-3 mb-2">
          <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-lg font-bold text-white">
            {loading ? '...' : initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-semibold text-gray-900 truncate">
              {loading ? 'Loading...' : displayName}
            </p>
            <p className="text-base text-gray-500 truncate">
              {loading ? '' : (profile?.email || user?.email || '')}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-lg text-gray-600 hover:text-gray-900 h-14 px-4"
          onClick={signOut}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-4">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </Button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar - hidden on mobile */}
      <aside className="hidden md:flex w-72 bg-white border-r border-gray-200 min-h-screen flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-white flex flex-col transform transition-transform duration-300 ease-in-out md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Close button */}
        <button
          onClick={onMobileClose}
          className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700"
          aria-label="Close menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        {sidebarContent}
      </aside>
    </>
  )
}

// Mobile header with hamburger menu
export function MobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
      <button
        onClick={onMenuClick}
        className="p-2 text-gray-600 hover:text-gray-900 -ml-2"
        aria-label="Open menu"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <span className="text-xl font-bold text-gray-900 font-display">ShiftFlow</span>
      </div>
    </div>
  )
}
