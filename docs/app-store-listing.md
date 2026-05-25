# App Store Connect Listing Copy

All copy below targets App Store Connect submission for **TimesheetAI** (`com.timesheetai.app`). Character counts include the actual limits enforced by App Store Connect.

---

## App Name (30 chars max)

```
TimesheetAI
```

11 characters. Reserves the search hit for the exact word.

## Subtitle (30 chars max)

Pick one when listing:

| Subtitle | Chars | Vibe |
|---|---|---|
| **Multi-job shift planner** | 23 | Functional, clear |
| Shifts, hours, reminders | 24 | Feature list |
| Plan shifts across jobs | 23 | Action |
| AI shift tracking | 17 | AI-positioned |

Recommended: **"Multi-job shift planner"** — describes the differentiated use case in plain English, no jargon.

## Promotional Text (170 chars, can change without re-review)

```
Track shifts across every job in one calendar. Voice-add a shift in seconds, get an SMS reminder before each one, and see exactly what you'll earn this month.
```

158 chars. Showcases the three pillars: calendar, voice/AI input, reminders + earnings.

## Description (4000 chars max)

```
TimesheetAI is the calendar for people who work more than one job.

Whether you bartend three nights a week, tutor on weekends, drive on rideshare apps, or pick up shifts at a hospital, TimesheetAI keeps every job in one place — with hours, pay, and reminders built in.

WHY TIMESHEETAI

• One calendar for every job
  See all your shifts color-coded by workplace on a single month view. No more juggling four employer apps or a paper notebook.

• Track hours and pay automatically
  Set your hourly rate per workplace once. TimesheetAI computes your earnings for the day, week, and month — including overnight shifts that cross midnight.

• Never miss a shift
  Get an SMS reminder, or a voice call, before each shift. Choose the timing (5, 15, 30, 60, or 120 minutes ahead). We use your phone number only for these reminders — never for marketing.

• Designed for clarity
  Minimalist interface inspired by Linear and Notion. Tap a day to see the shifts; left-swipe to delete; pull-to-refresh; native iOS pickers for date and time.

• Cross-device by design
  Sign in on your iPhone, your iPad, and the web. Your shifts stay in sync.

HOW IT WORKS

1. Add your workplaces — name them, set the hourly rate, pick a color.
2. Add shifts — pick a date, set start and end times, the app calculates hours and pay.
3. Turn on reminders if you want SMS or voice calls before each shift.
4. Open Analytics any time to see how much you've worked and earned.

PRIVACY FIRST

We don't run ads. We don't track you across other apps. We don't sell your data. Your shifts and earnings stay between you and TimesheetAI. See our privacy policy at https://timesheetai.vercel.app/privacy.

WHO IS THIS FOR

• Hospitality workers (bartenders, baristas, servers, cooks)
• Healthcare staff (nurses, techs, hospital shifts)
• Educators and tutors with multiple clients
• Rideshare and delivery drivers tracking active hours
• Anyone with more than one source of work hours

TIMESHEETAI IS FREE

The core app — unlimited workplaces, unlimited shifts, calendar, analytics — is free. SMS and voice reminders are included.

QUESTIONS OR FEEDBACK

Email support@timesheetai.app. We read every message.
```

≈ 2,170 chars. Plenty of room left under the 4,000 cap for adding feature paragraphs later.

## Keywords (100 chars max, comma-separated, no leading spaces)

```
shifts,timesheet,schedule,calendar,reminder,hourly,wages,roster,part-time,gig,planner,workplace
```

99 chars. Targets the major search terms in the niche.

> **Note**: Do NOT repeat words already in the App Name or Subtitle — Apple counts those automatically. "shift" / "timesheet" are already in our App Name + subtitle so technically optional here, but including them gives a small redundancy buffer.

---

## App Privacy "Nutrition Label" answers

When App Store Connect asks per-data-type questions, the answers should be:

| Data type | Collected? | Linked to user? | Used for tracking? | Purpose |
|---|---|---|---|---|
| Email address | Yes | Yes | No | App Functionality (auth) |
| Name | Yes (optional) | Yes | No | App Functionality (display) |
| Phone number | Yes (optional) | Yes | No | App Functionality (SMS/voice reminders only) |
| User ID (Supabase) | Yes | Yes | No | App Functionality |
| Other user data (shifts, workplaces) | Yes | Yes | No | App Functionality |
| Diagnostics (crash logs) | Yes (via Apple) | No | No | App Functionality |

