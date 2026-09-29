"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listHolidays, type Holiday } from "@/lib/db";
import { HolidayList } from "@/components/settings/HolidayList";

export default function SettingsPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  useEffect(() => {
    listHolidays().then(setHolidays);
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">הגדרות</h1>
      </div>

      <section>
        <h2 className="font-heading text-lg font-semibold">יומן Google</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          חיבור יומן Google להצגת אירועים קרובים בעמוד הראשי.
        </p>
        <Link
          href="/settings/calendar/"
          className="mt-2 inline-block rounded-lg border border-border px-4 py-2 font-heading text-sm font-medium transition-colors hover:bg-muted"
        >
          הגדרות יומן →
        </Link>
      </section>

      <section>
        <h2 className="font-heading text-lg font-semibold">חגים</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          חגים שיופיעו בתזכורות בעמוד הראשי (30 יום לפני).
        </p>
        <div className="mt-3">
          <HolidayList holidays={holidays} onChanged={() => listHolidays().then(setHolidays)} />
        </div>
      </section>
    </div>
  );
}
