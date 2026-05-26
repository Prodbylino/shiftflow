# TimesheetAI iOS App — Implementation Plan

## Context

TimesheetAI web MVP (Next.js 16 + Supabase) is deployed and running on Vercel. The goal is to create a native iOS app that shares business logic with the web version, passes App Store review reliably, and supports a commercial SaaS model with cross-platform subscriptions in the future.

## Recommended Approach: Expo (React Native) + Turborepo Monorepo

**Why Expo + monorepo wins over alternatives:**
- **vs Capacitor**: Apple rejects WebView-wrapper apps under Guideline 4.2; too risky for commercial SaaS
- **vs PWA**: No App Store presence, limited iOS capabilities, doesn't meet the "iOS app" requirement
- **vs Separate Expo project**: Code drift makes simultaneous iteration impossible within weeks
- **Expo Router** gives file-based routing nearly identical to Next.js App Router — minimal mental model shift

**What can be shared (~40% of codebase):**
- `types/database.ts` — 100% as-is
- i18n translation strings — 100% as-is
- Business logic hooks (useShifts, useOrganizations, useAuth, useAnalytics, useProfile) — after removing `window`/`localStorage`/DOM dependencies
- Supabase client — via a platform-adaptive factory
- Utility functions (date formatting, shift calculations)

**What must be rewritten (UI layer):**
- Calendar view (MonthCalendar.tsx 815 lines → `react-native-calendars` or custom grid)
- All modals → bottom sheets (`@gorhom/bottom-sheet`)
- Sidebar → tab navigator (Expo Router tabs)
- Analytics charts → `victory-native` (recharts is web-only)
- All shadcn/ui components → React Native equivalents
- Auth screens → React Native TextInput/TouchableOpacity

---

## Deployment Architecture

```
Web app (Next.js)          iOS app (Expo/React Native)
    │                              │
    ├─ Deployed on Vercel          ├─ Built via Expo EAS → App Store
    ├─ Users access via browser    ├─ Users download from App Store
    │                              │
    └──────── Same Supabase database ────────┘
              (auth, PostgreSQL, Edge Functions)
```

---

## Monorepo Structure

```
shift-planner/                    # repo root
├── turbo.json
├── pnpm-workspace.yaml
├── apps/
│   ├── web/                      # existing Next.js app (moved here)
│   └── mobile/                   # new Expo app
│       ├── app/                  # Expo Router (file-based)
│       │   ├── (auth)/           # login, signup, forgot-password
│       │   ├── (tabs)/           # dashboard, organizations, analytics, settings
│       │   └── _layout.tsx
│       ├── components/           # mobile-only UI
│       └── eas.json              # EAS Build config
├── packages/
│   └── shared/                   # cross-platform business logic
│       └── src/
│           ├── types/database.ts
│           ├── hooks/            # platform-agnostic hooks
│           ├── supabase/         # client factory + operations
│           ├── i18n/translations.ts
│           ├── utils/            # date, shift-calculations
│           └── adapters/         # StorageAdapter, NavigationAdapter interfaces
└── supabase/                     # shared infrastructure (stays at root)
```

---

## Implementation Phases

### Phase 0: Monorepo Migration -- DONE (2026-04-03)
- Turborepo + pnpm workspace initialized
- Next.js app moved to `apps/web/`
- `packages/shared/` created (database types + i18n translations)
- `apps/web/` re-exports from shared; `pnpm build` passes
- **What happened to database.ts**: full 322-line file was COPIED to `packages/shared/src/types/database.ts`. The `apps/web/src/types/database.ts` was replaced with a 2-line re-export (`export * from '@timesheetai/shared/types'`). All existing imports in web app still work unchanged.

### Phase 1: Refactor Hooks for Platform Independence (3-4 days)
- Create `StorageAdapter` interface (localStorage on web, AsyncStorage on mobile)
- Create `NavigationAdapter` interface (router.push on web, expo-router on mobile)
- Refactor all hooks: remove `window.*`, `localStorage`, `DOMException`, `document.*` references
- Remove `'use client'` from shared code (re-export with directive in web app)
- Create Supabase client factory accepting storage adapter
- **Critical files:**
  - `apps/web/src/lib/hooks/useShifts.ts` (537 lines, heaviest refactor)
  - `apps/web/src/lib/hooks/useAuth.ts` (257 lines, DOM event listeners for inactivity)
  - `apps/web/src/lib/supabase/client.ts` (platform-specific storage)
  - `apps/web/src/lib/supabase/operations.ts` (remove window.* prefixes)

