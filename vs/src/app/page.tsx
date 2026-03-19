import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-5xl flex flex-col items-center justify-center gap-10 md:flex-row md:items-center md:justify-between">
        <div className="w-full md:w-1/2 flex items-center justify-center">
          <img
            src="/VSlogo.png"
            alt="VS"
            className="block w-72 max-w-full md:w-[420px]"
            width={420}
            height={420}
          />
        </div>

        <div className="w-full md:w-1/2 flex flex-col items-center md:items-start gap-6">
          <p className="max-w-md text-center md:text-left text-3xl leading-none tracking-tight text-slate-200" style={{ fontFamily: "Mightora, system-ui" }}>
            Pick. VS. Repeat.
          </p>

          <div className="flex flex-col gap-4 items-center md:items-start">
            <Link
              href="/create"
              className="inline-flex min-w-64 items-center justify-center rounded-xl bg-slate-800 px-10 py-3 text-sm font-semibold tracking-wide text-white shadow-lg shadow-black/30 ring-2 ring-emerald-500 hover:bg-slate-700 transition focus:outline-none focus:ring-4 focus:ring-emerald-400/40"
            >
              Create VS
            </Link>
            <Link
              href="/join"
              className="inline-flex min-w-64 items-center justify-center rounded-xl bg-white px-10 py-3 text-sm font-semibold tracking-wide text-black shadow-lg shadow-black/30 hover:bg-slate-50 transition"
            >
              Join VS
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

