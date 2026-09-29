"use client";

import { useState } from "react";

type SpecialDateValue = { date: string; label: string };

export function SpecialDateField({
  initialDates,
}: {
  initialDates: SpecialDateValue[];
}) {
  const [rows, setRows] = useState<SpecialDateValue[]>(
    initialDates.length > 0 ? initialDates : [{ date: "", label: "" }],
  );

  function update(i: number, field: keyof SpecialDateValue, value: string) {
    setRows((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)),
    );
  }

  function add() {
    setRows((prev) => [...prev, { date: "", label: "" }]);
  }

  function remove(i: number) {
    setRows((prev) =>
      prev.length === 1 ? [{ date: "", label: "" }] : prev.filter((_, idx) => idx !== i),
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2">
          <div className="flex-1">
            <label
              htmlFor={`sd-date-${i}`}
              className="block text-sm font-medium text-muted-foreground"
            >
              תאריך
            </label>
            <input
              id={`sd-date-${i}`}
              type="date"
              name="specialDate.date"
              value={r.date}
              onChange={(e) => update(i, "date", e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
            />
          </div>
          <div className="flex-[2]">
            <label
              htmlFor={`sd-label-${i}`}
              className="block text-sm font-medium text-muted-foreground"
            >
              תיאור
            </label>
            <input
              id={`sd-label-${i}`}
              type="text"
              name="specialDate.label"
              value={r.label}
              onChange={(e) => update(i, "label", e.target.value)}
              placeholder="לדוגמה: יום הולדת"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
            />
          </div>
          <button
            type="button"
            onClick={() => remove(i)}
            className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
            aria-label="הסרת תאריך"
          >
            ✕
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="rounded-lg border border-dashed border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        + הוספת תאריך מיוחד
      </button>
    </div>
  );
}
