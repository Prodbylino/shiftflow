# Dev Gotchas Guide — TimesheetAI Project

A field-tested reference of every non-obvious thing this project taught us. Re-use for the next mobile / web / monorepo product. Each entry is a self-contained gotcha: what bit us, why, and how to avoid it next time.

> Generated 2026-05-31 after taking TimesheetAI from "empty `apps/mobile/`" to "OTA-enabled iOS preview build installed on user's iPhone".

---

## 1. Monorepo (Turborepo + pnpm + Expo)

### Lock down `node-linker=hoisted`
- **Why**: Metro can't resolve Expo's transitive peer deps inside pnpm's default isolated `.pnpm/` store. Bundling crashes with cryptic "Unable to resolve module ..." pointing into `.pnpm/...`.
- **How**: One file at repo root: `.npmrc` → `node-linker=hoisted`.

### Pin one React version across the workspace
- **Why**: Mixing Next.js 16 (which prefers React 19.2.x) with Expo SDK 54 (which pins React 19.1.0) ends up with 50+ nested `node_modules/react@19.2.3` copies. Metro resolves React from different paths in different files → two React instances at runtime → `Cannot read property 'useRef' of null` at first hook call.
- **How**: Add to root `package.json`:
  ```json
  "pnpm": { "overrides": { "react": "19.1.0", "react-dom": "19.1.0" } }
  ```
  Then nuke `node_modules` and reinstall.
- **Verify**: `find . -path '*/node_modules/react/package.json' -not -path '*/.pnpm/*' | xargs grep '"version"' | sort -u` should show one non-canary version.

### Metro config for monorepos
- Include workspace root in `watchFolders`, include both project and workspace `node_modules` in `nodeModulesPaths`. Do **not** set `disableHierarchicalLookup: true` under hoisted layout — broke resolution.

---

## 2. Web hosting (Vercel)

### Renaming a project doesn't rename the subdomain
- Vercel's `<project>.vercel.app` subdomain is **NOT** updated when you rename the project. You must explicitly Settings → Domains → Add Domain → type new subdomain.
- Old subdomain keeps working until you Remove it from Domains. Useful for soft cutover; risky for security if subdomain ever gets squatted later.

### `*.vercel.app` is globally unique, not per-account
- Someone else may already hold `<your-brand>.vercel.app`. Always probe first: `curl -sI https://<name>.vercel.app` → 404 = available.

### You can't drop the `.vercel.app` without buying a domain
- The trailing `.vercel.app` is Vercel's own TLD. To get bare `brand.app`, buy the domain (~$15-20/yr at Namecheap/Porkbun/Cloudflare) and add as custom domain.

---

## 3. Supabase

### Anon key + project URL are public — safe to commit
- The `EXPO_PUBLIC_SUPABASE_*` and `NEXT_PUBLIC_SUPABASE_*` values are designed to ship in client-side bundles. Treat them like API base URLs.
- **Never commit** the `service_role` key — that's the admin bypass for RLS.

### Plus-addressing works for email signups
- `you+demo@icloud.com` delivers into `you@icloud.com`'s inbox but Supabase treats it as a distinct account. Useful for test users without registering new emails.

### Custom-domain emails fail validation unless DNS resolves
- Tried `demo@timesheetai.app` (we never bought the domain) → Supabase rejected as "email_address_invalid" because the MX/A records don't exist. Use a real domain or +alias.

### Site URL + Redirect URLs need wildcards
- After a confirmation email link is clicked, Supabase appends `?token=...&type=signup` to the Site URL. Without `**` in Redirect URLs, the redirect is rejected and the user lands on a broken page. Configure:
  - Site URL: `https://<your-prod-host>` (no wildcards allowed here)
  - Redirect URLs (multiple rows):
    - `https://<your-prod-host>/**`
    - `http://localhost:3000/**` (dev)
    - `<scheme>://**` (mobile deep link)

### Email templates live in the Supabase Dashboard, not in code
- Rebranding the auth emails after a rename requires manual Cmd+F replace in each of 4 templates: Confirm signup / Magic Link / Reset Password / Invite User.
- No CLI for this unless you use the Supabase Management API with a Personal Access Token.

### `translate(key, lang)` returning the key on miss kills `t('x') || 'fallback'`
- The shared package's `translate()` returns the key string itself when an entry is missing. The "safety net" `t('x') || 'Default'` therefore **never fires** — `'x'` is truthy.
- Two paths to safety: (a) define every key, or (b) refactor translate() to return `null` on miss. We picked (a) for now; (b) is a one-line change for the next i18n pass.

