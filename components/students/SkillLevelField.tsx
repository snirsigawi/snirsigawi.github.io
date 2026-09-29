"use client";

import { useState } from "react";
import {
  SKILLS,
  LEVELS,
  SKILL_TAGS,
  SKILL_LABELS_HE,
  LEVEL_LABELS_HE,
  type Skill,
  type Level,
} from "@/lib/tags";

export type SkillLevelValue = {
  skill: Skill;
  level: Level | "";
  note: string;
  tags: string[];
};

function TagChip({
  tag,
  selected,
  onToggle,
}: {
  tag: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`group relative cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors ${
        selected
          ? "border-brand bg-brand/10 text-brand"
          : "border-border hover:bg-muted"
      }`}
    >
      {tag}
      {selected && (
        <span className="ms-1 inline-flex size-4 items-center justify-center rounded-full bg-brand/20 text-xs leading-none opacity-100 transition-opacity group-hover:opacity-100">
          ✕
        </span>
      )}
    </button>
  );
}

function SkillRow({
  skill,
  value,
}: {
  skill: Skill;
  value: SkillLevelValue;
}) {
  const [tags, setTags] = useState<string[]>(value.tags);

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <h4 className="font-heading text-base font-semibold">
        {SKILL_LABELS_HE[skill]}
      </h4>

      <div className="mt-3 space-y-3">
        <div>
          <label
            htmlFor={`level-${skill}`}
            className="block text-sm font-medium text-muted-foreground"
          >
            רמה
          </label>
          <select
            id={`level-${skill}`}
            name={`level.${skill}`}
            defaultValue={value.level}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
          >
            <option value="">— לא נבחרה —</option>
            {LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {LEVEL_LABELS_HE[lvl]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="block text-sm font-medium text-muted-foreground">
            תגיות
          </span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {SKILL_TAGS.map((tag) => (
              <TagChip
                key={tag}
                tag={tag}
                selected={tags.includes(tag)}
                onToggle={() => toggleTag(tag)}
              />
            ))}
          </div>
          {/* Hidden inputs so selected tags are submitted with the form */}
          {tags.map((tag) => (
            <input
              key={tag}
              type="hidden"
              name={`tags.${skill}`}
              value={tag}
            />
          ))}
        </div>

        <div>
          <label
            htmlFor={`note-${skill}`}
            className="block text-sm font-medium text-muted-foreground"
          >
            הערה חופשית
          </label>
          <textarea
            id={`note-${skill}`}
            name={`note.${skill}`}
            defaultValue={value.note}
            rows={2}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
          />
        </div>
      </div>
    </div>
  );
}

export function SkillLevelField({
  values,
}: {
  values: Record<Skill, SkillLevelValue>;
}) {
  return (
    <div className="space-y-6">
      {SKILLS.map((skill) => (
        <SkillRow key={skill} skill={skill} value={values[skill]} />
      ))}
    </div>
  );
}
