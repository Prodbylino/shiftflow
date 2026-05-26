import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — TimesheetAI',
  description: 'How TimesheetAI handles your data.',
};

const EFFECTIVE_DATE = 'May 25, 2026';
const CONTACT_EMAIL = 'support@timesheetai.app';

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16 text-gray-800">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Back to TimesheetAI
        </Link>

        <h1 className="mt-8 text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-500">Effective {EFFECTIVE_DATE}</p>

        <section className="mt-10 space-y-6 text-base leading-7">
          <p>
            TimesheetAI ("we", "our", "the app") is a personal shift planning tool for people who
            work multiple jobs, irregular shifts, or freelance schedules. This Privacy Policy
            explains what data we collect, how we use it, and the choices you have. We do not
            sell your data to third parties and we do not run advertising or cross-app tracking.
          </p>

          <h2 className="mt-8 text-2xl font-semibold">1. Information we collect</h2>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              <strong>Account data</strong>: email address and password (hashed) so you can sign
              in. Optionally: full name.
            </li>
            <li>
              <strong>Phone number</strong> (optional): used only if you enable SMS reminders or
              voice-call reminders for upcoming shifts. Stored together with a phone-verified
              flag.
            </li>
            <li>
              <strong>Shift data</strong>: the dates, times, notes, and workplace assignments
              for the shifts you create. This is what the app exists to track.
            </li>
            <li>
              <strong>Workplace data</strong>: the names, hourly rates, and color labels you
              assign to your jobs.
            </li>
            <li>
              <strong>Notification preferences</strong>: whether SMS / voice reminders are on,
              how many minutes before the shift to remind you, and your preferred language.
            </li>
            <li>
              <strong>Operational metadata</strong>: created-at and updated-at timestamps for
              your records, and a last-activity timestamp for session management.
            </li>
          </ul>
          <p>
            We do <strong>not</strong> collect: precise location, contacts, photos, microphone
            audio, biometric identifiers, browsing history, or advertising identifiers.
          </p>

          <h2 className="mt-8 text-2xl font-semibold">2. How we use your information</h2>
          <ul className="ml-6 list-disc space-y-2">
            <li>To authenticate you and keep your account secure.</li>
            <li>To display your shifts, workplaces, and earnings calculations.</li>
            <li>
              To send the SMS or voice-call shift reminders you have enabled in Settings. We
              only contact your phone if you have explicitly turned the toggle on.
            </li>
            <li>
              To compute aggregate statistics shown to you in Analytics (this month's earnings,
              total hours, etc.). These calculations stay on your device and your account; we do
              not generate aggregate data across users.
            </li>
          </ul>

          <h2 className="mt-8 text-2xl font-semibold">3. Third-party services</h2>
          <p>We rely on the following providers to deliver the service:</p>
          <ul className="ml-6 list-disc space-y-2">
            <li>
              <strong>Supabase</strong> (hosting, authentication, database). All your data lives
              in a Supabase project we operate. Supabase's privacy policy:{' '}
              <a
                href="https://supabase.com/privacy"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline"
              >
                supabase.com/privacy
              </a>
              .
            </li>
            <li>
              <strong>AWS SNS</strong> (SMS delivery). Only your phone number and the reminder
              message body are passed to AWS to send an SMS — and only if you have enabled SMS
              reminders.
            </li>
            <li>
              <strong>Twilio</strong> (voice-call delivery). Only your phone number and the
              spoken reminder text are passed to Twilio — and only if you have enabled voice
              reminders.
            </li>
            <li>
              <strong>Vercel</strong> (web hosting). Standard web request logs (IP, user agent,
              path) are kept for diagnostics; not joined to your account.
            </li>
            <li>
              <strong>Apple</strong> (App Store distribution). Apple may collect crash logs and
              aggregate usage statistics per its standard developer terms.
            </li>
          </ul>
          <p>
            We do not use any third-party analytics SDKs, ad networks, or tracking pixels in the
            app or web.
          </p>

          <h2 className="mt-8 text-2xl font-semibold">4. Data retention</h2>
          <p>
            We keep your data for as long as your account is active. If you delete your account,
            all rows tied to your user id (profile, shifts, workplaces, notification logs) are
            permanently deleted from the database within 30 days. Backups roll off within 90
            days.
          </p>

          <h2 className="mt-8 text-2xl font-semibold">5. Your rights</h2>
          <p>You can at any time:</p>
          <ul className="ml-6 list-disc space-y-2">
            <li>View and edit your profile, shifts, and workplaces inside the app.</li>
            <li>
              Turn off SMS / voice reminders by toggling them in Settings — your phone number
              stays on file but is not used for outreach.
            </li>
            <li>
              Request account deletion by emailing{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 underline">
                {CONTACT_EMAIL}
              </a>
              . We will respond within 7 business days.
            </li>
            <li>
              Request a copy of all your data (JSON export) by emailing the same address.
            </li>
          </ul>

          <h2 className="mt-8 text-2xl font-semibold">6. Children</h2>
          <p>
            TimesheetAI is not directed to children under 13. We do not knowingly collect data
            from anyone under 13. If you believe a minor has signed up, contact us and we will
            remove the account.
          </p>

          <h2 className="mt-8 text-2xl font-semibold">7. International users</h2>
          <p>
            Your data is stored on Supabase infrastructure (US-East region). If you access the
            app from outside the United States, you consent to the transfer of your data to the
            United States for processing.
          </p>

          <h2 className="mt-8 text-2xl font-semibold">8. Changes to this policy</h2>
          <p>
            If we make material changes to this Privacy Policy, we will update the effective
            date at the top and, where appropriate, notify you inside the app or by email. The
            current version is always at{' '}
            <Link href="/privacy" className="text-blue-600 underline">
              this URL
            </Link>
            .
          </p>

          <h2 className="mt-8 text-2xl font-semibold">9. Contact</h2>
          <p>
            Privacy questions or requests:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-600 underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>

        <footer className="mt-16 border-t border-gray-200 pt-6 text-sm text-gray-500">
          © 2026 TimesheetAI ·{' '}
          <Link href="/" className="hover:underline">
            Home
          </Link>
        </footer>
      </div>
    </main>
  );
}
