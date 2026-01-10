'use client'

import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'
import { AddShiftModal } from './AddShiftModal'
import { EditShiftModal } from './EditShiftModal'
import React from 'react'

interface Shift {
  id: string
  date: Date
  endDate?: Date
  organizationId: string
  startTime: string
  endTime: string
  description?: string
}

interface Organization {
  id: string
  name: string
  color: string
  hourlyRate: number
}

interface MonthCalendarProps {
  shifts: Shift[]
  organizations: Organization[]
  onAddShift: (shift: Omit<Shift, 'id'>) => void
  onEditShift?: (shift: Shift) => void
  onDeleteShift?: (shiftId: string) => void
}

// Helper functions outside component
function calculateShiftHours(shift: Shift): number {
  const [startHour, startMin] = shift.startTime.split(':').map(Number)
  const [endHour, endMin] = shift.endTime.split(':').map(Number)

  // If we have an endDate that's different from start date, calculate properly
  if (shift.endDate) {
    const startDate = new Date(shift.date)
    const endDate = new Date(shift.endDate)
    startDate.setHours(startHour, startMin, 0, 0)
    endDate.setHours(endHour, endMin, 0, 0)
    return (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
  }

  // Same day shift
  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin
  return (endMinutes - startMinutes) / 60
}

type ViewMode = 'month' | 'week'

export function MonthCalendar({ shifts, organizations, onAddShift, onEditShift, onDeleteShift }: MonthCalendarProps) {
  const { t, lang } = useI18n()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; shift: Shift } | null>(null)

  // Close context menu when clicking outside
  React.useEffect(() => {
    const handleClick = () => setContextMenu(null)
    if (contextMenu) {
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [contextMenu])

  const handleShiftClick = (e: React.MouseEvent, shift: Shift) => {
    e.stopPropagation()
    setSelectedShift(shift)
    setEditModalOpen(true)
  }

  const handleShiftRightClick = (e: React.MouseEvent, shift: Shift) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, shift })
  }

  const handleDeleteShift = (shiftId: string) => {
    if (onDeleteShift) {
      onDeleteShift(shiftId)
    }
    setContextMenu(null)
  }

  const handleEditFromMenu = (shift: Shift) => {
    setSelectedShift(shift)
    setEditModalOpen(true)
    setContextMenu(null)
  }

  // Check if shift spans to next day
  const isNextDayShift = (shift: Shift): boolean => {
    if (!shift.endDate) return false
    const startDate = new Date(shift.date)
    const endDate = new Date(shift.endDate)
    return endDate.getDate() !== startDate.getDate() ||
           endDate.getMonth() !== startDate.getMonth() ||
           endDate.getFullYear() !== startDate.getFullYear()
  }

  // Format time to compact style (9am, 5pm, 1:30pm)
  const formatTimeCompact = (time: string): string => {
    const [h, m] = time.split(':').map(Number)
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    const ampm = h < 12 ? 'am' : 'pm'
    if (m === 0) {
      return `${hour12}${ampm}`
    }
    return `${hour12}:${m.toString().padStart(2, '0')}${ampm}`
  }

  // Format shift time display - compact style
  const formatShiftTime = (shift: Shift): string => {
    const hours = calculateShiftHours(shift)
    const start = formatTimeCompact(shift.startTime)
    const end = formatTimeCompact(shift.endTime)
    if (isNextDayShift(shift)) {
      return `${start}-${end} +1d (${hours}h)`
    }
    return `${start}-${end} (${hours}h)`
  }

  const getShiftsForDate = useCallback((date: Date) => {
    return shifts.filter(s => {
      const shiftDate = new Date(s.date)
      return (
        shiftDate.getDate() === date.getDate() &&
        shiftDate.getMonth() === date.getMonth() &&
        shiftDate.getFullYear() === date.getFullYear()
      )
    })
  }, [shifts])

  // Get shifts that span into a specific day (for week view multi-day support)
  const getShiftsSpanningDay = useCallback((date: Date, weekDays: Date[]) => {
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`

    return shifts.filter(s => {
      const shiftStart = new Date(s.date)
      const shiftEnd = s.endDate ? new Date(s.endDate) : new Date(s.date)

      // Normalize dates to compare just the date part
      shiftStart.setHours(0, 0, 0, 0)
      const shiftEndNormalized = new Date(shiftEnd)
      shiftEndNormalized.setHours(0, 0, 0, 0)
      const dateNormalized = new Date(date)
      dateNormalized.setHours(0, 0, 0, 0)

      // Check if this day falls within the shift's date range
      return dateNormalized >= shiftStart && dateNormalized <= shiftEndNormalized
    }).map(shift => {
      const shiftStart = new Date(shift.date)
      const shiftEnd = shift.endDate ? new Date(shift.endDate) : new Date(shift.date)
      shiftStart.setHours(0, 0, 0, 0)
      shiftEnd.setHours(0, 0, 0, 0)
      const dateNormalized = new Date(date)
      dateNormalized.setHours(0, 0, 0, 0)

      const isStartDay = shiftStart.getTime() === dateNormalized.getTime()
      const isEndDay = shiftEnd.getTime() === dateNormalized.getTime()

      return {
        ...shift,
        isStartDay,
        isEndDay,
        displayStartTime: isStartDay ? shift.startTime : '00:00',
        displayEndTime: isEndDay ? shift.endTime : '24:00',
      }
    })
  }, [shifts])

  const weekDays = [
    t('calendar.mon'),
    t('calendar.tue'),
    t('calendar.wed'),
    t('calendar.thu'),
    t('calendar.fri'),
    t('calendar.sat'),
    t('calendar.sun'),
  ]

  // Get the week containing a specific date
  const getWeekDays = useCallback((date: Date) => {
    const day = date.getDay()
    const diff = day === 0 ? -6 : 1 - day // Adjust to start from Monday
    const monday = new Date(date)
    monday.setDate(date.getDate() + diff)

    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      days.push(d)
    }
    return days
  }, [])

  const currentWeekDays = useMemo(() => getWeekDays(currentDate), [currentDate, getWeekDays])

  const weeksData = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    let startOffset = firstDay.getDay() - 1
    if (startOffset < 0) startOffset = 6

    const days: (Date | null)[] = []

    for (let i = 0; i < startOffset; i++) {
      days.push(null)
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d))
    }

    while (days.length % 7 !== 0) {
      days.push(null)
    }

    const weeks: { days: (Date | null)[], totalHours: number, totalIncome: number }[] = []
    for (let i = 0; i < days.length; i += 7) {
      const weekDaysList = days.slice(i, i + 7)
      let totalHours = 0
      let totalIncome = 0

      weekDaysList.forEach(day => {
        if (day) {
          const dayShifts = getShiftsForDate(day)
          dayShifts.forEach(shift => {
            const hours = calculateShiftHours(shift)
            const org = organizations.find(o => o.id === shift.organizationId)
            totalHours += hours
            if (org) totalIncome += hours * org.hourlyRate
          })
        }
      })

      weeks.push({ days: weekDaysList, totalHours, totalIncome })
    }

    return weeks
  }, [currentDate, getShiftsForDate, organizations])

  const weekTotal = useMemo(() => {
    let hours = 0
    let income = 0
    currentWeekDays.forEach(day => {
      const dayShifts = getShiftsForDate(day)
      dayShifts.forEach(shift => {
        const h = calculateShiftHours(shift)
        const org = organizations.find(o => o.id === shift.organizationId)
        hours += h
        if (org) income += h * org.hourlyRate
      })
    })
    return { hours, income }
  }, [currentWeekDays, getShiftsForDate, organizations])

  const monthTotal = useMemo(() => {
    let hours = 0
    let income = 0
    weeksData.forEach(week => {
      hours += week.totalHours
      income += week.totalIncome
    })
    return { hours, income }
  }, [weeksData])

  const formatMonth = () => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long' }
    return currentDate.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', options)
  }

  const formatWeekRange = () => {
    const start = currentWeekDays[0]
    const end = currentWeekDays[6]
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    return `${start.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', opts)} - ${end.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', opts)}`
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setViewMode('week') // Switch to week view
  }

  const prevPeriod = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
    } else {
      const newDate = new Date(currentDate)
      newDate.setDate(currentDate.getDate() - 7)
      setCurrentDate(newDate)
    }
  }

  const nextPeriod = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
    } else {
      const newDate = new Date(currentDate)
      newDate.setDate(currentDate.getDate() + 7)
      setCurrentDate(newDate)
    }
  }

  const handleDayClick = (date: Date | null) => {
    if (date) {
      setSelectedDate(date)
      setModalOpen(true)
    }
  }

  const isToday = (date: Date | null) => {
    if (!date) return false
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const getOrgName = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId)
    return org?.name || ''
  }

  const getOrgColor = (orgId: string) => {
    const org = organizations.find(o => o.id === orgId)
    return org?.color || '#666'
  }

  // Hours for the week view grid (12am to 12am - full 24 hours)
  const hourSlots = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]
  const HOUR_HEIGHT = 50 // pixels per hour
  const GRID_START_HOUR = 0
  const GRID_END_HOUR = 24

  // Calculate pixel position for a shift in the week view
  const getShiftPixelPosition = (startTime: string, endTime: string) => {
    const [startH, startM] = startTime.split(':').map(Number)
    const [endH, endM] = endTime.split(':').map(Number)

    const startOffset = (startH - GRID_START_HOUR) * HOUR_HEIGHT + (startM / 60) * HOUR_HEIGHT
    const endOffset = (endH - GRID_START_HOUR) * HOUR_HEIGHT + (endM / 60) * HOUR_HEIGHT
    const height = endOffset - startOffset

    return {
      top: Math.max(0, startOffset),
      height: Math.max(40, height)
    }
  }

  // Scroll to 8am on mount
  const weekGridRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (viewMode === 'week' && weekGridRef.current) {
      // Scroll to 8am
      const scrollTo = 8 * HOUR_HEIGHT - 20
      weekGridRef.current.scrollTop = scrollTo
    }
  }, [viewMode])

  // Week View Component
  const renderWeekView = () => {
    const totalGridHeight = (GRID_END_HOUR - GRID_START_HOUR) * HOUR_HEIGHT + 20 // Extra padding for 12 AM label
    const TIME_COLUMN_WIDTH = 70 // Fixed width for time column
    const SCROLLBAR_WIDTH = 8 // Account for scrollbar width

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Row - Fixed alignment with scrollbar offset */}
        <div className="flex border-b border-gray-200 shrink-0">
          <div style={{ width: `${TIME_COLUMN_WIDTH}px`, flexShrink: 0 }}></div>
          <div className="flex-1 grid grid-cols-7" style={{ marginRight: `${SCROLLBAR_WIDTH}px` }}>
            {weekDays.map((day, idx) => (
              <div key={day} className="text-center py-3 border-l border-gray-200">
                <div className="text-xl font-semibold text-gray-600">{day}</div>
                <div className={`text-3xl font-bold mt-1 ${isToday(currentWeekDays[idx]) ? 'text-blue-600' : 'text-gray-800'}`}>
                  {currentWeekDays[idx].getDate()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Time Grid */}
        <div
          ref={weekGridRef}
          className="flex-1 overflow-y-auto overflow-x-hidden"
          style={{ scrollbarWidth: 'thin' }}
        >
          <div
            className="flex relative"
            style={{ height: `${totalGridHeight}px`, paddingTop: '10px' }}
          >
            {/* Time Labels Column - Fixed width */}
            <div className="relative shrink-0" style={{ width: `${TIME_COLUMN_WIDTH}px` }}>
              {hourSlots.map((hour) => (
                <div
                  key={hour}
                  className="absolute w-full text-right pr-3 text-base font-medium text-gray-500"
                  style={{
                    top: `${10 + (hour - GRID_START_HOUR) * HOUR_HEIGHT}px`,
                    transform: 'translateY(-50%)'
                  }}
                >
                  {hour === 0 || hour === 24 ? '12 AM' : hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
                </div>
              ))}
            </div>

            {/* Day Columns - Flex to fill remaining space */}
            <div className="flex-1 grid grid-cols-7">
              {currentWeekDays.map((day, dayIndex) => {
                const dayShifts = getShiftsSpanningDay(day, currentWeekDays)

                // Calculate overlapping shifts positions (side by side)
                const shiftsWithLayout = dayShifts.map((shift, idx) => {
                  const position = getShiftPixelPosition(shift.displayStartTime, shift.displayEndTime)
                  // Find overlapping shifts
                  const overlappingCount = dayShifts.filter((s, i) => {
                    if (i === idx) return false
                    const sPos = getShiftPixelPosition(s.displayStartTime, s.displayEndTime)
                    const sTop = sPos.top + 10
                    const sBottom = sTop + sPos.height
                    const thisTop = position.top + 10
                    const thisBottom = thisTop + position.height
                    return !(sBottom <= thisTop || sTop >= thisBottom)
                  }).length

                  // Calculate horizontal offset for overlapping shifts
                  const overlappingBefore = dayShifts.slice(0, idx).filter((s) => {
                    const sPos = getShiftPixelPosition(s.displayStartTime, s.displayEndTime)
                    const sTop = sPos.top + 10
                    const sBottom = sTop + sPos.height
                    const thisTop = position.top + 10
                    const thisBottom = thisTop + position.height
                    return !(sBottom <= thisTop || sTop >= thisBottom)
                  }).length

                  return {
                    ...shift,
                    position,
                    overlappingCount,
                    overlappingIndex: overlappingBefore
                  }
                })

                return (
                  <div
                    key={dayIndex}
                    onClick={() => handleDayClick(day)}
                    className={`
                      relative cursor-pointer border-l border-gray-200
                      hover:bg-blue-50/30 transition-colors
                      ${isToday(day) ? 'bg-blue-50/30' : 'bg-white'}
                    `}
                  >
                    {/* Hourly Grid Lines */}
                    {hourSlots.map((hour) => (
                      <div
                        key={hour}
                        className="absolute w-full border-t border-dashed border-gray-200"
                        style={{ top: `${10 + (hour - GRID_START_HOUR) * HOUR_HEIGHT}px` }}
                      />
                    ))}

                    {/* Shifts - side by side for overlaps */}
                    {shiftsWithLayout.map((shift) => {
                      const hours = calculateShiftHours(shift)
                      const totalOverlapping = shift.overlappingCount + 1
                      const widthPercent = totalOverlapping > 1 ? (100 / totalOverlapping) - 2 : 100
                      const leftPercent = totalOverlapping > 1 ? shift.overlappingIndex * (100 / totalOverlapping) + 1 : 0

                      // Calculate label based on which day we're on
                      let timeLabel = ''
                      if (shift.isStartDay && shift.isEndDay) {
                        timeLabel = `${shift.startTime} - ${shift.endTime}`
                      } else if (shift.isStartDay) {
                        timeLabel = `${shift.startTime} → ${t('shift.toNextDay')}`
                      } else if (shift.isEndDay) {
                        timeLabel = `→ ${shift.endTime}`
                      } else {
                        timeLabel = lang === 'zh' ? '全天' : 'All Day'
                      }

                      return (
                        <div
                          key={`${shift.id}-${dayIndex}`}
                          className={`absolute p-2 text-white overflow-hidden shadow-sm z-10 group cursor-pointer border-l-4
                            ${shift.isStartDay ? 'rounded-t-lg' : ''}
                            ${shift.isEndDay ? 'rounded-b-lg' : ''}
                          `}
                          style={{
                            backgroundColor: getOrgColor(shift.organizationId),
                            borderLeftColor: getOrgColor(shift.organizationId),
                            top: `${10 + shift.position.top}px`,
                            height: `${shift.position.height}px`,
                            left: totalOverlapping > 1 ? `calc(${leftPercent}% + 2px)` : '4px',
                            width: totalOverlapping > 1 ? `calc(${widthPercent}% - 4px)` : 'calc(100% - 8px)',
                          }}
                          onClick={(e) => handleShiftClick(e, shift)}
                          onContextMenu={(e) => handleShiftRightClick(e, shift)}
                        >
                          {/* Delete button - appears on hover */}
                          {shift.isStartDay && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteShift(shift.id)
                              }}
                              className="absolute top-1 right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-20"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6L6 18M6 6l12 12"/>
                              </svg>
                            </button>
                          )}
                          <div className="font-bold text-sm truncate">{getOrgName(shift.organizationId)}</div>
                          <div className="text-xs opacity-90">{timeLabel}</div>
                          {shift.isStartDay && (
                            <div className="text-xs opacity-75">({hours}h)</div>
                          )}
                          {shift.description && shift.isStartDay && (
                            <div className="text-xs mt-1 opacity-80 truncate">
                              {shift.description}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Week Total Bar */}
        <div className="mt-4 p-4 bg-blue-50 rounded-2xl shrink-0">
          <div className="flex items-center justify-center gap-12">
            <div className="text-center">
              <div className="text-xl text-gray-600">{t('calendar.weekTotal')}</div>
              <div className="text-4xl font-bold text-blue-600">{weekTotal.hours}h</div>
            </div>
            <div className="text-center">
              <div className="text-xl text-gray-600">{t('shift.income')}</div>
              <div className="text-4xl font-bold text-green-600">${weekTotal.income.toFixed(0)}</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Month View Component
  const renderMonthView = () => (
    <div className="flex-1 overflow-hidden">
      <div className="grid grid-cols-8 gap-0.5 h-full">
        {/* Header Row */}
        {weekDays.map((day) => (
          <div key={day} className="text-center text-base font-semibold text-gray-600 py-2">
            {day}
          </div>
        ))}
        <div className="text-center text-base font-semibold text-gray-600 py-2">
          {t('calendar.weekTotal')}
        </div>

        {/* Calendar Rows */}
        {weeksData.map((week, weekIndex) => (
          <React.Fragment key={weekIndex}>
            {week.days.map((day, dayIndex) => {
              const dayShifts = day ? getShiftsForDate(day) : []
              return (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  onClick={() => handleDayClick(day)}
                  className={`
                    calendar-cell p-1.5 cursor-pointer border border-gray-100 rounded-lg overflow-hidden
                    ${!day ? 'bg-gray-50 cursor-default' : 'bg-white hover:bg-blue-50'}
                    ${isToday(day) ? 'ring-2 ring-blue-500 ring-inset' : ''}
                  `}
                >
                  {day && (
                    <>
                      <div className={`text-base font-bold mb-1 ${isToday(day) ? 'text-blue-600' : 'text-gray-700'}`}>
                        {day.getDate()}
                      </div>
                      {dayShifts.length > 0 ? (
                        <div className="space-y-1">
                          {dayShifts.slice(0, 2).map((shift) => (
                            <div
                              key={shift.id}
                              className="shift-block text-white px-1.5 py-1 rounded relative group cursor-pointer overflow-hidden"
                              style={{ backgroundColor: getOrgColor(shift.organizationId) }}
                              onClick={(e) => handleShiftClick(e, shift)}
                              onContextMenu={(e) => handleShiftRightClick(e, shift)}
                            >
                              {/* Delete button - appears on hover */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteShift(shift.id)
                                }}
                                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                              </button>
                              <div className="text-xs font-semibold truncate leading-tight">{getOrgName(shift.organizationId)}</div>
                              <div className="text-[10px] opacity-90 truncate leading-tight">{formatShiftTime(shift)}</div>
                            </div>
                          ))}
                          {dayShifts.length > 2 && (
                            <div className="text-xs text-gray-500 font-medium">
                              +{dayShifts.length - 2}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-300 hover:text-blue-400">
                          {t('calendar.add')}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
            {/* Week Total Column */}
            <div className="p-1.5 bg-blue-50 rounded-lg flex flex-col justify-center">
              <div className="text-base font-bold text-blue-600">
                {week.totalHours}h
              </div>
              <div className="text-sm font-semibold text-green-600">
                ${week.totalIncome.toFixed(0)}
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  )

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={prevPeriod}
            className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <h2 className="text-3xl font-bold font-display min-w-[280px] text-center">
            {viewMode === 'month' ? formatMonth() : formatWeekRange()}
          </h2>
          <button
            onClick={nextPeriod}
            className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6"/>
            </svg>
          </button>
          <Button
            variant="outline"
            onClick={goToToday}
            className="h-12 px-6 text-lg rounded-xl ml-2"
          >
            {t('calendar.today')}
          </Button>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('month')}
            className={`px-6 py-2 rounded-lg text-lg font-medium transition-colors ${
              viewMode === 'month' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('calendar.viewMonth')}
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-6 py-2 rounded-lg text-lg font-medium transition-colors ${
              viewMode === 'week' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('calendar.viewWeek')}
          </button>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'month' ? renderMonthView() : renderWeekView()}

      {/* Month/Week Total Footer */}
      <div className="mt-4 p-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl text-white">
        <div className="flex items-center justify-between">
          <span className="text-xl font-medium">
            {viewMode === 'month' ? t('calendar.monthTotal') : t('calendar.weekTotal')}
          </span>
          <div className="flex items-center gap-8">
            <span className="text-2xl font-bold">
              {viewMode === 'month' ? monthTotal.hours : weekTotal.hours}h
            </span>
            <span className="text-2xl font-bold">
              ${viewMode === 'month' ? monthTotal.income.toFixed(0) : weekTotal.income.toFixed(0)}
            </span>
          </div>
        </div>
      </div>

      {/* Add Shift Modal */}
      <AddShiftModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        selectedDate={selectedDate}
        organizations={organizations}
        onAddShift={(shift) => onAddShift({ ...shift, date: shift.date })}
      />

      {/* Edit Shift Modal */}
      <EditShiftModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        shift={selectedShift}
        organizations={organizations}
        onEditShift={(shift) => {
          if (onEditShift) onEditShift(shift)
          setEditModalOpen(false)
        }}
        onDeleteShift={(shiftId) => {
          if (onDeleteShift) onDeleteShift(shiftId)
          setEditModalOpen(false)
        }}
      />

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => handleEditFromMenu(contextMenu.shift)}
            className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            {t('shift.edit')}
          </button>
          <button
            onClick={() => handleDeleteShift(contextMenu.shift.id)}
            className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"/>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
            {t('shift.delete')}
          </button>
        </div>
      )}
    </div>
  )
}
