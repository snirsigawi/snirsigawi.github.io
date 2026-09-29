"use client";

import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";

const navItems = [
  { href: "/", label: "ראשי" },
  { href: "/students/", label: "תלמידים" },
  { href: "/settings/", label: "הגדרות" },
];

export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <Link href="/" className="font-heading text-xl font-bold text-brand">
          He:Bro
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <SignOutButton />
      </div>
    </header>
  );
}
