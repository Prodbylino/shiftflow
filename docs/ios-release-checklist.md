# iOS Release Checklist

End-to-end checklist to take ShiftFlow from a working Expo Go preview to a live
App Store listing. Work through top-to-bottom; later sections depend on earlier
ones being complete.

---

## 1. Apple Developer Program enrollment

**Cost:** USD $99 / year (renews automatically).

**Time:** Form fills in ~30 min. Apple verification takes 1–2 business days,
sometimes longer for individual accounts requiring identity confirmation.

### Decision: Individual vs Organization

| | Individual | Organization |
|---|---|---|
| Listed seller name on App Store | Your legal name | Company name |
| Required docs | Government-issued ID | D-U-N-S number, legal entity proof |
| Time to approve | 1–2 days | 1–3 weeks |
| Cost | $99/yr | $99/yr |
| Team members | Just you | Multiple devs/admins |

If ShiftFlow is a personal/side project, **Individual** is fastest. Switching to
Organization later is possible but requires a paid app to be transferred and
re-reviewed.

### Steps

1. Go to https://developer.apple.com/programs/enroll/
2. Sign in with your Apple ID (use the one tied to the Apple ID you'll publish under).
   - Recommend: not your personal iCloud — create a dedicated Apple ID like
     `developer@shiftflow.app` if you have a custom domain.
3. Two-factor auth must be enabled on the Apple ID.
4. Choose Individual / Organization.
5. Confirm contact info, agree to Developer Program License Agreement.
6. Pay $99 with credit card.
7. Wait for "Welcome to the Apple Developer Program" email (1–2 days for
   Individual).

### What you get once approved

- Access to https://developer.apple.com/account/ → Certificates, Identifiers,
  Profiles, Provisioning, App Store Connect.
- Ability to register Bundle IDs.
- Ability to generate signing certificates (EAS Build creates and manages these
  for you — you don't need to touch raw `.p12` files).

---

## 2. Reserve App Store Connect listing

Once enrolled:

1. https://appstoreconnect.apple.com → My Apps → "+" → New App.
2. Fill in:
   - **Platform:** iOS
   - **Name:** `ShiftFlow` (must be globally unique on the App Store; check
     availability before assuming).
   - **Primary language:** English (U.S.)
   - **Bundle ID:** `com.shiftflow.app` (must match `apps/mobile/app.json` →
     `ios.bundleIdentifier`).
   - **SKU:** any internal identifier, e.g. `shiftflow-ios-001`.
3. Save the listing draft. You can fill the rest later (description,
   screenshots) before submission.

### Bundle ID gotchas

- Bundle ID must be registered in
  https://developer.apple.com/account/resources/identifiers/list **before** App
  Store Connect will accept it.
- Once an app is created with a Bundle ID, that ID is locked to that App
  Store Connect record forever. Pick carefully.
- `com.shiftflow.app` is current. If `com.shiftflow.app` is already taken
  globally, fall back to `com.<your-domain-reversed>.shiftflow`.

---

## 3. EAS account + build pipeline

We'll use Expo Application Services (EAS) for cloud-built iOS binaries. EAS
generates and manages signing certificates and provisioning profiles — you
should never need to manually export `.p12` files.

### Steps

1. Install CLI globally on the dev machine:
   ```sh
   pnpm add -g eas-cli
   ```
2. Log in to Expo:
   ```sh
   eas login
   ```
   Use the same email tied to your Expo account (free tier is fine to start).
3. From the repo root:
   ```sh
   cd apps/mobile
   eas init
   ```
   This adds `apps/mobile/eas.json` and an `extra.eas.projectId` field to
   `app.json`. Commit both.
4. Configure build profiles. A starter `eas.json` is in this PR — adjust as
   needed.
5. First iOS build:
   ```sh
   eas build --platform ios --profile preview
   ```
   On first run, EAS asks for your Apple ID and walks through certificate
   creation interactively. Pick "Let EAS handle credentials" — it stores them
   on EAS servers, encrypted.

### Cost notes

- EAS free tier: 30 builds/month, queue can be slow at peak.
- EAS paid: starts ~$19/month for priority builds. Not needed yet.

---

## 4. Pre-submission asset checklist

Apple rejects submissions for missing or incorrect assets. Prep these before
running `eas submit`.

### Required

- [ ] **App icon** — 1024×1024 PNG, no alpha channel, no rounded corners
      (Apple rounds them). Generate from `apps/mobile/assets/images/icon.png`.
- [ ] **Launch screen / splash** — already configured in `app.json`
      (`splash.image`). Verify it shows correctly on multiple device sizes.
- [ ] **Screenshots** — at minimum, 6.7" (iPhone 16 Pro Max) screenshots:
      3 to 10 images, 1290×2796 px. Capture from a device or simulator.
      iPad screenshots only required if `supportsTablet: true` (we have it
      enabled — capture iPad 13" too, or set `supportsTablet: false` to skip).
- [ ] **App description** — short (170 char promo) + long (4000 char).
- [ ] **Keywords** — 100 chars total, comma-separated, no spaces.
- [ ] **Support URL** — must resolve. Can be `https://shiftflow.app/support`
      pointing to a simple page.
- [ ] **Privacy policy URL** — required for any app that accesses user data
      (email + auth = required for us). Hostable as a simple Markdown page on
      the existing Vercel deployment.
- [ ] **Age rating questionnaire** — fill in App Store Connect.

### App Privacy "Nutrition Label"

Apple requires declaring exactly what data you collect and how it's used. For
ShiftFlow:
- **Email address** — collected, linked to user, used for App Functionality
  (auth) and not for tracking.
- **User ID** (Supabase user.id) — collected, linked, App Functionality.
- **Phone number** (only if SMS reminders enabled) — collected, linked, App
  Functionality.
- **Nothing tracked across apps** — we don't run ad SDKs.

Fill this in App Store Connect → App Privacy.

---

## 5. TestFlight beta

Before public release, get the build into the hands of 1–10 internal testers.

1. After `eas build --platform ios --profile production` succeeds, run
   `eas submit --platform ios --latest` — uploads the `.ipa` to App Store
   Connect.
2. In App Store Connect → TestFlight, the build appears under "iOS Builds"
   after ~10 min of automated processing.
3. Apple performs an Export Compliance check. Most apps qualify for the standard
   exemption (no custom encryption beyond HTTPS). Tick the relevant boxes.
4. Add Internal Testers (up to 100, must be in your Apple Developer team).
5. Optionally enable External Testing (up to 10,000 testers via public link)
   after a quick Beta App Review (24–48 h).

---

## 6. App Store submission

1. In the listing draft, attach the latest TestFlight build.
2. Fill remaining metadata (description, keywords, screenshots, contact info,
   demo account if requested).
3. **Demo account** — Apple reviewers need to sign in. Either:
   - Provide a real Supabase test account (recommended), or
   - Mark the app as "doesn't require sign-in" only if true (it's not for us).
4. Click "Submit for Review".
5. Apple review SLA: usually 24–72 hours; can be longer for first-time
   submissions or holidays.

---

## 7. Common rejection reasons (avoid these)

- **Guideline 4.2** — "Minimum Functionality": ShiftFlow has clear native UX,
  not a webview wrapper. Make sure no `WebView` components creep in.
- **Guideline 5.1.1** — collecting data without explanation: privacy policy
  must explicitly cover email, phone, and auth data.
- **Guideline 5.1.1(v)** — sign-in required without a clear reason: we should
  surface what value the user gets from signing up before the form (the
  signup screen already says "Track shifts across all your jobs").
- **Sign in with Apple** — required if any other third-party login (Google,
  Facebook) is offered. We currently only have email/password, so SIWA is
  optional for now.
- **Crash on launch** — run multiple TestFlight builds on a real device under
  airplane-mode and weak-signal conditions before submitting.

---

## 8. Post-launch

- Monitor App Store Connect → Analytics for installs, retention, crashes.
- Monitor Supabase → Auth → Users for new signups.
- Set up `eas update --branch production` for over-the-air JS updates between
  binary releases (fix typos, copy changes, small bug patches without going
  through App Review).

---

## Cost summary

| Item | One-time | Recurring |
|---|---|---|
| Apple Developer Program | — | $99/yr |
| EAS Build (free tier) | — | $0 (within 30 builds/month) |
| Domain (shiftflow.app) | — | ~$15/yr |
| Privacy policy hosting | — | $0 (Vercel) |
| **Total to first launch** | **$0** | **~$115/yr** |

---

## Status (as of branch creation, 2026-05-10)

- [ ] Apple Developer Program enrollment
- [ ] App Store Connect listing reserved
- [ ] EAS account + `eas init`
- [ ] First iOS preview build via EAS
- [ ] App icon + screenshots prepared
- [ ] Privacy policy drafted and hosted
- [ ] TestFlight first build
- [ ] App Store submission
