"use client";

import { useMemo } from "react";

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
  const selected = useMemo(() => shuffleAndPick(photos, count), [photos, count]);

  if (selected.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {selected.map((photo) => (
        <a
          key={photo.src}
          href={photo.link}
          target="_blank"
          rel="noopener noreferrer"
          className="relative aspect-[3/2] w-full img-vintage vintage-border rounded-sm overflow-hidden block"
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
  );
}
