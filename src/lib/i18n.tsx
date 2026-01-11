'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

type Language = 'en' | 'zh'

interface Translations {
  [key: string]: {
    en: string
    zh: string
  }
}

const translations: Translations = {
  // Navigation
  'nav.signIn': { en: 'Sign In', zh: '登录' },
  'nav.getStarted': { en: 'Get Started', zh: '开始使用' },
  'nav.logout': { en: 'Log Out', zh: '退出登录' },

  // Home page
  'home.title': { en: 'Manage Your Shifts', zh: '轻松管理班表' },
  'home.titleHighlight': { en: 'Effortlessly', zh: '一目了然' },
  'home.subtitle': { en: 'All your work schedules in one place', zh: '一个地方，看所有工作安排' },
  'home.cta': { en: 'Start Free', zh: '免费开始' },
  'home.noCard': { en: 'No credit card required', zh: '无需信用卡' },

  // Calendar
  'calendar.title': { en: 'Calendar', zh: '日历' },
  'calendar.today': { en: 'Today', zh: '今天' },
  'calendar.addShift': { en: 'Add Shift', zh: '添加班次' },
  'calendar.weekTotal': { en: 'Week Total', zh: '本周合计' },
  'calendar.monthTotal': { en: 'Month Total', zh: '本月合计' },
  'calendar.hours': { en: 'hours', zh: '小时' },
  'calendar.mon': { en: 'Mon', zh: '一' },
  'calendar.tue': { en: 'Tue', zh: '二' },
  'calendar.wed': { en: 'Wed', zh: '三' },
  'calendar.thu': { en: 'Thu', zh: '四' },
  'calendar.fri': { en: 'Fri', zh: '五' },
  'calendar.sat': { en: 'Sat', zh: '六' },
  'calendar.sun': { en: 'Sun', zh: '日' },
  'calendar.add': { en: '+ Add', zh: '+ 添加' },

  // Add Shift Modal
  'shift.addTitle': { en: 'Add Shift', zh: '添加班次' },
  'shift.date': { en: 'Date', zh: '日期' },
  'shift.selectOrg': { en: 'Select Organization', zh: '选择公司' },
  'shift.startTime': { en: 'Start Time', zh: '开始时间' },
  'shift.endTime': { en: 'End Time', zh: '结束时间' },
  'shift.duration': { en: 'Duration', zh: '预计时长' },
  'shift.income': { en: 'Est. Income', zh: '预计收入' },
  'shift.cancel': { en: 'Cancel', zh: '取消' },
  'shift.confirm': { en: 'Confirm', zh: '确认添加' },
  'shift.description': { en: 'Description', zh: '备注' },
  'shift.startDate': { en: 'Start Date', zh: '开始日期' },
  'shift.endDate': { en: 'End Date', zh: '结束日期' },
  'shift.nextDay': { en: '(Next Day)', zh: '(次日)' },
  'shift.toNextDay': { en: 'Next Day', zh: '次日' },
  'shift.edit': { en: 'Edit', zh: '编辑' },
  'shift.delete': { en: 'Delete', zh: '删除' },
  'shift.deleteConfirm': { en: 'Are you sure you want to delete this shift?', zh: '确定要删除这个班次吗？' },

  // View Modes
  'calendar.viewMonth': { en: 'Month', zh: '月' },
  'calendar.viewWeek': { en: 'Week', zh: '周' },

  // Analytics
  'analytics.title': { en: 'Analytics', zh: '数据分析' },
  'analytics.subtitle': { en: 'Track your work hours and earnings', zh: '追踪工时和收入' },
  'analytics.thisWeek': { en: 'This Week', zh: '本周' },
  'analytics.thisMonth': { en: 'This Month', zh: '本月' },
  'analytics.financialYear': { en: 'Financial Year', zh: '财年' },
  'analytics.totalHours': { en: 'Total Hours', zh: '总工时' },
  'analytics.totalShifts': { en: 'Total Shifts', zh: '总班次' },
  'analytics.avgHoursWeek': { en: 'Avg Hours/Week', zh: '周均工时' },
  'analytics.avgEarningMonth': { en: 'Avg Earning/Month', zh: '月均收入' },
  'analytics.organizations': { en: 'Organizations', zh: '公司数量' },
  'analytics.activeWorkplaces': { en: 'Active workplaces', zh: '活跃工作场所' },
  'analytics.hoursByOrg': { en: 'Hours by Organization', zh: '按公司统计工时' },
  'analytics.fyTitle': { en: 'Financial Year Summary', zh: '财年总结' },
  'analytics.exportReport': { en: 'Export Report', zh: '导出报告' },
  'analytics.monthlyTrend': { en: 'Monthly Hours Trend', zh: '月度工时趋势' },
  'analytics.detailedBreakdown': { en: 'Detailed Breakdown', zh: '详细分类' },
  'analytics.exportCSV': { en: 'Export CSV', zh: '导出 CSV' },
  'analytics.basedOnWeeks': { en: 'Current period', zh: '当前周期' },
  'analytics.totalThisMonth': { en: 'Total this month', zh: '本月合计' },
  'analytics.hours': { en: 'hours', zh: '小时' },
  'analytics.shifts': { en: 'shifts', zh: '班次' },
  'analytics.fy': { en: 'FY 2024-2025', zh: '财年 2024-2025' },
  'analytics.avgHrsWeek': { en: 'Avg Hrs/Week', zh: '周均工时' },
  'analytics.organization': { en: 'Organization', zh: '公司' },
  'analytics.percentTotal': { en: '% of Total', zh: '占比' },
  'analytics.total': { en: 'Total', zh: '合计' },

  // Organization Management
  'org.manage': { en: 'Manage Organizations', zh: '公司管理' },
  'org.hourlyRate': { en: 'Hourly Rate', zh: '时薪' },
  'org.perHour': { en: '/hour', zh: '/小时' },
  'org.color': { en: 'Color', zh: '颜色' },
  'org.save': { en: 'Save', zh: '保存' },
  'org.addNew': { en: 'Add New Organization', zh: '添加新公司' },
  'org.name': { en: 'Organization Name', zh: '公司名称' },

  // User Menu
  'user.settings': { en: 'Account Settings', zh: '账户设置' },
  'user.orgs': { en: 'Manage Organizations', zh: '公司管理' },

  // Auth
  'auth.login': { en: 'Log In', zh: '登录' },
  'auth.signup': { en: 'Sign Up', zh: '注册' },
  'auth.email': { en: 'Email', zh: '邮箱' },
  'auth.password': { en: 'Password', zh: '密码' },
  'auth.confirmPassword': { en: 'Confirm Password', zh: '确认密码' },
  'auth.forgotPassword': { en: 'Forgot password?', zh: '忘记密码？' },
  'auth.noAccount': { en: "Don't have an account?", zh: '还没有账户？' },
  'auth.hasAccount': { en: 'Already have an account?', zh: '已有账户？' },
  'auth.signupNow': { en: 'Sign up now', zh: '立即注册' },
  'auth.loginNow': { en: 'Log in now', zh: '立即登录' },
}

interface I18nContextType {
  lang: Language
  setLang: (lang: Language) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>('en')

  const t = useCallback((key: string): string => {
    const translation = translations[key]
    if (!translation) {
      console.warn(`Missing translation for key: ${key}`)
      return key
    }
    return translation[lang]
  }, [lang])

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

export function LanguageSwitch() {
  const { lang, setLang } = useI18n()

  return (
    <div className="lang-switch">
      <button
        className={lang === 'en' ? 'active' : ''}
        onClick={() => setLang('en')}
      >
        EN
      </button>
      <button
        className={lang === 'zh' ? 'active' : ''}
        onClick={() => setLang('zh')}
      >
        中
      </button>
    </div>
  )
}
