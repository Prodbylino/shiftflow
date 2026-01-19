'use client'

import { useEffect, useMemo } from 'react'
import { LanguageSwitch } from '@/lib/i18n'
import { MonthCalendar } from '@/components/calendar/MonthCalendar'
import { UserMenu } from '@/components/calendar/UserMenu'
import { useAuth, useOrganizations, useShifts } from '@/lib/hooks'
import { LoadingSpinner } from '@/components/ui/loading'

// Type for the calendar component
interface CalendarShift {
  id: string
  date: Date
  endDate?: Date
  organizationId: string
  startTime: string
  endTime: string
  description?: string
}

interface CalendarOrganization {
  id: string
  name: string
  color: string
  hourlyRate: number
}

export default function DashboardPage() {
  const { user: authUser, profile, signOut, loading: authLoading } = useAuth()
  const { organizations, loading: orgsLoading, refetch: refetchOrganizations } = useOrganizations()
  const { shifts, createShift, updateShift, deleteShift, loading: shiftsLoading, refetch: refetchShifts } = useShifts()

  useEffect(() => {
    if (!authUser) return
    // Ensure data is refreshed after session becomes available.
    void refetchOrganizations()
    void refetchShifts()
  }, [authUser, refetchOrganizations, refetchShifts])

  // Transform DB organizations to calendar component format
  const calendarOrganizations: CalendarOrganization[] = useMemo(() => {
    return organizations.map(org => ({
      id: org.id,
      name: org.name,
      color: org.color,
      hourlyRate: org.hourly_rate || 0,
    }))
  }, [organizations])

  // Transform DB shifts to calendar component format
  const calendarShifts: CalendarShift[] = useMemo(() => {
    return shifts.map(s => ({
      id: s.id,
      date: new Date(s.date),
      endDate: s.end_date ? new Date(s.end_date) : new Date(s.date),
      organizationId: s.organization_id,
      startTime: s.start_time,
      endTime: s.end_time,
      description: s.notes || undefined,
    }))
  }, [shifts])

  const handleAddShift = async (newShift: Omit<CalendarShift, 'id'>) => {
    const org = calendarOrganizations.find(o => o.id === newShift.organizationId)
    await createShift({
      organization_id: newShift.organizationId,
      title: org?.name || 'Shift',
      date: newShift.date.toISOString().split('T')[0],
      end_date: newShift.endDate ? newShift.endDate.toISOString().split('T')[0] : newShift.date.toISOString().split('T')[0],
      start_time: newShift.startTime,
      end_time: newShift.endTime,
      notes: newShift.description || null,
    })
  }

  const handleEditShift = async (updatedShift: CalendarShift) => {
    await updateShift(updatedShift.id, {
      organization_id: updatedShift.organizationId,
      date: updatedShift.date.toISOString().split('T')[0],
      end_date: updatedShift.endDate ? updatedShift.endDate.toISOString().split('T')[0] : updatedShift.date.toISOString().split('T')[0],
      start_time: updatedShift.startTime,
      end_time: updatedShift.endTime,
      notes: updatedShift.description || null,
    })
  }

  const handleDeleteShift = async (shiftId: string) => {
    await deleteShift(shiftId)
  }

  // Show loading while fetching data
  if (authLoading) {
    return <LoadingSpinner />
  }

  const userForMenu = {
    name: profile?.full_name || authUser?.email?.split('@')[0] || 'User',
    email: profile?.email || authUser?.email || '',
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shrink-0">
        <div className="px-3 md:px-6 h-14 md:h-16 flex items-center justify-between">
          {/* Organization Legend - scrollable on mobile */}
          <div className="flex items-center gap-3 md:gap-8 overflow-x-auto flex-1 mr-2 scrollbar-hide">
            {calendarOrganizations.map((org) => (
              <div key={org.id} className="flex items-center gap-1.5 md:gap-2 shrink-0">
                <div
                  className="w-4 h-4 md:w-5 md:h-5 rounded-full"
                  style={{ backgroundColor: org.color }}
                />
                <span className="text-sm md:text-lg font-medium text-gray-700 whitespace-nowrap">{org.name}</span>
                <span className="text-xs md:text-base text-gray-500 whitespace-nowrap">${org.hourlyRate}/h</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <LanguageSwitch />
            <UserMenu user={userForMenu} onLogout={signOut} />
          </div>
        </div>
      </header>

      {/* Main Content - Calendar fills remaining space */}
      <main className="flex-1 p-2 md:p-4 overflow-auto">
        <div className="bg-white rounded-xl md:rounded-2xl p-3 md:p-6 shadow-sm min-h-[calc(100vh-8rem)]">
          <MonthCalendar
            shifts={calendarShifts}
            organizations={calendarOrganizations}
            onAddShift={handleAddShift}
            onEditShift={handleEditShift}
            onDeleteShift={handleDeleteShift}
          />
        </div>
      </main>
    </div>
  )
}
