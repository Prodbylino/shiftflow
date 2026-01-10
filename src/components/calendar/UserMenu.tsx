'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface UserMenuProps {
  user: {
    name: string
    email: string
    avatar?: string
  }
  onLogout: () => void
}

export function UserMenu({ user, onLogout }: UserMenuProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold text-lg flex items-center justify-center hover:bg-blue-700 transition-colors">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            initials
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        {/* User Info */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-600 text-white font-bold text-xl flex items-center justify-center">
              {initials}
            </div>
            <div>
              <p className="font-semibold text-lg text-gray-900">{user.name}</p>
              <p className="text-gray-500">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="p-2">
          <Link
            href="/organizations"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-lg text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            {t('user.orgs')}
          </Link>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-lg text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            {t('user.settings')}
          </Link>
        </div>

        {/* Logout */}
        <div className="p-2 border-t border-gray-100">
          <button
            onClick={() => {
              setOpen(false)
              onLogout()
            }}
            className="flex items-center gap-3 px-4 py-3 text-lg text-red-600 hover:bg-red-50 rounded-xl transition-colors w-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {t('nav.logout')}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
