"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getStudentDetail } from "@/lib/db";
import { StudentForm } from "@/components/students/StudentForm";

export default function EditStudentPage() {
  const [id, setId] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sid = new URLSearchParams(window.location.search).get("id");
    if (!sid) {
      setMissing(true);
      return;
    }
    setId(sid);
    getStudentDetail(sid).then((s) => {
      if (!s) setMissing(true);
      setReady(true);
    });
  }, []);

  if (missing) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">תלמיד לא נמצא.</p>
        <Link href="/students/" className="text-sm text-brand hover:underline">
          ← חזרה לרשימה
        </Link>
      </div>
    );
  }

  if (!id || !ready) {
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">
        <span className="animate-pulse">טוען…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/students/view/?id=${id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← חזרה לכרטיס התלמיד
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-bold">עריכת תלמיד</h1>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6">
        <StudentForm mode="update" studentId={id} />
      </div>
    </div>
  );
}
