"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function shuffleAndPickExcluding<T extends { src: string }>(
  arr: T[],
  count: number,
  exclude: T[],
): T[] {
  const excludeSrcs = new Set(exclude.map((item) => item.src));
  const remaining = arr.filter((item) => !excludeSrcs.has(item.src));

  // If not enough remaining, fall back to full shuffle
  const pool = remaining.length >= count ? remaining : arr;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
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
    setSelected(shuffleAndPickExcluding(photos, count, []));
  }, [photos, count]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleShuffle = useCallback(() => {
    if (phase !== "idle") return;

    setPhase("scatter");

    // Pick next photos and start preloading immediately
    const next = shuffleAndPickExcluding(photos, count, selected);
    const preloaded = Promise.all(
      next.map(
        (photo) =>
          new Promise<void>((resolve) => {
            const img = new window.Image();
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = photo.src;
          }),
      ),
    );

    // Wait for both scatter animation and preload to finish
    const scatterDone = new Promise((r) => setTimeout(r, 600));
    Promise.all([scatterDone, preloaded]).then(() => {
      setSelected(next);
      setShuffleKey((k) => k + 1);
      setPhase("deal");

      timeoutRef.current = setTimeout(() => {
        setPhase("idle");
      }, 1200);
    });
  }, [photos, count, phase, selected]);

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
              transitionDuration: "0.5s",
              transitionTimingFunction: phase === "scatter"
                ? "cubic-bezier(0.4, 0, 0.8, 0.4)"
                : "cubic-bezier(0.2, 0.6, 0.4, 1)",
              transitionDelay: phase === "scatter" ? `${i * 0.04}s` : "0s",
              ...(phase === "scatter"
                ? {
                    transform: `scale(0.9) rotate(${(i % 2 === 0 ? 1 : -1) * (4 + i * 2)}deg) translateY(${(i % 2 === 0 ? -1 : 1) * 30}px)`,
                    opacity: 0,
                  }
                : phase === "deal"
                ? {
                    animation: `deal-in 0.6s cubic-bezier(0.2, 0.6, 0.4, 1) ${i * 0.1}s both`,
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
          <span
            className="inline-block"
            style={
              phase !== "idle"
                ? { transform: "rotate(360deg)", transition: "transform 1s ease" }
                : { transition: "none" }
            }
          >
            ↻
          </span>{" "}
          Shuffle
        </button>
      </div>
    </div>
  );
}
