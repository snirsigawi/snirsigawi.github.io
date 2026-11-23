"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { listStudents, countStudents, type StudentListItem } from "@/lib/db";
import { SKILL_LABELS_HE, LEVEL_LABELS_HE } from "@/lib/tags";

export default function StudentsPage() {
  const [showArchived, setShowArchived] = useState(false);
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [archivedCount, setArchivedCount] = useState(0);

  const load = useCallback(async (archived: boolean) => {
    const status = archived ? "archived" : "active";
    const [rows, active, archivedTotal] = await Promise.all([
      listStudents(status),
      archived ? countStudents("active") : Promise.resolve(null),
      archived ? Promise.resolve(null) : countStudents("archived"),
    ]);
    setStudents(rows);
    setActiveCount(active ?? rows.length);
    setArchivedCount(archivedTotal ?? rows.length);
  }, []);

  useEffect(() => {
    const read = () =>
      new URLSearchParams(window.location.search).get("tab") === "archived";
    const archived = read();
    setShowArchived(archived);
    void load(archived);

    // Keep the view in sync with browser back/forward navigation.
    const onPop = () => {
      const next = read();
      setShowArchived(next);
      void load(next);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [load]);

  function selectTab(archived: boolean) {
    if (archived === showArchived) return;
    setShowArchived(archived);
    setStudents([]);
    void load(archived);
    window.history.replaceState(
      null,
      "",
      archived ? "/students/?tab=archived" : "/students/",
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">תלמידים</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {showArchived ? "תלמידים מועברים לארכיון" : "תלמידים פעילים"}
          </p>
        </div>
        <Link
          href="/students/new/"
          className="rounded-lg bg-brand px-4 py-2 font-heading text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90"
        >
          + הוספת תלמיד
        </Link>
      </div>

      <div className="flex gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => selectTab(false)}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            !showArchived
              ? "border-brand text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          פעילים ({activeCount})
        </button>
        <button
          type="button"
          onClick={() => selectTab(true)}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            showArchived
              ? "border-brand text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          ארכיון ({archivedCount})
        </button>
      </div>

      {students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-12 text-center">
          <p className="text-muted-foreground">
            {showArchived
              ? "אין תלמידים בארכיון."
              : "אין עדיין תלמידים. לחץ על „הוספת תלמיד” כדי להתחיל."}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {students.map((s) => (
            <li key={s.id}>
              <Link
                href={`/students/view/?id=${s.id}`}
                className="block rounded-2xl border border-border bg-background p-4 transition-colors hover:border-brand"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-heading text-lg font-semibold">{s.name}</h3>
                      {s.status === "archived" && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                          בארכיון
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {s.city}
                      {s.country ? `, ${s.country}` : ""}
                    </p>
                  </div>
                  {s.age !== null && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                      גיל {s.age}
                    </span>
                  )}
                </div>

                {s.lessonsLocation && (
                  <p className="mt-2 text-sm">
                    <span className="text-muted-foreground">מקום לימוד: </span>
                    {s.lessonsLocation}
                  </p>
                )}

                {s.skillLevels.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {s.skillLevels.map((sl) => (
                      <span
                        key={sl.id}
                        className="rounded-full border border-border px-2 py-0.5 text-xs"
                      >
                        {SKILL_LABELS_HE[sl.skill]}{" "}
                        · {LEVEL_LABELS_HE[sl.level]}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
