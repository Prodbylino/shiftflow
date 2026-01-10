'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useI18n, LanguageSwitch } from '@/lib/i18n'
import { useAuth, useAnalytics, useOrganizations, useShifts } from '@/lib/hooks'
import { LoadingSpinner } from '@/components/ui/loading'

interface OrgSummary {
  organization_id: string
  organization_name: string
  organization_color: string
  shift_count: number
  total_hours: number
}

export default function AnalyticsPage() {
  const { t } = useI18n()
  const { loading: authLoading } = useAuth()
  const { organizations, loading: orgsLoading } = useOrganizations()
  const { shifts, loading: shiftsLoading } = useShifts()
  const { getMonthlySummary, getFinancialYearSummary, loading: analyticsLoading } = useAnalytics()

  const [period, setPeriod] = useState('month')
  const [summaryData, setSummaryData] = useState<OrgSummary[]>([])
  const [fyData, setFyData] = useState<OrgSummary[]>([])

  // Fetch analytics data based on period
  useEffect(() => {
    const fetchData = async () => {
      const now = new Date()

      if (period === 'month') {
        const data = await getMonthlySummary(now.getFullYear(), now.getMonth() + 1)
        setSummaryData(data)
      } else if (period === 'fy') {
        // Australian FY starts in July
        const fyStartYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
        const data = await getFinancialYearSummary(fyStartYear)
        setFyData(data)
      } else if (period === 'week') {
        // For week, filter shifts from last 7 days
        const data = await getMonthlySummary(now.getFullYear(), now.getMonth() + 1)
        setSummaryData(data)
      }
    }

    fetchData()
  }, [period, getMonthlySummary, getFinancialYearSummary])

  // Calculate totals from data
  const totals = useMemo(() => {
    const data = period === 'fy' ? fyData : summaryData
    const totalShifts = data.reduce((sum, d) => sum + d.shift_count, 0)
    const totalHours = data.reduce((sum, d) => sum + Number(d.total_hours), 0)

    const orgsWithPercentage = data.map(d => ({
      name: d.organization_name,
      color: d.organization_color,
      shifts: d.shift_count,
      hours: Number(d.total_hours),
      percentage: totalHours > 0 ? Math.round((Number(d.total_hours) / totalHours) * 100) : 0,
    }))

    // Calculate average earnings based on organizations' hourly rates
    const avgEarnings = orgsWithPercentage.reduce((sum, org) => {
      const orgData = organizations.find(o => o.name === org.name)
      return sum + (org.hours * (orgData?.hourly_rate || 0))
    }, 0)

    return {
      totalShifts,
      totalHours: Math.round(totalHours),
      avgHoursPerWeek: Math.round(totalHours / 4), // Approximate
      avgEarningPerMonth: Math.round(avgEarnings),
      organizations: orgsWithPercentage,
    }
  }, [summaryData, fyData, period, organizations])

  // Calculate FY totals
  const fyTotals = useMemo(() => {
    const totalShifts = fyData.reduce((sum, d) => sum + d.shift_count, 0)
    const totalHours = fyData.reduce((sum, d) => sum + Number(d.total_hours), 0)
    return {
      totalShifts,
      totalHours: Math.round(totalHours),
      avgHoursPerWeek: Math.round(totalHours / 52), // ~52 weeks in FY
    }
  }, [fyData])

  // Monthly trend data (last 7 months)
  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const now = new Date()
    const data = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthShifts = shifts.filter(s => {
        const shiftDate = new Date(s.date)
        return shiftDate.getMonth() === date.getMonth() && shiftDate.getFullYear() === date.getFullYear()
      })

      const hours = monthShifts.reduce((sum, s) => {
        const [startH, startM] = s.start_time.split(':').map(Number)
        const [endH, endM] = s.end_time.split(':').map(Number)
        let diff = (endH * 60 + endM) - (startH * 60 + startM)
        if (diff < 0) diff += 24 * 60 // Handle overnight shifts
        return sum + diff / 60
      }, 0)

      data.push({
        month: months[date.getMonth()],
        hours: Math.round(hours),
      })
    }

    return data
  }, [shifts])

  const maxHours = Math.max(...monthlyData.map(d => d.hours), 1)

  if (authLoading || orgsLoading || shiftsLoading) {
    return <LoadingSpinner />
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('analytics.title')}</h1>
          <p className="text-gray-500">{t('analytics.subtitle')}</p>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitch />
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{t('analytics.thisWeek')}</SelectItem>
              <SelectItem value="month">{t('analytics.thisMonth')}</SelectItem>
              <SelectItem value="fy">{t('analytics.financialYear')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-5">
            <p className="text-blue-100 text-sm font-medium">{t('analytics.totalHours')}</p>
            <p className="text-4xl font-bold mt-1">{totals.totalHours}</p>
            <p className="text-blue-100 text-sm mt-1">{t('analytics.thisMonth')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-gray-500 text-sm font-medium">{t('analytics.totalShifts')}</p>
            <p className="text-4xl font-bold text-gray-900 mt-1">{totals.totalShifts}</p>
            <p className="text-gray-500 text-sm mt-1">{t('analytics.thisMonth')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-gray-500 text-sm font-medium">{t('analytics.avgHoursWeek')}</p>
            <p className="text-4xl font-bold text-gray-900 mt-1">{totals.avgHoursPerWeek}</p>
            <p className="text-gray-500 text-sm mt-1">{t('analytics.basedOnWeeks')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-gray-500 text-sm font-medium">{t('analytics.avgEarningMonth')}</p>
            <p className="text-4xl font-bold text-gray-900 mt-1">${totals.avgEarningPerMonth}</p>
            <p className="text-gray-500 text-sm mt-1">{t('analytics.thisMonth')}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Hours by Organization */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">{t('analytics.hoursByOrg')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {totals.organizations.length > 0 ? (
                totals.organizations.map((org) => (
                  <div key={org.name}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: org.color }}
                        />
                        <span className="font-medium text-gray-900">{org.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-gray-900">{org.hours}h</span>
                        <span className="text-gray-500 text-sm ml-2">({org.shifts} {t('analytics.shifts')})</span>
                      </div>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${org.percentage}%`,
                          backgroundColor: org.color,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No data available for this period</p>
              )}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{t('analytics.totalThisMonth')}</span>
                <span className="font-semibold text-gray-900">{totals.totalHours} {t('analytics.hours')}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('analytics.fyTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 mb-1">{t('analytics.fy')}</p>
              <p className="text-5xl font-bold text-gray-900">{fyTotals.totalHours.toLocaleString()}</p>
              <p className="text-gray-500">{t('analytics.totalHours')}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{fyTotals.totalShifts}</p>
                <p className="text-xs text-gray-500">{t('analytics.totalShifts')}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{fyTotals.avgHoursPerWeek}</p>
                <p className="text-xs text-gray-500">{t('analytics.avgHrsWeek')}</p>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {t('analytics.exportReport')}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">{t('analytics.monthlyTrend')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2 h-48">
            {monthlyData.map((data) => (
              <div key={data.month} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col items-center justify-end h-40">
                  <span className="text-xs font-medium text-gray-900 mb-1">{data.hours}</span>
                  <div
                    className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-md transition-all duration-500"
                    style={{ height: `${(data.hours / maxHours) * 100}%`, minHeight: data.hours > 0 ? '4px' : '0' }}
                  />
                </div>
                <span className="text-xs text-gray-500 mt-2">{data.month}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Breakdown */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{t('analytics.detailedBreakdown')}</CardTitle>
          <Button variant="outline" size="sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {t('analytics.exportCSV')}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('analytics.organization')}</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('analytics.shifts')}</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('analytics.hours')}</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">{t('analytics.percentTotal')}</th>
                </tr>
              </thead>
              <tbody>
                {totals.organizations.map((org) => (
                  <tr key={org.name} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: org.color }}
                        />
                        <span className="font-medium text-gray-900">{org.name}</span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 text-gray-900">{org.shifts}</td>
                    <td className="text-right py-3 px-4 text-gray-900">{org.hours}h</td>
                    <td className="text-right py-3 px-4 text-gray-900">{org.percentage}%</td>
                  </tr>
                ))}
                {totals.organizations.length > 0 && (
                  <tr className="bg-gray-50 font-semibold">
                    <td className="py-3 px-4 text-gray-900">{t('analytics.total')}</td>
                    <td className="text-right py-3 px-4 text-gray-900">{totals.totalShifts}</td>
                    <td className="text-right py-3 px-4 text-gray-900">{totals.totalHours}h</td>
                    <td className="text-right py-3 px-4 text-gray-900">100%</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
