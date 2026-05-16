"use client";

import { HealthProfile } from "@/lib/types";
import { sectionSubtitle, sectionTitle } from "@/lib/ui";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  profile: HealthProfile;
  onChange: (profile: HealthProfile) => void;
  /** When true, renders fields only (no outer Card) — for /profile page */
  embedded?: boolean;
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

const SEX_UNSPECIFIED = "unspecified";

const SEX_OPTIONS = [
  { value: SEX_UNSPECIFIED, label: "Prefer not to say" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
] as const;

export default function HealthProfileForm({
  profile,
  onChange,
  embedded = false,
}: Props) {
  const update = (partial: Partial<HealthProfile>) =>
    onChange({ ...profile, ...partial });

  const fields = (
    <>
        <div className="space-y-2">
          <Label htmlFor="age-range">Age range</Label>
          <Select
            value={profile.ageRange}
            onValueChange={(value) => {
              if (value) update({ ageRange: value });
            }}
          >
            <SelectTrigger id="age-range" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AGE_RANGES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sex">Sex (optional)</Label>
          <Select
            value={
              profile.sex &&
              SEX_OPTIONS.some((o) => o.value === profile.sex)
                ? profile.sex
                : SEX_UNSPECIFIED
            }
            onValueChange={(value) => {
              if (!value) return;
              update({
                sex: value === SEX_UNSPECIFIED ? undefined : value,
              });
            }}
          >
            <SelectTrigger id="sex" className="w-full">
              <SelectValue placeholder="Select sex" />
            </SelectTrigger>
            <SelectContent>
              {SEX_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="conditions">Chronic conditions</Label>
          <Input
            id="conditions"
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="allergies">Allergies</Label>
          <Input
            id="allergies"
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="medications">Medications</Label>
          <Textarea
            id="medications"
            rows={2}
            value={profile.medications}
            onChange={(e) => update({ medications: e.target.value })}
            placeholder="List any medications you take"
          />
        </div>

        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-3">
          <Checkbox
            id="pregnant"
            checked={!!profile.pregnant}
            onCheckedChange={(checked) =>
              update({ pregnant: checked === true })
            }
          />
          <Label htmlFor="pregnant" className="cursor-pointer font-normal">
            Currently pregnant
          </Label>
        </div>
    </>
  );

  const header = embedded ? (
    <>
      <p className={sectionSubtitle}>Health</p>
      <CardTitle className={sectionTitle}>Health profile</CardTitle>
      <CardDescription>
        Used when you request care guidance on the consult screen.
      </CardDescription>
    </>
  ) : (
    <>
      <p className={sectionSubtitle}>Context</p>
      <CardTitle className={sectionTitle}>Health profile</CardTitle>
      <CardDescription>Helps tailor guidance to you.</CardDescription>
    </>
  );

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader className="border-b">{header}</CardHeader>
      <CardContent className="space-y-4">{fields}</CardContent>
    </Card>
  );
}