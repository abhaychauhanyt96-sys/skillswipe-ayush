"use client";

import React, { useEffect, useState } from "react";
import { TaxonomySkill, TaxonomySkillSelection, SkillProficiency } from "@/types";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";
import {
  CheckSquare2,
  Square,
  Sparkles,
  BookOpen,
  Award,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

interface TaxonomySkillsChecklistProps {
  selectedTrackId: string;
  selectedTrackName?: string;
  value: TaxonomySkillSelection[];
  onChange: (
    selections: TaxonomySkillSelection[],
    skillDetailsMap: Record<string, TaxonomySkill>
  ) => void;
}

export function TaxonomySkillsChecklist({
  selectedTrackId,
  selectedTrackName,
  value,
  onChange,
}: TaxonomySkillsChecklistProps) {
  const [skills, setSkills] = useState<TaxonomySkill[]>([]);
  const [skillsMap, setSkillsMap] = useState<Record<string, TaxonomySkill>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTaxonomySkills() {
      if (!selectedTrackId) return;

      try {
        setLoading(true);
        setError(null);
        // Query skillsTaxonomy where tracks array contains selectedTrackId
        const q = query(
          collection(db, "skillsTaxonomy"),
          where("tracks", "array-contains", selectedTrackId)
        );
        const snapshot = await getDocs(q);

        const loadedSkills: TaxonomySkill[] = [];
        const map: Record<string, TaxonomySkill> = {};

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const skillItem: TaxonomySkill = {
            id: docSnap.id,
            name: data.name || docSnap.id,
            tracks: data.tracks || [],
            description: data.description || "",
            isMicroCredential: !!data.isMicroCredential,
            courses: data.courses || [],
          };
          loadedSkills.push(skillItem);
          map[skillItem.id] = skillItem;
        });

        // Separate core competencies first, then micro-credentials
        loadedSkills.sort((a, b) => {
          if (a.isMicroCredential === b.isMicroCredential) {
            return a.name.localeCompare(b.name);
          }
          return a.isMicroCredential ? 1 : -1;
        });

        setSkills(loadedSkills);
        setSkillsMap(map);
      } catch (err: any) {
        console.error("Failed to fetch skills taxonomy:", err);
        setError("Unable to load taxonomy competencies for this track.");
      } finally {
        setLoading(false);
      }
    }

    fetchTaxonomySkills();
  }, [selectedTrackId]);

  const isSkillChecked = (skillId: string) => {
    return value.some((item) => item.skillId === skillId);
  };

  const getSkillProficiency = (skillId: string): SkillProficiency => {
    const item = value.find((s) => s.skillId === skillId);
    return item ? item.proficiencyLevel : "intermediate";
  };

  const handleToggleSkill = (skillId: string) => {
    const exists = isSkillChecked(skillId);
    let newSelections: TaxonomySkillSelection[];

    if (exists) {
      newSelections = value.filter((item) => item.skillId !== skillId);
    } else {
      newSelections = [
        ...value,
        { skillId, proficiencyLevel: "intermediate" },
      ];
    }

    onChange(newSelections, skillsMap);
  };

  const handleProficiencyChange = (
    skillId: string,
    proficiencyLevel: SkillProficiency
  ) => {
    const newSelections = value.map((item) =>
      item.skillId === skillId ? { ...item, proficiencyLevel } : item
    );
    onChange(newSelections, skillsMap);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center space-y-2 rounded-xl border border-brand-navy/10 bg-white p-6">
        <Loader2 className="h-6 w-6 animate-spin text-brand-gold" />
        <p className="text-xs font-medium text-brand-slate">
          Loading competencies for {selectedTrackName || "selected track"}...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-brand-brick/30 bg-brand-brick/10 p-3 text-xs text-brand-brick">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  const selectedCount = value.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-slate">
            Curated Competencies for {selectedTrackName || "Track"}
          </span>
          <p className="mt-0.5 text-xs text-brand-slate">
            Check the competencies you possess and specify your level of experience.
          </p>
        </div>
        <span className="rounded-full bg-brand-teal/10 px-2.5 py-1 text-xs font-bold text-brand-teal border border-brand-teal/20 font-mono">
          {selectedCount} of {skills.length} Calibrated
        </span>
      </div>

      <div className="grid gap-3">
        {skills.map((skill) => {
          const checked = isSkillChecked(skill.id);
          const currentLevel = getSkillProficiency(skill.id);

          return (
            <div
              key={skill.id}
              id={`taxonomy-skill-${skill.id}`}
              className={`rounded-xl border p-4 transition-all ${
                checked
                  ? "border-brand-navy bg-white shadow-xs"
                  : "border-brand-navy/15 bg-white/60 hover:border-brand-navy/30 hover:bg-white"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Checkbox + Title + Description */}
                <div
                  onClick={() => handleToggleSkill(skill.id)}
                  className="flex items-start gap-3 cursor-pointer select-none flex-1"
                >
                  <button
                    type="button"
                    aria-label={`Select ${skill.name}`}
                    className="mt-0.5 text-brand-navy hover:text-brand-teal transition-colors"
                  >
                    {checked ? (
                      <CheckSquare2 className="h-5 w-5 text-brand-teal" />
                    ) : (
                      <Square className="h-5 w-5 text-brand-slate/40" />
                    )}
                  </button>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-sm font-bold ${
                          checked ? "text-brand-navy" : "text-brand-navy/80"
                        }`}
                      >
                        {skill.name}
                      </span>
                      {skill.isMicroCredential ? (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-200">
                          <Award className="h-3 w-3" />
                          Micro-Credential (1-4 wks)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-200">
                          <ShieldCheck className="h-3 w-3" />
                          Core Competency
                        </span>
                      )}
                    </div>
                    {skill.description && (
                      <p className="text-xs text-brand-slate leading-relaxed">
                        {skill.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Proficiency Level Dropdown (active when checked) */}
                {checked && (
                  <div className="flex items-center gap-2 sm:self-center pl-8 sm:pl-0">
                    <label
                      htmlFor={`level-select-${skill.id}`}
                      className="text-[11px] font-semibold uppercase tracking-wider text-brand-slate whitespace-nowrap"
                    >
                      Proficiency:
                    </label>
                    <select
                      id={`level-select-${skill.id}`}
                      value={currentLevel}
                      onChange={(e) =>
                        handleProficiencyChange(
                          skill.id,
                          e.target.value as SkillProficiency
                        )
                      }
                      className="rounded-md border border-brand-navy/20 bg-brand-paper/50 px-2.5 py-1 text-xs text-brand-navy font-medium focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
