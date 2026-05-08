"use client";

import { youtubeThumbnail, youtubeWatchUrl } from "@/lib/youtube";

type Props = {
  videoId: string;
  disabled: boolean;
  onPick: () => void;
  thumbnailUrl?: string;
  title?: string;
};

export function YoutubePickCard({
  videoId,
  disabled,
  onPick,
  thumbnailUrl,
  title,
}: Props) {
  const thumb = thumbnailUrl || youtubeThumbnail(videoId);
  const watch = youtubeWatchUrl(videoId);

  return (
    <div className="flex min-h-[28vh] flex-col gap-2 sm:min-h-[32vh]">
      <button
        type="button"
        disabled={disabled}
        onClick={onPick}
        className="group relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border-2 border-slate-600 bg-black text-left transition hover:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/60 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="relative block aspect-video w-full shrink-0 bg-slate-950">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumb}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 text-center text-base font-bold uppercase tracking-wide text-white opacity-0 transition group-hover:opacity-100 sm:text-lg">
            Pick this video
          </span>
        </span>
        {title ? (
          <p className="line-clamp-2 border-t border-slate-700 bg-slate-900/95 px-3 py-2 text-left text-xs font-medium leading-snug text-slate-200">
            {title}
          </p>
        ) : null}
      </button>
      <a
        href={watch}
        target="_blank"
        rel="noopener noreferrer"
        className="text-center text-xs font-medium text-green-300/90 underline-offset-2 hover:text-green-200 hover:underline"
      >
        Open on YouTube
      </a>
    </div>
  );
}
