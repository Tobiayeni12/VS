import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-slate-200">
      <Link href="/" className="text-sm text-emerald-400 hover:underline">
        ← Back to home
      </Link>

      <h1 className="mt-6 text-3xl font-bold text-white">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-400">Last updated: May 2026</p>

      <section className="mt-8 space-y-4 text-sm leading-relaxed text-slate-300">
        <p>
          VS (&quot;we&quot;, &quot;our&quot;, &quot;the app&quot;) is a
          browser-based party game. We are committed to being transparent about
          the limited information we handle.
        </p>

        <h2 className="text-lg font-semibold text-white">What we collect</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <span className="font-medium text-slate-100">Display name</span> —
            the name you choose when creating or joining a room. This does not
            need to be your real name.
          </li>
          <li>
            <span className="font-medium text-slate-100">Session ID</span> — a
            randomly generated identifier created for each game session. It is
            not linked to any account, email address, or personal identity.
          </li>
          <li>
            <span className="font-medium text-slate-100">YouTube links</span>{" "}
            — the video URLs you submit during a game. We store only the
            YouTube video ID and the publicly available title and thumbnail
            fetched from YouTube.
          </li>
        </ul>

        <h2 className="text-lg font-semibold text-white">How we use it</h2>
        <p>
          Solely to run your game session — displaying player names, tracking
          scores, and showing the bracket. We do not use your information for
          advertising, analytics, or any purpose beyond operating the game.
        </p>

        <h2 className="text-lg font-semibold text-white">
          Where it is stored and for how long
        </h2>
        <p>
          Room data is stored on Upstash Redis servers located in the United
          States. All data is automatically and permanently deleted within
          6 hours of the room being created, or immediately when the host
          closes the room.
        </p>

        <h2 className="text-lg font-semibold text-white">
          Browser storage (localStorage / sessionStorage)
        </h2>
        <p>
          We store your session ID and display name locally in your browser so
          you can reconnect to a room if you accidentally close the tab. This
          data never leaves your device and is not shared with any third party.
          You can clear it at any time through your browser settings.
        </p>

        <h2 className="text-lg font-semibold text-white">
          YouTube content
        </h2>
        <p>
          VS links to videos hosted on YouTube. We do not host, stream, or
          reproduce any video content. Video titles and thumbnails are fetched
          from YouTube&apos;s public API. YouTube&apos;s own{" "}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:underline"
          >
            Privacy Policy
          </a>{" "}
          applies when you view or interact with YouTube content.
        </p>

        <h2 className="text-lg font-semibold text-white">
          We do not collect
        </h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Email addresses or passwords</li>
          <li>IP addresses</li>
          <li>Location data</li>
          <li>Cookies (we use no tracking or advertising cookies)</li>
          <li>Any information from children under 13</li>
        </ul>

        <h2 className="text-lg font-semibold text-white">
          Children (COPPA / Canada)
        </h2>
        <p>
          VS is not directed at children under 13 years of age. We do not
          knowingly collect any personal information from anyone under 13. If
          you believe a child under 13 has provided information through this
          app, please contact us and we will delete it promptly.
        </p>

        <h2 className="text-lg font-semibold text-white">
          Your rights (Canada — PIPEDA)
        </h2>
        <p>
          You have the right to request access to, correction of, or deletion
          of any information we hold about you. Because all data is
          automatically deleted within 6 hours and is not linked to any
          persistent identity, there is typically nothing to request. For any
          privacy concerns please contact us at the address below.
        </p>

        <h2 className="text-lg font-semibold text-white">
          Your rights (US — state privacy laws)
        </h2>
        <p>
          Residents of California and other US states with privacy laws have
          rights including access, deletion, and opt-out of sale of personal
          information. We do not sell personal information. Given the temporary
          and pseudonymous nature of the data we hold, most requests are
          automatically satisfied by our 6-hour data retention limit.
        </p>

        <h2 className="text-lg font-semibold text-white">Changes</h2>
        <p>
          We may update this policy from time to time. The &quot;last
          updated&quot; date at the top of this page will reflect any changes.
          Continued use of the app after changes are posted constitutes
          acceptance.
        </p>

        <h2 className="text-lg font-semibold text-white">Contact</h2>
        <p>
          For privacy inquiries please contact us at{" "}
          <a href="mailto:tobiayeni12@gmail.com" className="text-emerald-400 hover:underline">
            tobiayeni12@gmail.com
          </a>.
        </p>
      </section>
    </main>
  );
}
