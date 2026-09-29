"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

/**
 * Client-side auth guard for the static app. While the session is loading we
 * show a spinner; with no session we redirect to /login. Data is additionally
 * protected at the database by Row Level Security, so the guard alone isn't
 * the security boundary.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, next) => setSession(next),
    );
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session === null) router.replace("/login/");
  }, [session, router]);

  if (session === undefined || session === null) {
    return (
      <div className="flex flex-1 items-center justify-center py-24 text-muted-foreground">
        <span className="animate-pulse text-sm">טוען…</span>
      </div>
    );
  }

  return <>{children}</>;
}
