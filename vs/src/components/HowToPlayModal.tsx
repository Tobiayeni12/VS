"use client";

import { useState } from "react";

export function HowToPlayModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-font inline-flex min-w-64 items-center justify-center rounded-xl border border-slate-600 bg-transparent px-10 py-3 text-sm font-semibold tracking-wide text-slate-300 transition hover:bg-slate-800 hover:text-white"
      >
        How to Play
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-emerald-500/30 bg-slate-900 p-6 shadow-2xl space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">How to Play</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-white transition text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-2">
                  Host
                </p>
                <ol className="space-y-2 text-sm text-slate-300 list-none">
                  {[
                    "Create a room and share the room code with your friends.",
                    "Set a VS title — the debate topic (e.g. \"Best Open World Game\").",
                    "Choose how many games players can submit and how many players can join.",
                    "Once everyone has joined, move to the lobby and wait for submissions.",
                    "Start the knockout — VS builds the bracket automatically.",
                    "Pick the winner of each matchup until one game is crowned champion.",
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              <hr className="border-slate-700" />

              <div>
                <p className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-2">
                  Players
                </p>
                <ol className="space-y-2 text-sm text-slate-300 list-none">
                  {[
                    "Get the room code from your host and join on the Join VS page.",
                    "Submit your favourite game(s) by pasting a YouTube link.",
                    "Watch the bracket unfold and root for your picks.",
                    "The last game standing wins the VS!",
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-slate-600 text-slate-300 text-xs font-bold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
