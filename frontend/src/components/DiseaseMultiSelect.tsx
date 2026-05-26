"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { searchDiseases, type Disease } from "@/lib/diseases-api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/lib/toast";
import { Loader2, X } from "lucide-react";

interface Props {
  id?: string;
  label?: string;
  value: string[];
  onChange: (conditions: string[]) => void;
  placeholder?: string;
}

function normalize(name: string) {
  return name.trim().toLowerCase();
}

export default function DiseaseMultiSelect({
  id: idProp,
  label = "Chronic conditions",
  value,
  onChange,
  placeholder = "Type to search diseases…",
}: Props) {
  const autoId = useId();
  const inputId = idProp ?? `conditions-${autoId}`;
  const listId = `${inputId}-suggestions`;

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Disease[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const closeDropdown = useCallback(() => {
    setOpen(false);
    setSuggestions([]);
  }, []);

  const selectedKey = value.map(normalize).join("\0");

  const addCondition = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      if (value.some((c) => normalize(c) === normalize(trimmed))) return;
      onChange([...value, trimmed]);
      setQuery("");
      closeDropdown();
    },
    [closeDropdown, onChange, value]
  );

  const removeCondition = useCallback(
    (name: string) => {
      onChange(value.filter((c) => normalize(c) !== normalize(name)));
    },
    [onChange, value]
  );

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeDropdown, open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length > 0 && q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const results = await searchDiseases(q, 25, controller.signal);
        const taken = new Set(value.map(normalize));
        setSuggestions(results.filter((d) => !taken.has(normalize(d.name))));
      } catch (err) {
        if (controller.signal.aborted) return;
        setSuggestions([]);
        setError(errorMessage(err, "Could not load suggestions"));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 280);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, open, selectedKey, value]);

  const showDropdown = open;

  return (
    <div ref={wrapRef} className="space-y-2">
      <Label htmlFor={inputId}>{label}</Label>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((name) => (
            <Badge
              key={name}
              variant="secondary"
              className="gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-brand hover:bg-primary/15"
            >
              {name}
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-primary/20"
                aria-label={`Remove ${name}`}
                onClick={() => removeCondition(name)}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <div className="relative">
        <Input
          id={inputId}
          value={query}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const match = suggestions[0];
              if (match) {
                addCondition(match.name);
              } else if (query.trim()) {
                addCondition(query);
              }
            }
            if (e.key === "Escape") {
              closeDropdown();
            }
            if (e.key === "Backspace" && !query && value.length > 0) {
              removeCondition(value[value.length - 1]);
            }
          }}
        />

        {showDropdown && (
          <div
            id={listId}
            role="listbox"
            className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-line/80 bg-card shadow-(--shadow-card)"
          >
            {loading && (
              <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Searching…
              </div>
            )}
            {!loading && error && (
              <p className="px-3 py-2.5 text-sm text-coral">{error}</p>
            )}
            {!loading && !error && suggestions.length === 0 && (
              <p className="px-3 py-2.5 text-sm text-muted-foreground">
                {query.trim()
                  ? "No matches — press Enter to add as custom condition"
                  : "Start typing to search the disease catalog"}
              </p>
            )}
            {!loading && !error && suggestions.length > 0 && (
              <ScrollArea className="max-h-48">
                <ul className="p-1">
                  {suggestions.map((disease) => (
                    <li key={disease.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={false}
                        className={cn(
                          "flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm",
                          "hover:bg-primary/10 focus:bg-primary/10 focus:outline-none"
                        )}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => addCondition(disease.name)}
                      >
                        <span className="font-medium">{disease.name}</span>
                        {disease.category && (
                          <span className="text-xs text-muted-foreground">
                            {disease.category}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Search 100+ conditions from the database. Select multiple; press Enter to
        add a custom name.
      </p>
    </div>
  );
}
