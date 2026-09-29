"use client";

import { useState, useTransition } from "react";
import { createHoliday, deleteHoliday, type Holiday } from "@/lib/db";

const fmtDate = new Intl.DateTimeFormat("he-IL", {
  weekday: "short",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function HolidayList({
  holidays,
  onChanged,
}: {
  holidays: Holiday[];
  onChanged: () => void | Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !date) return;
    startTransition(async () => {
      await createHoliday(name.trim(), date);
      setName("");
      setDate("");
      await onChanged();
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
        <div>
          <label htmlFor="holiday-name" className="block text-sm font-medium">
            שם החג <span className="text-red-600">*</span>
          </label>
          <input
            id="holiday-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-48 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>
        <div>
          <label htmlFor="holiday-date" className="block text-sm font-medium">
            <span dir="ltr" style={{ unicodeBidi: "isolate" }}>תאריך</span>{" "}
            <span className="text-red-600">*</span>
          </label>
          <input
            id="holiday-date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand px-4 py-2 font-heading text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          הוספה
        </button>
      </form>

      {holidays.length === 0 ? (
        <p className="text-sm text-muted-foreground">אין חגים מוגדרים.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {holidays.map((h) => (
            <li
              key={h.id}
              className="flex items-center justify-between gap-2 p-3 text-sm"
            >
              <span>
                {h.name}{" "}
                <span
                  dir="ltr"
                  style={{ unicodeBidi: "isolate" }}
                  className="text-muted-foreground"
                >
                  ({fmtDate.format(new Date(`${h.date}T00:00:00Z`))})
                </span>
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (!confirm("מחיקת החג?")) return;
                  startTransition(async () => {
                    await deleteHoliday(h.id);
                    await onChanged();
                  });
                }}
                className="rounded-lg border border-red-300 px-3 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
              >
                מחיקה
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
