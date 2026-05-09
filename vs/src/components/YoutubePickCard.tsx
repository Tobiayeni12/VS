"use client";

import { youtubeThumbnail, youtubeWatchUrl } from "@/lib/youtube";

type Props = {
  videoId: string;
  disabled: boolean;
  onPick: () => void;
  thumbnailUrl?: string;
  title?: string;
  pollSide: "left" | "right";
};

export function YoutubePickCard({
  videoId,
  disabled,
  onPick,
  thumbnailUrl,
  title,
  pollSide,
}: Props) {
  const thumb = thumbnailUrl || youtubeThumbnail(videoId);
  const watch = youtubeWatchUrl(videoId);

  const pollAccent =
    pollSide === "left"
      ? "border-slate-600 hover:border-red-500 focus:ring-red-500/60"
      : "border-slate-600 hover:border-blue-500 focus:ring-blue-500/60";

  return (
    <div className="flex min-h-[28vh] flex-col gap-2 sm:min-h-[32vh]">
      <button
        type="button"
        disabled={disabled}
        onClick={onPick}
        className={`relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border-2 bg-black text-left transition focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${pollAccent}`}
      >
        <span className="relative block aspect-video w-full shrink-0 bg-slate-950">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumb}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
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
