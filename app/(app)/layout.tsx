import { AppShell } from "@/components/AppShell";
import { AppHeader } from "@/components/AppHeader";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <div className="flex min-h-full flex-col">
        <AppHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-border py-3 text-center text-xs text-muted-foreground">
          <span dir="ltr" style={{ unicodeBidi: "isolate" }}>
            He:Bro
          </span>{" "}
          · ניהול תלמידים
        </footer>
      </div>
    </AppShell>
  );
}
