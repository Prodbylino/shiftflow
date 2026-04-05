'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { useI18n } from '@/lib/i18n'

interface Organization {
  id: string
  name: string
  color: string
  hourlyRate: number
}

interface AddShiftModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: Date | null
  organizations: Organization[]
  onAddShift: (shift: {
    date: Date
    endDate: Date
    organizationId: string
    startTime: string
    endTime: string
    description?: string
  }) => void
}

// Generate time options in 30-minute intervals
const generateTimeOptions = () => {
  const options: string[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour = h.toString().padStart(2, '0')
      const minute = m.toString().padStart(2, '0')
      options.push(`${hour}:${minute}`)
    }
  }
  return options
}

const TIME_OPTIONS = generateTimeOptions()

export function AddShiftModal({
  open,
  onOpenChange,
  selectedDate,
  organizations,
  onAddShift,
}: AddShiftModalProps) {
  const { t, lang } = useI18n()
  const [selectedOrg, setSelectedOrg] = useState<string>('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [description, setDescription] = useState('')
  const [endDate, setEndDate] = useState<Date | null>(null)

  const [endDateOpen, setEndDateOpen] = useState(false)

  // Reset end date when selected date changes
  useEffect(() => {
    if (selectedDate) {
      setEndDate(new Date(selectedDate))
    }
  }, [selectedDate])

  // Calculate days difference for display
  const getDaysDifference = () => {
    if (!selectedDate || !endDate) return 0
    const start = new Date(selectedDate)
    const end = new Date(endDate)
    start.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }

  const calculateDuration = () => {
    if (!selectedDate || !endDate) return 0

    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)

    // Create actual date-time objects
    const startDateTime = new Date(selectedDate)
    startDateTime.setHours(startHour, startMin, 0, 0)

    const endDateTime = new Date(endDate)
    endDateTime.setHours(endHour, endMin, 0, 0)

    const diffMs = endDateTime.getTime() - startDateTime.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)

    return diffHours > 0 ? diffHours : 0
  }

  const calculateIncome = () => {
    const org = organizations.find(o => o.id === selectedOrg)
    if (!org) return 0
    return calculateDuration() * org.hourlyRate
  }

  const duration = calculateDuration()
  const income = calculateIncome()
  const daysDiff = getDaysDifference()

  // Format days difference label
  const getDaysDiffLabel = () => {
    if (daysDiff === 0) return null
    if (daysDiff === 1) return t('shift.nextDay')
    return lang === 'zh' ? `+${daysDiff}天` : `+${daysDiff} days`
  }

  const handleSubmit = () => {
    if (!selectedDate || !endDate || !selectedOrg) return
    onAddShift({
      date: selectedDate,
      endDate: endDate,
      organizationId: selectedOrg,
      startTime,
      endTime,
      description: description.trim() || undefined,
    })
    onOpenChange(false)
    setSelectedOrg('')
    setStartTime('09:00')
    setEndTime('17:00')
    setDescription('')
  }

  const formatDate = (date: Date | null) => {
    if (!date) return ''
    return date.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
      weekday: 'short',
    })
  }

  const formatDateFull = (date: Date | null) => {
    if (!date) return ''
    return date.toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-8">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold font-display">
            {t('shift.addTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Organization Select */}
          <div className="space-y-3">
            <Label className="text-xl font-medium">{t('shift.selectOrg')}</Label>
            <Select value={selectedOrg} onValueChange={setSelectedOrg}>
              <SelectTrigger className="h-14 text-lg rounded-xl">
                <SelectValue placeholder={t('shift.selectOrg')} />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id} className="text-lg py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: org.color }}
                      />
                      <span>{org.name}</span>
                      <span className="text-gray-500">${org.hourlyRate}/h</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date and Time - Teams Calendar Style */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-4">
            {/* Start Date & Time Row */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="text-sm text-gray-500 mb-1 block">{t('shift.startDate')}</Label>
                <div className="h-12 bg-white flex items-center px-4 text-lg text-gray-700 rounded-lg border">
                  {formatDate(selectedDate)}
                </div>
              </div>
              <div className="w-32">
                <Label className="text-sm text-gray-500 mb-1 block">{t('shift.startTime')}</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger className="h-12 text-lg font-semibold rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time} className="text-lg py-2">
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <path d="M12 5v14M5 12l7 7 7-7"/>
              </svg>
            </div>

            {/* End Date & Time Row */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="text-sm text-gray-500 mb-1 block">{t('shift.endDate')}</Label>
                <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className="h-12 w-full bg-white flex items-center justify-between px-4 text-lg text-gray-700 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <span>{formatDate(endDate)}</span>
                      {getDaysDiffLabel() && (
                        <span className="text-sm text-blue-600 font-medium">({getDaysDiffLabel()})</span>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate || undefined}
                      onSelect={(date) => {
                        if (date && selectedDate && date >= selectedDate) {
                          setEndDate(date)
                          setEndDateOpen(false)
                        }
                      }}
                      disabled={(date) => selectedDate ? date < selectedDate : false}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="w-32">
                <Label className="text-sm text-gray-500 mb-1 block">{t('shift.endTime')}</Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger className="h-12 text-lg font-semibold rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {TIME_OPTIONS.map((time) => (
                      <SelectItem key={time} value={time} className="text-lg py-2">
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Duration display */}
            <div className="flex items-center justify-end text-lg font-medium text-gray-600">
              {duration > 0 ? `${duration}h` : '---'}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <Label className="text-lg font-medium">{t('shift.description')}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about this shift..."
              className="h-20 text-base rounded-xl resize-none"
            />
          </div>

          {/* Summary */}
          <div className="bg-blue-50 rounded-2xl p-5 space-y-2">
            <div className="flex justify-between text-lg">
              <span className="text-gray-600">{t('shift.duration')}</span>
              <span className="font-bold">{duration}h</span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="text-gray-600">{t('shift.income')}</span>
              <span className="font-bold text-green-600 text-xl">${income.toFixed(2)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-14 text-lg rounded-xl"
            >
              {t('shift.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedOrg || duration <= 0}
              className="flex-1 h-14 text-lg rounded-xl bg-blue-600 hover:bg-blue-700"
            >
              {t('shift.confirm')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
