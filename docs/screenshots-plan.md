# App Store Screenshots Plan

Apple requires screenshots in specific exact pixel dimensions per device class. Below is the capture plan for TimesheetAI's first listing.

---

## Required device sizes

| Device class | Pixel size | Required? | Notes |
|---|---|---|---|
| iPhone 6.9" (e.g. iPhone 16 Pro Max) | **1290 × 2796** | **Yes** | Mandatory baseline since iOS 18. Apple auto-scales these for older iPhones. |
| iPad 13" (e.g. iPad Pro M4) | 2064 × 2752 | If `supportsTablet: true` | Our `app.json` currently has `supportsTablet: true`. Either provide iPad screenshots or set the flag to `false`. |
| Apple Watch | n/a | No | We don't ship a watch app. |
| Mac (catalyst) | n/a | No | We don't ship Catalyst. |

**Recommendation**: For first launch, capture iPhone 16 Pro Max screenshots only and **set `supportsTablet: false` in `app.json`** to skip iPad. Add iPad screenshots later in an update.

---

## Screen capture plan (6 screenshots, in App Store carousel order)

Apple allows 3–10 screenshots. We'll start with 6. Each can have a marketing-style overlay caption at the top with the App screenshot below — a common pattern (see Linear, Notion, Cron App Store pages).

| # | Screen | iOS Simulator setup | Caption (English) | Caption (中文) |
|---|---|---|---|---|
| 1 | **Dashboard with full month calendar** | Demo account signed in; "today" is mid-month with shifts on 6+ different days, each org colored differently | "Every job in one calendar" | "所有工作，一张日历" |
| 2 | **Day detail with multiple shift cards** | Tap a day that has 2 shifts at different workplaces (different org colors) | "See exactly what's next" | "今天有几个班，一目了然" |
| 3 | **Add Shift modal (native picker open)** | Open Add Shift from FAB; tap the date field so the native iOS scroll-wheel picker is mid-spin | "Add a shift in seconds" | "几秒搞定一个班次" |
| 4 | **Workplaces list with 3 colored entries** | Workplaces tab with Coffee Bean / Library / Tutoring rows, color dots visible | "Track every job separately" | "每份工作独立管理" |
| 5 | **Analytics with earnings chart** | Analytics tab; "Earned this month" shows ~$2,000+, chart shows real daily bars | "Know exactly what you'll earn" | "看清这个月赚多少" |
| 6 | **Settings with SMS reminder on** | Settings tab; SMS toggle on, phone verified, reminder timing reads "30 minutes before" | "Never miss a shift" | "再也不会错过班次" |

Optional 7th-10th if you want more:
- Sign-up screen (clean, shows TimesheetAI brand)
- Edit Shift screen (shows overnight toggle)
- Empty-state onboarding card on a fresh account

---

## How to capture on iOS Simulator

You need Xcode installed. From the repo root:

```sh
cd apps/mobile
npx expo run:ios --device "iPhone 16 Pro Max"
```

After the app boots in the simulator:

1. Sign in with the demo account `demo@timesheetai.app` (seed it first using `supabase/seed/demo_data.sql`).
2. Navigate to each screen listed above.
3. Press **⌘S** (or File → New Screen Shot) to save. Simulator drops PNGs to your desktop at exactly 1290 × 2796 px when the iPhone 16 Pro Max device is selected.

If you don't yet have Xcode installed, you can capture from a real iPhone 16 Pro Max via TestFlight build instead; iOS screenshots from a real device are also 1290 × 2796 and acceptable.

---

## Marketing overlay treatment

For each screenshot, add a band at the top with the caption from the table above. Style:

- Background: brand color `#367BFD` for the band area (top ~25% of canvas)
- Text: white, bold, ~80px, centered, two lines max
- Font: Geist or SF Pro Display
- Below the band: white frame around the actual phone screenshot at ~85% scale

Use Figma, Sketch, or Canva to compose. Free tool: **MockuPhone** (mockuphone.com) or **AppMockUp** (app-mockup.com) — paste in the raw iOS Simulator PNG, pick the device frame, export.

---

## Files to ship to App Store Connect

Once captured + composed, save to `apps/web/public/app-store/`:

```
apps/web/public/app-store/
├── ios-6.9/
│   ├── 1-calendar.png      (1290 × 2796)
│   ├── 2-day-detail.png    (1290 × 2796)
│   ├── 3-add-shift.png     (1290 × 2796)
│   ├── 4-workplaces.png    (1290 × 2796)
│   ├── 5-analytics.png     (1290 × 2796)
│   └── 6-settings.png      (1290 × 2796)
```

Upload all six via App Store Connect → Your App → iOS App → Screenshot upload box.

---

## Live App preview video (optional)

Apple allows a 15-30s screen recording in the same locales. **Skip for first launch** — adds a layer of editing complexity. Add later once the app has been in the store a few weeks and you know what to emphasize.
