"use client";

import { HealthProfile } from "@/lib/types";
import { card, input, sectionSubtitle, sectionTitle } from "@/lib/ui";

interface Props {
  profile: HealthProfile;
  onChange: (profile: HealthProfile) => void;
}

const AGE_RANGES = [
  "0-17",
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55-64",
  "65+",
];

export default function HealthProfileForm({ profile, onChange }: Props) {
  const update = (partial: Partial<HealthProfile>) =>
    onChange({ ...profile, ...partial });

  return (
    <section className={`${card} space-y-4 p-5`}>
      <div className="border-b border-line/60 pb-4">
        <p className={sectionSubtitle}>Context</p>
        <h2 className={sectionTitle}>Health profile</h2>
        <p className="mt-1 text-xs text-stone">
          Helps tailor guidance to you.
        </p>
      </div>

      <label className="block text-sm">
        <span className="mb-1.5 block text-xs font-medium text-stone">
          Age range
        </span>
        <select
          className={input}
          value={profile.ageRange}
          onChange={(e) => update({ ageRange: e.target.value })}
        >
          {AGE_RANGES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block text-xs font-medium text-stone">
          Sex (optional)
        </span>
        <input
          className={input}
          value={profile.sex ?? ""}
          onChange={(e) => update({ sex: e.target.value || undefined })}
          placeholder="e.g. female, male"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block text-xs font-medium text-stone">
          Chronic conditions
        </span>
        <input
          className={input}
          value={profile.conditions.join(", ")}
          onChange={(e) =>
            update({
              conditions: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder="e.g. asthma, diabetes"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block text-xs font-medium text-stone">
          Allergies
        </span>
        <input
          className={input}
          value={profile.allergies.join(", ")}
          onChange={(e) =>
            update({
              allergies: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder="e.g. penicillin"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block text-xs font-medium text-stone">
          Medications
        </span>
        <textarea
          className={input}
          rows={2}
          value={profile.medications}
          onChange={(e) => update({ medications: e.target.value })}
          placeholder="List any medications you take"
        />
      </label>

      <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line/60 bg-canvas px-3 py-2.5 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-line text-brand accent-[#5b6cff]"
          checked={!!profile.pregnant}
          onChange={(e) => update({ pregnant: e.target.checked })}
        />
        Currently pregnant
      </label>
    </section>
  );
}
