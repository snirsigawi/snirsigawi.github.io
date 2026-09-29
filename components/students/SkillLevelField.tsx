"use client";

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

export function SkillLevelField({
  values,
}: {
  values: Record<Skill, SkillLevelValue>;
}) {
  return (
    <div className="space-y-6">
      {SKILLS.map((skill) => {
        const v = values[skill];
        return (
          <div
            key={skill}
            className="rounded-xl border border-border bg-muted/20 p-4"
          >
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
                  defaultValue={v.level}
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
                  {SKILL_TAGS.map((tag) => {
                    const checked = v.tags.includes(tag);
                    return (
                      <label
                        key={tag}
                        className={`cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors ${
                          checked
                            ? "border-brand bg-brand/10 text-brand"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        <input
                          type="checkbox"
                          name={`tags.${skill}`}
                          value={tag}
                          defaultChecked={checked}
                          className="sr-only"
                        />
                        {tag}
                      </label>
                    );
                  })}
                </div>
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
                  defaultValue={v.note}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-brand"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
