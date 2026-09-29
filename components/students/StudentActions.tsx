"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setStudentStatus, deleteStudent } from "@/lib/db";

export function StudentActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isArchived = status === "archived";

  function run(fn: () => Promise<void>, thenList = false) {
    startTransition(async () => {
      await fn();
      if (thenList) router.push("/students/");
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      {isArchived ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => setStudentStatus(id, "active"))}
          className="rounded-lg border border-border px-3 py-2 font-heading text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          שחזור
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => setStudentStatus(id, "archived"))}
          className="rounded-lg border border-border px-3 py-2 font-heading text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          העברה לארכיון
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("מחיקת תלמיד לצמיתות? לא ניתן לבטל פעולה זו.")) return;
          run(() => deleteStudent(id), true);
        }}
        className="rounded-lg border border-red-300 px-3 py-2 font-heading text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
      >
        מחיקה
      </button>
    </div>
  );
}