---

## 4. Mobile / Expo / EAS

### `.env` files are not bundled into EAS builds
- Local `apps/mobile/.env` is gitignored and only read by Expo CLI in dev. EAS Build runs in a cloud machine that doesn't see it.
- **Result**: `process.env.EXPO_PUBLIC_SUPABASE_URL` is undefined in the production binary → top-level "Missing env vars" guard throws → app crashes on launch.
- **Fix**: Put the values in `eas.json` under each profile's `env` block, OR use `eas env:create` / EAS dashboard secrets for sensitive ones. Public anon keys go in `env`; service keys go in Secrets.

### Apple ID password is NOT Expo password
- Two separate accounts. Don't reuse passwords. Apple ID was created when the user first signed into iCloud; Expo account was created at expo.dev/signup. EAS will prompt for the Apple ID password the first time you build for iOS — that's the one that protects your Developer Program enrollment.

### First EAS iOS build needs interactive Apple flow
- EAS CLI's `--non-interactive` mode fails when no credentials are stored yet because it has to log in to Apple and run 2FA. Run the **first** `eas build --platform ios --profile preview` in your interactive terminal.
- After that, certs and provisioning profiles are stored on EAS servers. Subsequent builds (including yours from other terminals or CI) can use `--non-interactive` freely.

### iOS device must be UDID-registered for ad-hoc (preview) builds
- "Internal distribution" iOS builds are signed with an ad-hoc provisioning profile that names specific device UDIDs. Without your phone's UDID on the profile, the build refuses to install.
- EAS handles registration in a guided flow: it gives you a URL; you open it on the iPhone in Safari; you install a tiny "expo-dev-client" profile; the UDID auto-uploads back to EAS.
- iOS 17+ adds a **1-hour Security Delay** before you can install profiles when Stolen Device Protection is on. Plan around it.

### iOS 16+ requires Developer Mode for non-App-Store apps
- After installing your ad-hoc build for the first time, iOS shows "Developer Mode Required". Toggle it on at Settings → Privacy & Security → Developer Mode → restart iPhone → confirm at startup. One-time setup; only affects sideloaded apps.

### `eas submit` and `eas update` are free; `eas build` burns credit
- 30 builds/month on free tier (iOS + Android combined). `eas submit` (upload an existing .ipa to App Store Connect) and `eas update` (publish a new JS bundle to the CDN) **don't** count.

### Bundle ID must be pre-registered before App Store Connect lets you create the listing
- App Store Connect's "New App" form requires a Bundle ID. It must already exist at https://developer.apple.com/account/resources/identifiers/list → "+" → App ID → explicit → `com.your.app`. Capabilities tab: tick **nothing** initially; add later when really needed.

### `usesNonExemptEncryption: false` saves you the encryption prompt on every submission
- Set it in `app.json` under `ios.config.usesNonExemptEncryption`. We use only standard HTTPS, which is exempt.

---

## 5. OTA updates (expo-updates)

### Why one more build is needed to "unlock" free OTA
- `expo-updates` is itself a native module — it must be compiled into the app binary so it can check the CDN at launch. You can't ship an existing binary that "didn't include it" and expect it to start receiving OTA.
- Workflow once compiled in: change a `.tsx` → `git push` → `eas update --branch <channel>` → on next cold start the app fetches the new JS bundle.
- Caveat: native changes (app icon, plugins, permissions, SDK upgrades) **still** require a new build. OTA only swaps JS.

### `runtimeVersion.policy` controls which builds receive which updates
- `appVersion` (we use this): bundle is compatible with any install at the same `version` string in `app.json`. Bump `version` when you ship native changes; OTA users on older versions don't get the new bundle.
- `fingerprint` (newer Expo): auto-detects native vs JS change; rev when needed. Slightly more magical, slightly more surprising.

### `channel` per profile maps build → update branch
- In `eas.json`, set `channel: "preview"` under the preview profile and `channel: "production"` under production. Then `eas update --branch preview` reaches preview installs only; production updates leave preview alone.

### Verify OTA works before relying on it
- After the first OTA-enabled build is installed:
  1. Change one harmless string in a `.tsx` file
  2. Push and `eas update --branch preview`
  3. Force-quit the app on the phone (swipe up to fully kill, not just background)
  4. Reopen — first 1-2s the launcher fetches the new bundle, then renders the change