### Phase 2: Expo Project Scaffold (2-3 days)
1. `npx create-expo-app apps/mobile --template tabs`
2. Configure `app.json` (bundle ID: `com.timesheetai.app`)
3. Set up Expo Router tabs: Dashboard, Organizations, Analytics, Settings
4. Install: `@supabase/supabase-js`, `@react-native-async-storage/async-storage`, `expo-secure-store`, `expo-notifications`
5. Wire shared hooks → verify data loads from Supabase
6. Set up EAS Build profiles (dev, preview, production)

### Phase 3: Auth Screens (2-3 days)
- Login, signup, forgot-password screens (React Native forms)
- Supabase email/password auth (using `@supabase/supabase-js` directly, not `@supabase/ssr`)
- Deep linking for password reset

### Phase 4: Calendar/Dashboard UI (5-7 days) **[Hardest part]**
- Month calendar: `react-native-calendars` or custom `View` grid
- Week calendar view
- Add Shift bottom sheet (`@gorhom/bottom-sheet`)
- Edit Shift modal
- Long-press/swipe actions (replaces right-click context menu)
- Organization color badges, time formatting (reuse shared utils)

### Phase 5: Organizations, Analytics, Settings (4-5 days)
- Organizations: `FlatList`, inline edit, color picker, add form
- Analytics: `victory-native` charts, shared data-fetching from `useAnalytics`
- Settings: profile editing, notification preferences, `expo-notifications` permission

### Phase 6: Push Notifications (2-3 days)
- Configure APNs in Expo/EAS
- `expo-notifications` token registration → new `push_tokens` table in Supabase
- Modify or create Edge Function to send push via Expo Push service
- In-app notification handling

### Phase 7: Payments (5-7 days) — **deferred, 1-3 months post-launch**
- **iOS**: RevenueCat SDK (`react-native-purchases`) wrapping StoreKit 2
- **Web**: Stripe Billing/Checkout
- **Backend**: Unified `subscriptions` table, Edge Functions for both webhooks
- **Shared**: `useSubscription` hook for entitlement checks
- Apple Small Business Program (15% instead of 30%)
- Not included in initial release — add after gaining initial users

### Phase 8: App Store Submission (2-3 days)
- App icon, splash screen, screenshots
- App Store Connect listing
- `eas build --platform ios --profile production`
- `eas submit --platform ios`
- TestFlight beta first, then production review

---

## Key Risks & Gotchas

| Risk | Mitigation |
|------|-----------|
| Supabase auth differs: web uses `@supabase/ssr` (cookies), mobile uses `@supabase/supabase-js` (AsyncStorage) | Platform-adaptive client factory in shared package |
| `window`/DOM refs in hooks crash React Native | Phase 1 refactor with adapter pattern; grep for all `window.` and `document.` before moving |
| Calendar rewrite is the biggest effort (815 lines) | Evaluate `react-native-calendars` first; fallback to custom grid |
| Phone verification API routes are Next.js-specific | Migrate to Supabase Edge Functions for platform independence |
| Expo SDK + React 19 compatibility | Verify Expo SDK 53 supports React 19 before starting |
| Apple IAP compliance: cannot link to Stripe from iOS | RevenueCat handles IAP on iOS; Stripe on web only |
| `react-big-calendar` and `recharts` are web-only | Use `react-native-calendars` and `victory-native` on mobile |

## Verification Plan

1. **After Phase 0**: `cd apps/web && pnpm build && pnpm dev` — web still works
2. **After Phase 1**: Web app works with refactored shared hooks; run existing features end-to-end
3. **After Phase 2**: `cd apps/mobile && npx expo start` — app boots, data loads from Supabase
4. **After Phase 3**: Full auth flow works on iOS simulator
5. **After Phase 4-5**: All CRUD operations work on mobile
6. **After Phase 6**: Push notification received on physical device
7. **After Phase 8**: TestFlight build installs and functions correctly

## Estimated Total Effort

**27-38 days** for a single developer (Phases 0-6, 8). Phase 7 (payments) deferred to 1-3 months post-launch, adds 5-7 days when ready.

## Key Decisions

- **Apple Developer account**: Not yet registered — should do this ASAP ($99/year), approval takes 1-2 days
- **Platform**: iOS only first, architecture supports adding Android later via Expo
- **Payments**: Not in initial release; add 1-3 months post-launch. No need to pre-build subscriptions table, but keep hook architecture extensible

## Prerequisites

- **Register Apple Developer account** ($99/year USD) — approval takes 1-2 days, required for TestFlight and App Store
- Physical iOS device for testing push notifications (simulator doesn't support APNs)
- Decide bundle ID and app name early (hard to change after first submission)
- Xcode installed (required for iOS simulator and EAS local builds)
