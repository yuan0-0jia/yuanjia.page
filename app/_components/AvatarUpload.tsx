"use client";

import { useState } from "react";
import Image from "next/image";
import { updateAvatar } from "../_lib/auth-action";

// Auth-gated avatar with an inline "replace" uploader (hover/tap → file
// picker → server action → reload). Renders in place of the static portrait.
export default function AvatarUpload({ src }: { src: string }) {
  const [busy, setBusy] = useState(false);
  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      await updateAvatar(fd);
      window.location.reload(); // re-fetch the row so the new portrait shows
    } catch (err) {
      console.error(err);
      setBusy(false);
    }
  };
  return (
    <label
      className={`yjt-whoami-avatar yjt-avatar-edit${busy ? " is-busy" : ""}`}
      title="Replace avatar"
      aria-label="Replace avatar"
    >
      <Image src={src} alt="Yuan Jia" width={96} height={96} draggable={false} />
      <span className="yjt-avatar-edit-hint">{busy ? "uploading…" : "↑ replace"}</span>
      <input type="file" accept="image/*" onChange={onChange} disabled={busy} hidden />
    </label>
  );
}