Everything else: **No**. We do not collect location, contacts, photos, biometrics, browsing history, or advertising data.

---

## Support URL

```
https://timesheetai.vercel.app/
```

Until a real `/support` page exists, the landing page hosts a `mailto:support@timesheetai.app` link.

## Privacy Policy URL

```
https://timesheetai.vercel.app/privacy
```

Routed by the page added in this PR (`apps/web/src/app/privacy/page.tsx`).

## Marketing URL (optional)

Skip until there is a real marketing page. Apple does not require it.

---

## Categorization

| Field | Value |
|---|---|
| Primary Category | **Productivity** |
| Secondary Category | **Business** (or leave empty) |
| Age Rating | 4+ (no adult content, no user-generated content visible to others) |
| Content Rights | I do not own or have licensed third-party content (we have our own icon + brand) |

---

## Chinese (简体中文) version

The App Store lets you provide localized metadata. Suggested Chinese copy below; switch when filling the simplified-Chinese ("zh-Hans") locale in App Store Connect.

### App Name (中文)

`TimesheetAI`（保持英文，便于跨地区搜索）或 `班次助手 AI` (10 chars, more searchable in Chinese).

Recommended: keep `TimesheetAI` as the App Name in all locales. Brand consistency > local-language SEO.

### Subtitle 中文 (30 chars)

```
多份工作的智能班次助手
```

10 chars. Plenty of room.

### Promotional Text 中文 (170 chars)

```
把所有工作的班次放在一张日历上。一句话语音添加班次，每个班开始前收到短信提醒，并看到这个月真实的收入。
```

49 chars.

### Description 中文 (4000 chars)

```
TimesheetAI 是为同时打多份工的人设计的日历应用。

不管你是兼职咖啡师、医院夜班护士、自由职业家教，还是在多个网约车平台之间切换 —— TimesheetAI 把所有工作的班次集中在一个地方，自动计算工时和工资，并在每个班次开始之前提醒你。

主要功能

• 一张日历看完所有工作
  在月历上用不同颜色显示每个工作单位的班次。再也不用在 4 个公司 App 之间切换。

• 自动算工时算工资
  为每个工作单位设置时薪一次，App 自动算出当天、本周、本月的收入。跨午夜的班次也能正确计算。

• 班次提醒,绝不错过
  在每个班次开始前发短信或拨打电话提醒。可选 5 / 15 / 30 / 60 / 120 分钟提前。你的电话号码仅用于提醒,我们不会做任何营销推送。

• 简洁现代的设计
  采用 Linear / Notion 风格的极简界面。点击某天查看班次,左滑删除,下拉刷新,iOS 原生日期时间选择器。

• 多设备同步
  iPhone、iPad、网页端同一账户登录,班次实时同步。

如何使用

1. 添加工作单位 —— 取名、设置时薪、选颜色
2. 添加班次 —— 选日期、起止时间,App 自动算工时和工资
3. 打开 SMS 或语音提醒(可选)
4. 随时打开"分析"页查看本月的工作情况和收入

隐私优先

我们不投放广告、不做跨 App 追踪、不出售你的数据。你的班次和收入只属于你和 TimesheetAI。隐私政策见 https://timesheetai.vercel.app/privacy。

谁适合用

• 餐饮业(酒保、咖啡师、服务员、厨师)
• 医护工作者(护士、技师、医院夜班)
• 教育和家教工作者(同时服务多个学生)
• 网约车 / 外卖司机(跟踪有效工时)
• 任何同时打多份工的人

完全免费

核心功能 —— 无限工作单位、无限班次、日历、分析 —— 完全免费。短信和语音提醒已包含。

意见反馈

邮件 support@timesheetai.app,我们认真看每一封。
```

约 720 chars。

### Keywords 中文 (100 chars)

```
班次,排班,日历,提醒,工时,时薪,兼职,多份工作,通知,日程,加班,薪资,日程表,工作表
```

约 60 chars,留空间给中文长尾词。

---

## Reviewer demo account (filled at submission time)

```
Email: demo@timesheetai.app
Password: <set in Supabase Auth dashboard>
Notes for reviewer:
  - This is a pre-seeded demo account with 3 sample workplaces and ~20 shifts
    spanning the past month and the next two weeks.
  - SMS / voice reminders are toggled off so reviewing the app does not trigger
    real phone calls. Toggle them on in Settings to test the flow with your own
    phone number if needed.
  - Sign out is available in Settings → Account → Sign out.
```

The actual seed script that populates this account lives at `supabase/seed/demo_data.sql`.
