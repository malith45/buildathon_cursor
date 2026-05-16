"use client";

import { HealthProfile } from "@/lib/types";

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
    <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold">Health profile</h2>

      <label className="block text-sm">
        <span className="mb-1 block text-zinc-600 dark:text-zinc-400">
          Age range
        </span>
        <select
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
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
        <span className="mb-1 block text-zinc-600 dark:text-zinc-400">
          Sex (optional)
        </span>
        <input
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          value={profile.sex ?? ""}
          onChange={(e) => update({ sex: e.target.value || undefined })}
          placeholder="e.g. female, male"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-zinc-600 dark:text-zinc-400">
          Chronic conditions (comma-separated)
        </span>
        <input
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
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
        <span className="mb-1 block text-zinc-600 dark:text-zinc-400">
          Allergies (comma-separated)
        </span>
        <input
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
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
        <span className="mb-1 block text-zinc-600 dark:text-zinc-400">
          Medications (free text)
        </span>
        <textarea
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          rows={2}
          value={profile.medications}
          onChange={(e) => update({ medications: e.target.value })}
          placeholder="List any medications you take"
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={!!profile.pregnant}
          onChange={(e) => update({ pregnant: e.target.checked })}
        />
        Currently pregnant
      </label>
    </section>
  );
}
