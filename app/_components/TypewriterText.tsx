"use client";

import { useEffect, useRef, useState } from "react";

export default function TypewriterText({
  text,
  delay = 400,
  speed = 80,
  className = "",
}: {
  text: string;
  delay?: number;
  speed?: number;
  className?: string;
}) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);
  const [stamping, setStamping] = useState(false);
  const done = displayed.length >= text.length;

  useEffect(() => {
    const startTimeout = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimeout);
  }, [delay]);

  useEffect(() => {
    if (!started || done) return;

    // Irregular timing: vary speed randomly for a mechanical feel
    const jitter = speed * (0.4 + Math.random() * 1.2);
    // Pause longer on spaces (like a carriage advancing)
    const nextChar = text[displayed.length];
    const charDelay = nextChar === " " ? jitter + speed * 0.8 : jitter;

    const timeout = setTimeout(() => {
      setDisplayed(text.slice(0, displayed.length + 1));
      setStamping(true);
      setTimeout(() => setStamping(false), 80);
    }, charDelay);
    return () => clearTimeout(timeout);
  }, [started, displayed, text, speed, done]);

  return (
    <p className={className} aria-label={text}>
      {displayed.split("").map((char, i) => (
        <span
          key={i}
          className={
            i === displayed.length - 1 && stamping
              ? "inline-block typewriter-stamp"
              : undefined
          }
        >
          {char}
        </span>
      ))}
      {started && !done && (
        <span className="inline-block w-[0.5em] h-[1.1em] bg-sepia-600/80 dark:bg-sepia-400/80 ml-px align-middle animate-blink" />
      )}
    </p>
  );
}
