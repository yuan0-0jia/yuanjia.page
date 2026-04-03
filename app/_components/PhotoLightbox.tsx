"use client";

import { useCallback, useEffect, useState } from "react";
import { FaChevronLeft, FaChevronRight, FaXmark, FaArrowUpRightFromSquare, FaCamera } from "react-icons/fa6";

interface ExifData {
  camera: string | null;
  lens: string | null;
  aperture: string | null;
  shutter: string | null;
  iso: string | null;
  focalLength: string | null;
  film: string | null;
}

type Photo = { id: string; title: string; link: string; src: string; exif?: ExifData | null };

export default function PhotoLightbox({
  photos,
  index,
  onClose,
  onChange,
}: {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onChange: (index: number) => void;
}) {
  const [closing, setClosing] = useState(false);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  const photo = photos[index];

  const close = useCallback(() => {
    setClosing(true);
    setTimeout(() => onClose(), 200);
  }, [onClose]);

  const go = useCallback((dir: "left" | "right") => {
    if (direction) return;
    setDirection(dir);
    setTimeout(() => {
      onChange(dir === "left" ? Math.max(0, index - 1) : Math.min(photos.length - 1, index + 1));
      setDirection(null);
    }, 150);
  }, [direction, index, photos.length, onChange]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") go("left");
      if (e.key === "ArrowRight") go("right");
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [close, go]);

  if (!photo) return null;

  const exif = photo.exif;
  const exifParts = exif ? [
    exif.camera,
    exif.lens,
    exif.focalLength,
    exif.aperture ? (exif.aperture.startsWith("f/") ? exif.aperture : `f/${exif.aperture}`) : null,
    exif.shutter ? `${exif.shutter}s` : null,
    exif.iso ? `ISO ${exif.iso}` : null,
    exif.film,
  ].filter(Boolean) : [];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-warmGray-900/90 dark:bg-black/90 backdrop-blur-sm lightbox-backdrop ${closing ? "lightbox-closing" : ""}`}
      onClick={close}
    >
      <button
        onClick={close}
        className="absolute top-6 right-6 text-cream/80 hover:text-cream transition-colors z-10"
        aria-label="Close lightbox"
      >
        <FaXmark className="w-6 h-6" />
      </button>

      {index > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); go("left"); }}
          className="absolute left-4 md:left-8 text-cream/60 hover:text-cream transition-colors z-10"
          aria-label="Previous photo"
        >
          <FaChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
        </button>
      )}

      {index < photos.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); go("right"); }}
          className="absolute right-4 md:right-8 text-cream/60 hover:text-cream transition-colors z-10"
          aria-label="Next photo"
        >
          <FaChevronRight className="w-6 h-6 md:w-8 md:h-8" />
        </button>
      )}

      <div
        className={`flex flex-col items-center max-w-5xl max-h-[85vh] px-12 md:px-20 lightbox-image ${
          direction === "left" ? "lightbox-slide-left" :
          direction === "right" ? "lightbox-slide-right" : ""
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.src}
          alt={photo.title}
          className="max-h-[75vh] max-w-full object-contain rounded-sm"
        />
        <div className="mt-4 text-center">
          {photo.title && (
            <p className="font-typewriter text-sm text-cream/80 tracking-wider mb-2">
              {photo.title}
            </p>
          )}

          {exifParts.length > 0 && (
            <div className="flex items-center justify-center gap-1.5 mb-2 flex-wrap">
              <FaCamera className="w-2.5 h-2.5 text-sepia-500" />
              <p className="font-typewriter text-[11px] text-cream/50 tracking-wider">
                {exifParts.join(" · ")}
              </p>
            </div>
          )}

          <a
            href={photo.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-typewriter text-xs text-sepia-400 hover:text-sepia-300 tracking-wider transition-colors"
          >
            View on Flickr
            <FaArrowUpRightFromSquare className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
