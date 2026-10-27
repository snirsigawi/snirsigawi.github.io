"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SignOutButton } from "@/components/SignOutButton";

const navItems = [
  { href: "/", label: "ראשי" },
  { href: "/students/", label: "תלמידים" },
  { href: "/calendar/", label: "לוח שיעורים" },
  { href: "/settings/", label: "הגדרות" },
];

export function AppHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape closes; lock page scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
          <Link href="/" className="font-heading text-xl font-bold text-brand">
            He:Bro
          </Link>

          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="פתיחת תפריט"
            aria-expanded={open}
            className="rounded-md p-2 text-foreground transition-colors hover:bg-muted"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-40">
          {/* Backdrop — clicking outside the drawer closes it */}
          <button
            type="button"
            aria-label="סגירת תפריט"
            onClick={() => setOpen(false)}
            className="animate-fade-in absolute inset-0 h-full w-full cursor-default bg-black/55"
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label="תפריט"
            className="animate-slide-in-left absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col border-r border-border bg-background shadow-2xl"
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
              <span className="font-heading text-xl font-bold text-brand">
                He:Bro
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="סגירת תפריט"
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <nav className="flex flex-1 flex-col items-center justify-evenly gap-4 px-6 py-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="w-full rounded-xl px-4 py-4 text-center text-base text-foreground transition-colors hover:bg-muted"
                >
                  {item.label}
                </Link>
              ))}
              <SignOutButton />
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
