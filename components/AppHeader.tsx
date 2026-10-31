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

const CLOSE_MS = 280;

export function AppHeader() {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const pathname = usePathname();

  function closeMenu() {
    setClosing(true);
  }

  // Unmount after the slide-out animation finishes.
  useEffect(() => {
    if (!closing) return;
    const t = window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, CLOSE_MS);
    return () => window.clearTimeout(t);
  }, [closing]);

  // Close (animated) on navigation.
  useEffect(() => {
    if (!open) return;
    closeMenu();
    // Only react to pathname changes, not to `open` toggling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // The drawer only exists below the tablet breakpoint — close it if the
  // viewport grows into the top-bar layout while it is open.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (!mq.matches) return;
      setOpen(false);
      setClosing(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Escape closes; lock page scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
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

          {/* Desktop / tablet: inline navigation, no drawer. */}
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <SignOutButton compact />
            </div>

            {/* Mobile only: burger opens the side drawer. */}
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="פתיחת תפריט"
              aria-expanded={open}
              className="rounded-md p-2 text-foreground transition-colors hover:bg-muted md:hidden"
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
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-40">
          {/* Backdrop — clicking outside the drawer closes it */}
          <button
            type="button"
            aria-label="סגירת תפריט"
            onClick={closeMenu}
            className={`absolute inset-0 h-full w-full cursor-default bg-black/55 ${
              closing ? "animate-fade-out" : "animate-fade-in"
            }`}
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label="תפריט"
            className={`absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col border-r border-border bg-background shadow-2xl ${
              closing ? "animate-slide-out-left" : "animate-slide-in-left"
            }`}
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
              <span className="font-heading text-xl font-bold text-brand">
                He:Bro
              </span>
              <button
                type="button"
                onClick={closeMenu}
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

            {/* Anchored to the bottom for one-thumb reach. */}
            <nav className="mt-auto flex flex-col items-center gap-1 px-5 pb-8">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  className="w-full rounded-xl px-4 py-3 text-center text-base text-foreground transition-colors hover:bg-muted"
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
