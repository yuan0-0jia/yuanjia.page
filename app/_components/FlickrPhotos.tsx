"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FaChevronLeft, FaChevronRight, FaXmark, FaArrowUpRightFromSquare, FaCamera } from "react-icons/fa6";
import "./flickr-reveal.css";

interface ExifData {
  camera: string | null;
  lens: string | null;
  aperture: string | null;
  shutter: string | null;
  iso: string | null;
  focalLength: string | null;
  film: string | null;
}

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

type Photo = { id: string; title: string; link: string; src: string; exif?: ExifData | null };

export default function FlickrPhotos({
  photos,
  count = 6,
}: {
  photos: Photo[];
  count?: number;
}) {
  const [selected, setSelected] = useState(photos.slice(0, count));
  const [phase, setPhase] = useState<"idle" | "scatter" | "deal">("idle");
  const [shuffleKey, setShuffleKey] = useState(0);
  const [revealState, setRevealState] = useState<"pending" | "animating" | "done">("pending");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxClosing, setLightboxClosing] = useState(false);
  const [lightboxDirection, setLightboxDirection] = useState<"left" | "right" | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSelected(shuffleAndPickExcluding(photos, count, []));
  }, [photos, count]);

  // Observe when grid scrolls into view
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealState("animating");
          setTimeout(() => setRevealState("done"), count * 120 + 600);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [count]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const goLightbox = useCallback((dir: "left" | "right") => {
    if (lightboxDirection) return; // already animating
    setLightboxDirection(dir);
    setTimeout(() => {
      setLightboxIndex((i) => {
        if (i === null) return null;
        return dir === "left" ? Math.max(0, i - 1) : Math.min(selected.length - 1, i + 1);
      });
      setLightboxDirection(null);
    }, 150);
  }, [lightboxDirection, selected.length]);

  const closeLightbox = useCallback(() => {
    setLightboxClosing(true);
    setTimeout(() => {
      setLightboxIndex(null);
      setLightboxClosing(false);
    }, 200);
  }, []);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") goLightbox("left");
      if (e.key === "ArrowRight") goLightbox("right");
    };

    // Prevent body scroll
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [lightboxIndex, selected.length, closeLightbox]);

  const handleShuffle = useCallback(() => {
    if (phase !== "idle" || revealState === "animating") return;

    if (revealState === "pending") setRevealState("done");

    setPhase("scatter");

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

    const scatterDone = new Promise((r) => setTimeout(r, 600));
    Promise.all([scatterDone, preloaded]).then(() => {
      setSelected(next);
      setShuffleKey((k) => k + 1);
      setPhase("deal");

      timeoutRef.current = setTimeout(() => {
        setPhase("idle");
      }, 1200);
    });
  }, [photos, count, phase, selected, revealState]);

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

  const getPhotoProps = (i: number) => {
    if (revealState === "pending") {
      return {
        className: "flickr-photo-hidden",
        style: {} as React.CSSProperties,
      };
    }

    if (revealState === "animating") {
      return {
        className: "flickr-photo-reveal",
        style: { animationDelay: `${i * 0.12}s` } as React.CSSProperties,
      };
    }

    return {
      className: "",
      style: {
        transitionProperty: "transform, opacity",
        transitionDuration: "0.5s",
        transitionTimingFunction:
          phase === "scatter"
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
      } as React.CSSProperties,
    };
  };

  const lightboxPhoto = lightboxIndex !== null ? selected[lightboxIndex] : null;

  return (
    <div>
      <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {selected.map((photo, i) => {
          const props = getPhotoProps(i);
          return (
            <button
              key={`${shuffleKey}-${photo.src}`}
              onClick={() => setLightboxIndex(i)}
              className={`relative aspect-3/2 w-full img-vintage vintage-border rounded-sm overflow-hidden block cursor-pointer text-left ${props.className}`}
              style={props.style}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.src}
                alt={photo.title}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </button>
          );
        })}
      </div>
      <div className="mt-8 text-center">
        <button
          onClick={handleShuffle}
          disabled={phase !== "idle" || revealState === "animating"}
          className="font-typewriter text-sm tracking-wider text-sepia-600 dark:text-sepia-400 hover:text-sepia-800 dark:hover:text-sepia-300 transition-colors disabled:opacity-50"
        >
          <span
            className="inline-block"
            style={
              phase !== "idle"
                ? {
                    transform: "rotate(360deg)",
                    transition: "transform 1s ease",
                  }
                : { transition: "none" }
            }
          >
            ↻
          </span>{" "}
          Shuffle
        </button>
      </div>

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-warmGray-900/90 dark:bg-black/90 backdrop-blur-sm lightbox-backdrop ${lightboxClosing ? "lightbox-closing" : ""}`}
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-6 right-6 text-cream/80 hover:text-cream transition-colors z-10"
            aria-label="Close lightbox"
          >
            <FaXmark className="w-6 h-6" />
          </button>

          {/* Previous */}
          {lightboxIndex! > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goLightbox("left");
              }}
              className="absolute left-4 md:left-8 text-cream/60 hover:text-cream transition-colors z-10"
              aria-label="Previous photo"
            >
              <FaChevronLeft className="w-6 h-6 md:w-8 md:h-8" />
            </button>
          )}

          {/* Next */}
          {lightboxIndex! < selected.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goLightbox("right");
              }}
              className="absolute right-4 md:right-8 text-cream/60 hover:text-cream transition-colors z-10"
              aria-label="Next photo"
            >
              <FaChevronRight className="w-6 h-6 md:w-8 md:h-8" />
            </button>
          )}

          {/* Image + caption */}
          <div
            className={`flex flex-col items-center max-w-5xl max-h-[85vh] px-12 md:px-20 lightbox-image ${
              lightboxDirection === "left" ? "lightbox-slide-left" :
              lightboxDirection === "right" ? "lightbox-slide-right" : ""
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxPhoto.src}
              alt={lightboxPhoto.title}
              className="max-h-[75vh] max-w-full object-contain rounded-sm"
            />
            <div className="mt-4 text-center">
              {lightboxPhoto.title && (
                <p className="font-typewriter text-sm text-cream/80 tracking-wider mb-2">
                  {lightboxPhoto.title}
                </p>
              )}

              {/* EXIF data */}
              {(() => {
                const exif = lightboxPhoto.exif;
                if (!exif) return null;

                const parts = [
                  exif.camera,
                  exif.lens,
                  exif.focalLength,
                  exif.aperture ? `f/${exif.aperture}` : null,
                  exif.shutter ? `${exif.shutter}s` : null,
                  exif.iso ? `ISO ${exif.iso}` : null,
                  exif.film,
                ].filter(Boolean);

                if (parts.length === 0) return null;

                return (
                  <div className="flex items-center justify-center gap-1.5 mb-2 flex-wrap">
                    <FaCamera className="w-2.5 h-2.5 text-sepia-500" />
                    <p className="font-typewriter text-[11px] text-cream/50 tracking-wider">
                      {parts.join(" · ")}
                    </p>
                  </div>
                );
              })()}

              <a
                href={lightboxPhoto.link}
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
      )}
    </div>
  );
}
