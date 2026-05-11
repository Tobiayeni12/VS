import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-slate-200">
      <Link href="/" className="text-sm text-emerald-400 hover:underline">
        ← Back to home
      </Link>

      <h1 className="mt-6 text-3xl font-bold text-white">Terms of Use</h1>
      <p className="mt-2 text-sm text-slate-400">Last updated: May 2026</p>

      <section className="mt-8 space-y-4 text-sm leading-relaxed text-slate-300">
        <p>
          By using VS you agree to these terms. If you do not agree, please do
          not use the app.
        </p>

        <h2 className="text-lg font-semibold text-white">Eligibility</h2>
        <p>
          You must be at least 13 years of age to use VS. By using the app you
          confirm that you meet this requirement. If you are under 18, you
          confirm that a parent or guardian has reviewed and agreed to these
          terms on your behalf.
        </p>

        <h2 className="text-lg font-semibold text-white">
          Acceptable use
        </h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Use VS only for lawful purposes and in a manner consistent with
            these terms.
          </li>
          <li>
            Do not submit YouTube links to content that is illegal, hateful,
            violently threatening, or sexually explicit.
          </li>
          <li>
            Do not attempt to disrupt, overload, or compromise the app or its
            infrastructure.
          </li>
          <li>
            Do not impersonate other people or misuse room codes to interfere
            with other users&apos; games.
          </li>
        </ul>

        <h2 className="text-lg font-semibold text-white">
          YouTube content
        </h2>
        <p>
          VS allows you to submit links to YouTube videos. You are responsible
          for ensuring that any content you link to complies with YouTube&apos;s{" "}
          <a
            href="https://www.youtube.com/t/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:underline"
          >
            Terms of Service
          </a>{" "}
          and applicable copyright law. VS does not host, store, or endorse
          any video content.
        </p>

        <h2 className="text-lg font-semibold text-white">
          No warranties
        </h2>
        <p>
          VS is provided &quot;as is&quot; without warranty of any kind,
          express or implied. We do not guarantee that the app will be
          available, error-free, or suitable for any particular purpose. Use
          the app at your own risk.
        </p>

        <h2 className="text-lg font-semibold text-white">
          Limitation of liability
        </h2>
        <p>
          To the fullest extent permitted by applicable law, VS and its
          operators shall not be liable for any indirect, incidental, special,
          consequential, or punitive damages arising from your use of or
          inability to use the app.
        </p>

        <h2 className="text-lg font-semibold text-white">
          Intellectual property
        </h2>
        <p>
          The VS name, logo, and original code are owned by their respective
          creators. You may not reproduce, distribute, or create derivative
          works without permission. YouTube trademarks and content belong to
          Google LLC and the respective content creators.
        </p>

        <h2 className="text-lg font-semibold text-white">
          Governing law
        </h2>
        <p>
          These terms are governed by and construed in accordance with
          applicable Canadian law. Users accessing VS from outside Canada are
          responsible for compliance with their local laws.
        </p>

        <h2 className="text-lg font-semibold text-white">Changes</h2>
        <p>
          We may update these terms at any time. Continued use of the app
          after changes are posted constitutes your acceptance of the new
          terms. The &quot;last updated&quot; date at the top of this page
          will reflect any revisions.
        </p>

        <h2 className="text-lg font-semibold text-white">Contact</h2>
        <p>
          Questions about these terms can be directed to the contact
          information on our home page or repository.
        </p>
      </section>
    </main>
  );
}