- If the change doesn't appear, check `eas update:list` matches your branch and runtimeVersion lines up.

---

## 6. App Store name research

### Names that "look" available aren't always
- Pixnbit Inc. already had "ShiftFlow: Track Team Hours" with 1,999 reviews. Apple won't allow us to register the same App Name on the same store.
- Variants like "ShiftPilot" (also taken), "ShiftSync" (5 abandoned competitor listings), and "OnShift" (real B2B company with trademark) carry different flavors of risk.

### Probe the App Store programmatically before falling in love with a name
```bash
curl -s "https://itunes.apple.com/search?term=YourName&country=us&entity=software&limit=15" | python3 -m json.tool
```
- Look for `trackName` exact matches → blocked.
- "Similar names" with 0 reviews can mean dormant squatters, less of a real threat.
- Also check `.com` / `.app` domain availability and GitHub user/org squatters.

### Workday job-posting (and many SPAs) have a JSON API hiding inside
- Workday URLs like `cabrini.wd3.myworkdayjobs.com/...` are SPAs that don't render server-side. WebFetch sees blank pages.
- The JSON API endpoint pattern is `https://<tenant>.wd3.myworkdayjobs.com/wday/cxs/<tenant>/<site>/job/<requisitionPath>` — returns full structured data including job description HTML.

---

## 7. React Native patterns

### `width: '${100/7}%'` + `flexWrap: 'wrap'` is brittle
- Calendar bug: each row showed only 6 of 7 columns because floating-point percentage rounded slightly over 100%, wrapping the 7th cell. Headers using `flex: 1` were exact; only the cell grid was off — that asymmetry made the bug confusing.
- **Robust pattern**: split a fixed-count grid into rows manually, each row a `flexDirection: 'row'` container, each child `flex: 1`. No rounding involved.

### Controlled inputs + auto-save = keystroke race
- Workplace edit bug: typing "Studying" quickly into a name input came out as "Studyig". The `value={server.field}` + `onChange → mutate → refetch` cycle re-rendered with stale state mid-typing, dropping characters.
- **Robust pattern**: row component holds its own `useState` for the input draft, commits on `onBlur` (or `onKeyDown: Enter`). Color pickers and toggles (single discrete click) can stay eager.

### Silent autosave + success toast = spam
- Every keystroke fired a "Workplace updated" toast. Three field edits, three toasts.
- **Rule of thumb**: error toasts always fire; success toasts only on user-initiated discrete actions (Add, Delete, Save). Inline edits should save silently.

### React Native charts: roll your own before reaching for Skia
- Tried `victory-native` (v41+ requires `@shopify/react-native-skia`). Skia's `useFont(require(...))` returned `null` in Expo Go on first render → component called `Skia.Picture.MakePicture(null)` → red-screen.
- Ended up with a 90-line pure-RN bar chart (`View` per bar with computed height). Zero deps, matches design system, ships fast.

---

## 8. PR / Git workflow

### Don't push follow-up commits to a merged PR's branch
- Once a PR is merged via GitHub UI, the branch is "orphaned" from the user's review queue. Pushing extra commits there means the user can't find them — there's no open PR pointing at the branch.
- **Fix**: cherry-pick the stuck commits onto a fresh branch from main, open a new PR. We had to do this for PR #10 (recovering PR #9's content) and PR #12 (toast removal that arrived after PR #11 was merged).

### PR base mistakes can orphan whole feature sets
- PR #9 was opened with `--base chore/rebrand-to-timesheetai`. When PR #8 (rebrand) merged to main first, PR #9 then "merged" into a now-orphan rebrand branch — its content never reached main. Lost 30 minutes recovering via cherry-pick.
- **Fix**: default to `--base main` unless you genuinely intend a stacked merge AND have a clear plan for the merge sequence. Call out stacking explicitly in the PR description.

### Sync after merge
- Standard cleanup loop: `git checkout main && git pull && git branch -d <merged-branch>`. The remote auto-deletes; the local hangs around until you sweep.

### Long-lived branches drift fast
- A `chore/apple-developer-setup` branch from before mobile code existed sat around for weeks. By the time we wanted its content, main had moved 7 PRs ahead and the branch was useless without a rebase. Better to rebase early and often, or just close and re-open from current main.

---

## 9. Naming & branding

### Don't pick a name without a 5-channel availability check
- Always check before committing: App Store (exact + similar), GitHub user/org, npm package, `.com` / `.app` domain, Vercel subdomain, X handle if marketing matters.
- Squatters often hold `.com` and the GitHub username with zero activity. Not blockers, but you lose the obvious URL.

