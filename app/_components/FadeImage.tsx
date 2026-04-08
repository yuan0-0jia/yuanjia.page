"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

export function FadeImage(props: ImageProps) {
  const [loaded, setLoaded] = useState(false);
  return (
    <Image
      {...props}
      onLoad={() => setLoaded(true)}
      className={`${props.className ?? ""} transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
    />
  );
}

export function FadeImg(props: React.ComponentProps<"img">) {
  const [loaded, setLoaded] = useState(false);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      onLoad={() => setLoaded(true)}
      className={`${props.className ?? ""} transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
    />
  );
}
