"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function shuffleAndPick<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export default function FlickrPhotos({
  photos,
  count = 6,
}: {
  photos: { title: string; link: string; src: string }[];
  count?: number;
}) {
  const [selected, setSelected] = useState(photos.slice(0, count));
  const [phase, setPhase] = useState<"idle" | "scatter" | "deal">("idle");
  const [shuffleKey, setShuffleKey] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSelected(shuffleAndPick(photos, count));
  }, [photos, count]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleShuffle = useCallback(() => {
    if (phase !== "idle") return;

    // Phase 1: cards scatter
    setPhase("scatter");

    timeoutRef.current = setTimeout(() => {
      // Swap photos while scattered
      setSelected(shuffleAndPick(photos, count));
      setShuffleKey((k) => k + 1);

      // Phase 2: deal new cards in
      setPhase("deal");

      timeoutRef.current = setTimeout(() => {
        setPhase("idle");
      }, 600);
    }, 400);
  }, [photos, count, phase]);

  if (selected.length === 0)
    return (
      <p className="text-center font-typewriter text-sm text-sepia-500 dark:text-sepia-400 tracking-wider py-8">
        Photos are temporarily unavailable. Visit my{" "}
        <a
          href="https://www.flickr.com/photos/yuan-jia/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-sepia-500/50 decoration-1 underline-offset-4 hover:decoration-sepia-500 transition-colors"
        >
          Flickr
        </a>{" "}
        in the meantime.
      </p>
    );

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {selected.map((photo, i) => (
          <a
            key={`${shuffleKey}-${photo.src}`}
            href={photo.link}
            target="_blank"
            rel="noopener noreferrer"
            className="relative aspect-[3/2] w-full img-vintage vintage-border rounded-sm overflow-hidden block"
            style={{
              transitionProperty: "transform, opacity",
              transitionDuration: "0.4s",
              transitionTimingFunction: phase === "scatter" ? "ease-in" : "ease-out",
              transitionDelay: phase === "deal" ? `${i * 0.08}s` : "0s",
              ...(phase === "scatter"
                ? {
                    transform: `scale(0.8) rotate(${(i % 2 === 0 ? 1 : -1) * (8 + i * 3)}deg) translateY(${(i % 2 === 0 ? -1 : 1) * 40}px)`,
                    opacity: 0,
                  }
                : phase === "deal"
                ? {
                    animation: `deal-in 0.4s ease-out ${i * 0.08}s both`,
                  }
                : {}),
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.src}
              alt={photo.title}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </a>
        ))}
      </div>
      <div className="mt-8 text-center">
        <button
          onClick={handleShuffle}
          disabled={phase !== "idle"}
          className="font-typewriter text-sm tracking-wider text-sepia-600 dark:text-sepia-400 hover:text-sepia-800 dark:hover:text-sepia-300 transition-colors disabled:opacity-50"
        >
          ↻ Shuffle
        </button>
      </div>
    </div>
  );
}
