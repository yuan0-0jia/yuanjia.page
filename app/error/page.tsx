"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import TerminalShell from "../_components/TerminalShell";

function ErrorContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("error");
  const msg = code ? `Something went wrong: ${code}` : "Something went wrong";
  return <TerminalShell message={msg} />;
}

export default function Error() {
  return (
    <Suspense>
      <ErrorContent />
    </Suspense>
  );
}