### Brand updates touch ~40 files
- Renaming ShiftFlow → TimesheetAI touched 43 files: monorepo packages (`@shiftflow/*` → `@timesheetai/*`), bundle id (`com.shiftflow.app` → `com.timesheetai.app`), display strings, localStorage keys, README, supabase Edge Function copy, even Chinese SMS message templates.
- Best done in one mechanical pass with a Python find-replace script, type-check after, single big PR.
- localStorage key rename **invalidates existing sessions** — acceptable in early dev, less so post-launch.

---

## 10. Network / connectivity (Expo Go testing)

### Public WiFi often blocks LAN mode
- Hotel, airport, café, even some apartment WiFi enables AP isolation → devices on the same network can't talk to each other → Expo Go phone can't reach Metro on Mac.
- **Workaround**: tunnel mode (`expo start --tunnel`) routes through ngrok's public servers.

### ngrok has regional outages
- We saw "session closed" / "remote gone away" errors multiple times during travel. Retrying in 5-15 minutes usually works.

### iPhone Personal Hotspot is the nuclear option
- If LAN and tunnel both fail: enable Personal Hotspot on iPhone → connect Mac to it → Mac and iPhone are now on a private network with no isolation → LAN works.

### Mac WiFi state can lie
- `networksetup -getairportnetwork en0` returned "not associated" even when `system_profiler SPAirPortDataType` showed an active 5GHz connection. Don't trust a single tool; cross-check.

---

## 11. App icons (iOS)

### Apple's icon contract
- **Exactly 1024×1024**, PNG, **no alpha channel** (fully opaque), **no rounded corners** (Apple rounds for you). Artwork must reach the edges.
- A "presentation" PNG with white padding + pre-rounded corners (like the AI tools love to output) is **wrong** as a submission file — iOS rounds again, you get a tiny icon in a sea of white.
- If your designer hands you the presentation version: crop to even margins and resize, but accept the icon will look ~10% smaller than competitors on Home Screen until you re-export edge-to-edge.

