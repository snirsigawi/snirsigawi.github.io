"use client";

import Link from "next/link";
import { StudentForm } from "@/components/students/StudentForm";

export default function NewStudentPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/students/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← חזרה לרשימה
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-bold">תלמיד חדש</h1>
      </div>

      <div className="rounded-2xl border border-border bg-background p-6">
        <StudentForm mode="create" />
      </div>
    </div>
  );
}
