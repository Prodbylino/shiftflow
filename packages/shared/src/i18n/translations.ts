export type Language = 'en' | 'zh'

export interface TranslationEntry {
  en: string
  zh: string
}

export interface Translations {
  [key: string]: TranslationEntry
}

export const translations: Translations = {
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
  'org.created': { en: 'Workplace added', zh: '工作单位已添加' },
  'org.updated': { en: 'Workplace updated', zh: '工作单位已更新' },
  'org.deleted': { en: 'Workplace deleted', zh: '工作单位已删除' },
  'org.updateFailed': { en: 'Could not update workplace', zh: '更新工作单位失败' },
  'org.deleteFailed': { en: 'Could not delete workplace', zh: '删除工作单位失败' },

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

  // ── Mobile app ──────────────────────────────────────────────

  // Tab bar
  'tabs.dashboard': { en: 'Dashboard', zh: '日历' },
  'tabs.workplaces': { en: 'Workplaces', zh: '工作单位' },
  'tabs.analytics': { en: 'Analytics', zh: '数据分析' },
  'tabs.settings': { en: 'Settings', zh: '设置' },

  // Common
  'common.cancel': { en: 'Cancel', zh: '取消' },
  'common.delete': { en: 'Delete', zh: '删除' },
  'common.loading': { en: 'Loading…', zh: '加载中…' },
  'common.deleteTitle': { en: 'Delete?', zh: '确定删除？' },
  'common.deleteMessage': { en: 'This cannot be undone.', zh: '此操作无法撤销。' },

  // Dashboard
  'dash.tomorrow': { en: 'Tomorrow', zh: '明天' },
  'dash.shift': { en: 'shift', zh: '个班次' },
  'dash.shifts': { en: 'shifts', zh: '个班次' },
  'dash.noShifts': { en: 'No shifts on this day', zh: '这天没有班次' },
  'dash.noWorkplaces': { en: 'No workplaces yet', zh: '还没有工作单位' },
  'dash.tapToAddShift': { en: 'Tap + to add one', zh: '点 + 添加一个' },
  'dash.tapToAddWorkplace': {
    en: 'Tap + to add your first workplace',
    zh: '点 + 添加第一个工作单位',
  },

  // Analytics (mobile)
  'analytics.earnedThisMonth': { en: 'Earned this month', zh: '本月收入' },
  'analytics.vsLastMonth': { en: 'vs last month', zh: '对比上月' },
  'analytics.noLastMonth': { en: 'No data for last month', zh: '上月暂无数据' },
  'analytics.last30Days': { en: 'Last 30 days', zh: '最近 30 天' },
  'analytics.breakdown': { en: 'Breakdown', zh: '明细' },
  'analytics.avgShift': { en: 'Average shift', zh: '平均班次时长' },
  'analytics.shiftsWorked': { en: 'Shifts worked', zh: '班次数' },
  'analytics.peakDay': { en: 'Peak day', zh: '最高单日' },
  'analytics.daysAgoSuffix': { en: 'd ago', zh: ' 天前' },

  // Workplaces
  'wk.title': { en: 'Workplaces', zh: '工作单位' },
  'wk.active': { en: 'active', zh: '个使用中' },
  'wk.addFirstTitle': { en: 'Add your first workplace', zh: '添加你的第一个工作单位' },
  'wk.addFirstHint': {
    en: 'Workplaces hold the hourly rate and color used across the calendar',
    zh: '工作单位保存时薪和日历中显示的颜色',
  },
  'wk.add': { en: 'Add workplace', zh: '添加工作单位' },
  'wk.new': { en: 'New workplace', zh: '新建工作单位' },
  'wk.edit': { en: 'Edit workplace', zh: '编辑工作单位' },
  'wk.detail': { en: 'Workplace', zh: '工作单位' },
  'wk.notFound': { en: 'Workplace not found', zh: '找不到该工作单位' },
  'wk.name': { en: 'Name', zh: '名称' },
  'wk.namePlaceholder': { en: 'e.g. Coffee Bean', zh: '例如：咖啡店' },
  'wk.hourlyRate': { en: 'Hourly rate', zh: '时薪' },
  'wk.color': { en: 'Color', zh: '颜色' },
  'wk.save': { en: 'Save workplace', zh: '保存工作单位' },
  'wk.saveChanges': { en: 'Save changes', zh: '保存修改' },
  'wk.delete': { en: 'Delete workplace', zh: '删除工作单位' },
  'wk.deleteTitle': { en: 'Delete workplace?', zh: '删除工作单位？' },
  'wk.deleteMessage': {
    en: 'Existing shifts at this workplace will also be removed.',
    zh: '该工作单位下已有的班次也会被一并删除。',
  },
  'wk.nameRequired': { en: 'Name is required', zh: '请输入名称' },
  'wk.rateInvalid': { en: 'Enter a valid hourly rate', zh: '请输入有效时薪' },
  'wk.couldNotSave': { en: 'Could not save workplace', zh: '保存工作单位失败' },
  'wk.couldNotSaveChanges': { en: 'Could not save changes', zh: '保存修改失败' },
  'wk.couldNotDelete': { en: 'Could not delete workplace', zh: '删除工作单位失败' },

  // Shift form (mobile)
  'shift.new': { en: 'New shift', zh: '新建班次' },
  'shift.editTitle': { en: 'Edit shift', zh: '编辑班次' },
  'shift.detail': { en: 'Shift', zh: '班次' },
  'shift.notFound': { en: 'Shift not found', zh: '找不到该班次' },
  'shift.workplace': { en: 'Workplace', zh: '工作单位' },
  'shift.addWorkplaceFirst': { en: 'Add a workplace first', zh: '请先添加工作单位' },
  'shift.overnight': { en: 'Overnight', zh: '跨夜班' },
  'shift.overnightHint': { en: 'Ends the following day', zh: '次日结束' },
  'shift.notes': { en: 'Notes (optional)', zh: '备注（可选）' },
  'shift.notesPlaceholder': { en: 'Anything to remember', zh: '想记的都可以写' },
  'shift.save': { en: 'Save shift', zh: '保存班次' },
  'shift.saveChanges': { en: 'Save changes', zh: '保存修改' },
  'shift.deleteShift': { en: 'Delete shift', zh: '删除班次' },
  'shift.deleteTitle': { en: 'Delete shift?', zh: '删除班次？' },
  'shift.deleteMessage': { en: 'This cannot be undone.', zh: '此操作无法撤销。' },
  'shift.pickWorkplace': { en: 'Pick a workplace', zh: '请选择工作单位' },
  'shift.couldNotSave': { en: 'Could not save shift', zh: '保存班次失败' },
  'shift.couldNotSaveChanges': { en: 'Could not save changes', zh: '保存修改失败' },
  'shift.couldNotDelete': { en: 'Could not delete shift', zh: '删除班次失败' },

  // Settings (mobile)
  'settings.title': { en: 'Settings', zh: '设置' },
  'settings.account': { en: 'Account', zh: '账户' },
  'settings.notifications': { en: 'Notifications', zh: '通知' },
  'settings.preferences': { en: 'Preferences', zh: '偏好设置' },
  'settings.smsReminders': { en: 'SMS reminders', zh: '短信提醒' },
  'settings.voiceCalls': { en: 'Voice calls', zh: '语音电话提醒' },
  'settings.reminderTiming': { en: 'Reminder timing', zh: '提醒时间' },
  'settings.language': { en: 'Language', zh: '语言' },
  'settings.signOut': { en: 'Sign out', zh: '退出登录' },
  'settings.deleteAccount': { en: 'Delete account', zh: '删除账号' },
  'settings.deleteAccountTitle': { en: 'Delete account?', zh: '删除账号？' },
  'settings.deleteAccountMessage': {
    en: 'This permanently deletes your account and all your shifts and workplaces. This cannot be undone.',
    zh: '将永久删除你的账号以及所有班次和工作单位，此操作无法撤销。',
  },
  'settings.deleteAccountFailed': {
    en: 'Could not delete your account. Please try again.',
    zh: '删除账号失败，请重试。',
  },
  'settings.signOutTitle': { en: 'Sign out?', zh: '退出登录？' },
  'settings.signOutMessage': {
    en: 'You will need to sign in again to access your shifts.',
    zh: '退出后需要重新登录才能查看班次。',
  },
  'settings.phoneRequiredTitle': { en: 'Phone number required', zh: '需要电话号码' },
  'settings.phoneRequiredMessage': {
    en: 'Add a phone number in Profile before enabling reminders.',
    zh: '请先在个人资料中添加电话号码，再开启提醒。',
  },
  'settings.openProfile': { en: 'Open Profile', zh: '打开个人资料' },
  'settings.reminder5': { en: '5 minutes before', zh: '提前 5 分钟' },
  'settings.reminder15': { en: '15 minutes before', zh: '提前 15 分钟' },
  'settings.reminder30': { en: '30 minutes before', zh: '提前 30 分钟' },
  'settings.reminder60': { en: '1 hour before', zh: '提前 1 小时' },
  'settings.reminder120': { en: '2 hours before', zh: '提前 2 小时' },

  // Profile (mobile)
  'profile.title': { en: 'Profile', zh: '个人资料' },
  'profile.fullName': { en: 'Full name', zh: '姓名' },
  'profile.namePlaceholder': { en: 'Your name', zh: '你的名字' },
  'profile.phone': { en: 'Phone number', zh: '电话号码' },
  'profile.verified': { en: 'Verified', zh: '已验证' },
  'profile.verifyComingSoon': {
    en: 'Verification flow coming soon — saves the number for now',
    zh: '验证功能即将上线，目前先保存号码',
  },
  'profile.save': { en: 'Save profile', zh: '保存个人资料' },
  'profile.couldNotSave': { en: 'Could not save profile', zh: '保存个人资料失败' },
  'profile.verifyToRemind': {
    en: 'Verify your number to receive shift reminders',
    zh: '验证号码后才能收到班次提醒',
  },
  'profile.sendCode': { en: 'Send code', zh: '发送验证码' },
  'profile.resend': { en: 'Resend', zh: '重新发送' },
  'profile.enterCode': { en: 'Enter the 6-digit code', zh: '输入 6 位验证码' },
  'profile.verify': { en: 'Verify', zh: '验证' },
  'profile.invalidPhone': {
    en: 'Enter a valid Australian mobile number',
    zh: '请输入有效的澳洲手机号',
  },
  'profile.codeFormat': { en: 'Enter the 6-digit code', zh: '请输入 6 位验证码' },
  'profile.sendFailed': { en: 'Could not send the code. Try again.', zh: '验证码发送失败，请重试' },
  'profile.wrongCode': { en: 'Incorrect or expired code', zh: '验证码错误或已过期' },

  // Auth (mobile)
  'auth.welcomeBack': { en: 'Welcome back', zh: '欢迎回来' },
  'auth.signInToContinue': { en: 'Sign in to continue', zh: '登录以继续' },
  'auth.signIn': { en: 'Sign in', zh: '登录' },
  'auth.signUpAction': { en: 'Sign up', zh: '注册' },
  'auth.createAccount': { en: 'Create account', zh: '创建账户' },
  'auth.signupTagline': { en: 'Track shifts across all your jobs', zh: '追踪你所有工作的班次' },
  'auth.passwordMin': { en: 'At least 6 characters', zh: '至少 6 个字符' },
  'auth.checkEmailConfirm': {
    en: 'Check your email for a confirmation link.',
    zh: '请查收邮箱中的确认链接。',
  },
  'auth.resetTitle': { en: 'Reset password', zh: '重置密码' },
  'auth.resetSubtitle': { en: "We'll email you a reset link", zh: '我们会把重置链接发到你的邮箱' },
  'auth.checkEmailReset': {
    en: 'Check your email for the reset link.',
    zh: '请查收邮箱中的重置链接。',
  },
  'auth.sendResetLink': { en: 'Send reset link', zh: '发送重置链接' },
  'auth.backToSignIn': { en: 'Back to sign in', zh: '返回登录' },
}

export function translate(key: string, lang: Language): string {
  const entry = translations[key]
  if (!entry) {
    console.warn(`Missing translation for key: ${key}`)
    return key
  }
  return entry[lang]
}
