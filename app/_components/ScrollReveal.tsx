"use client";

import { useEffect, useRef, useState } from "react";

type Animation =
  | "fade-up"
  | "fade-in"
  | "slide-left"
  | "slide-right"
  | "deal-in"
  | "scale-in";

export default function ScrollReveal({
  children,
  animation = "fade-up",
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  animation?: Animation;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const checked = useRef(false);
  const [state, setState] = useState<"idle" | "hidden" | "visible">("idle");

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;

    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      // Already in viewport — skip animation entirely
      setState("visible");
    } else {
      // Below viewport — set hidden and observe
      setState("hidden");

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setState("visible");
            observer.unobserve(el);
          }
        },
        { threshold: 0.15 }
      );

      observer.observe(el);
      return () => observer.disconnect();
    }
  }, []);

  // "idle" = SSR/pre-hydration: no animation classes, render normally
  // "hidden" = below viewport: apply hidden animation styles
  // "visible" = animate in or already shown
  const animClass =
    state === "idle"
      ? ""
      : state === "hidden"
      ? animation
      : `${animation} is-visible`;

  return (
    <div
      ref={ref}
      className={`scroll-reveal ${animClass} ${className}`.trim()}
      style={state === "hidden" ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