### Useful command for cropping to even margins
```python
from PIL import Image
img = Image.open(SRC).convert('RGB')
# find bbox of non-white, equalize margins to the smallest existing margin
```
(Full script in this project's history.)

---

## 12. Build vs OTA decision rule

```
Does the change touch any of: native modules, app.json icon/name/permissions/scheme/bundleId, Info.plist, Expo SDK version?
├── Yes → eas build (burns credit, ~15-20 min, needs Apple Review for App Store users)
└── No  → eas update (free, ~30s, instant for users on cold start)
```

Most product iteration after launch is `eas update`. Reserve `eas build` for genuine native changes.

---

## 13. iCloud + Apple ID quick facts

- An iCloud email IS an Apple ID. Same login.
- Apple Developer Program = $99/yr (recurring), not one-time. Individual approval typically 1-2 business days.
- 2FA must be enabled on the Apple ID before enrollment — won't let you submit otherwise.
- Bundle ID is permanent: once first submission is associated with an ASC record, it can't be changed.
- App Store Connect numeric "app ID" (`ascAppId` in eas.json) is the digits in the URL after `apps/`. Find via App Store Connect → My Apps → click app → URL bar.

---

## 14. Expo native modules: ALWAYS `expo install`, never `npm/pnpm install`

This one cost two wasted production builds and a baffling crash loop.

- `expo-updates` was added with plain `npm install expo-updates`, which grabbed the **latest major (`^56`)** — incompatible with Expo SDK 54, which wants `~29`. The mismatched native module + JS interface **segfaulted Hermes on the JS thread** (`EXC_BAD_ACCESS` / SIGSEGV on `com.facebook.react.runtime.JavaScript`).
- **It was invisible in dev and in `tsc`.** It only crashed in a release build. Build 3 didn't crash (nothing called the module at launch); build 4 crashed instantly because launch-time code called `Updates.checkForUpdateAsync()`.
- **Always add Expo/native deps with `expo install <pkg>`** (or `npx expo install`) so the version matches the SDK. After any dep change, run **`npx expo install --check`** — it flags version mismatches. The Metro startup log also prints "should be updated for best compatibility" warnings — don't ignore them.
- **Reading a release crash:** on the device, Settings → Privacy & Security → Analytics & Improvements → Analytics Data → find `TimesheetAI-<date>.ips`. Parse the `.ips` (first line = header JSON, rest = body JSON); `exceptionType`/`faultingThread` + the faulting thread's frames tell you JS-thread vs native and whether Hermes is in the stack.

## 15. This machine's IPv6 is broken — force IPv4 for eas-cli

`eas build` / `eas submit` / `eas update` would hang with `Client network socket disconnected before secure TLS connection` or `Failed to fetch (api.supabase.com)`.
- Cause: the local network's IPv6 routing is dead, and Node (eas-cli) prefers IPv6. `curl` to `api.expo.dev` over IPv6 times out; over IPv4 (`curl -4`) it responds in 0.3s.
- **Fix:** prefix every eas/supabase-CLI command with `NODE_OPTIONS="--dns-result-order=ipv4first"`. The Supabase web SQL editor hitting the same wall is the same root cause (retry / switch network).

## 16. First production build & submit need interactive Apple 2FA; after that, non-interactive

- The **first** `eas build --profile production` must run interactively: it logs into Apple, runs 2FA, and creates the App Store distribution cert + provisioning profile. You cannot do this headless.
- If the Keychain holds a **stale Apple ID password** (you changed it), the login fails with "Invalid username and password" — re-enter the current iCloud password (NOT the Expo password — two different accounts).
- The **first** `eas submit` likewise creates an App Store Connect **API key** interactively. Pick **App Manager** role (least privilege; Admin works but is more than needed).
- Once cert + profile + ASC API key are stored on EAS servers, **all subsequent builds and submits run with `--non-interactive`**.
- Re-submitting an already-submitted buildNumber fails ("Something went wrong") — harmless, it's already up.

## 17. App Store review blockers you must clear BEFORE public submit (TestFlight is laxer)

- **In-app account deletion is mandatory** (Guideline 5.1.1(v)) for any app with account creation. Implement via a `SECURITY DEFINER` SQL function the user calls (`delete_user()` → `delete from auth.users where id = auth.uid()`); every table cascades off `profiles → auth.users`, so one delete wipes everything. Grant execute to `authenticated` only.
- **Privacy policy must match reality** — ours wrongly said data was in US-East when the DB is in Seoul (`ap-northeast-2`). Apple checks; an inaccurate cross-border disclosure is a real gap. (Note: Australia has no data-residency law for ordinary apps — overseas storage is fine **if disclosed**.)
- **Support URL / email must be real and reachable** — a placeholder like `support@a-domain-you-dont-own.app` will bounce.
- **Reviewers can't receive your SMS** — if a feature needs phone verification, either pre-set the demo account's `phone_verified=true` (with a number you control) or explain in the App Review notes.
- **TestFlight internal testing needs NO review**; external testing (friends, ≤10k) needs one light **Beta App Review** (~1 day).

## 18. Reuse a deployed web API from the mobile app via Bearer auth

To let mobile reuse web's already-working API routes (we did this for phone verification instead of rebuilding it as an Edge Function):
- Web routes authenticated only via the **session cookie**. Add a helper that accepts **either** the cookie (browser) **or** an `Authorization: Bearer <supabase access token>` header (app), returning a user-scoped Supabase client either way.
- The app gets its token from `supabase.auth.getSession()` and sends it as `Authorization: Bearer ...`. Browser behavior is unchanged (browsers send no bearer), so it's purely additive and zero-risk to web.

## 19. DB migration + Edge Function must change in lockstep

The Edge Function calls RPCs that live in the DB. When you change a feature's data shape:
- If you add a column the Edge Function writes (e.g. `reminder_kind`), you must **both** run the migration **and** redeploy the function (`npx supabase functions deploy <name> --project-ref <ref>`) together — otherwise inserts reference a missing column, or the new RPC returns rows the old function can't record.
- If you only changed the **RPC definitions** (which run in the DB) and the function code is unchanged, you only need the migration — no redeploy.
- Deploy doesn't need Docker on recent CLI (the "Docker is not running" warning is harmless — it uses the API bundler). Secrets persist across deploys.

## 20. Nullable foreign keys ripple into both apps' types

Making `shifts.organization_id` nullable (to support one-off "custom" workplaces with no org) flipped `ShiftWithOrganization.organization` to `Organization | null` in the shared types. Mobile was already null-safe (`shift.organization?.x`), but **web** maps DB rows to its own type and broke `tsc` (`string | null` not assignable to `string`). When you loosen a shared type, run `tsc` on **every** consumer (mobile, shared, web) — a shared-package change can break an app that looks unrelated.
