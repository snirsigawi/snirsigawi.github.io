"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await supabase.auth.signOut();
          router.replace("/login/");
        })
      }
      className={
        compact
          ? "rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          : "w-full rounded-xl px-4 py-3 text-center text-base text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
      }
    >
      {pending ? "…" : "התנתק"}
    </button>
  );
}
