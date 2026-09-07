"use client";

import React, { useState } from "react";
import { StudentSkill, SkillProficiency } from "@/types";
import { Plus, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SkillChipInputProps {
  skills: StudentSkill[];
  onChange: (skills: StudentSkill[]) => void;
}

const POPULAR_SKILLS = [
  "React",
  "Node.js",
  "Python",
  "TypeScript",
  "Machine Learning",
  "Next.js",
  "Tailwind CSS",
  "Firebase",
  "SQL",
  "Data Analysis",
  "Figma",
  "Docker",
];

export function SkillChipInput({ skills, onChange }: SkillChipInputProps) {
  const [skillName, setSkillName] = useState("");
  const [level, setLevel] = useState<SkillProficiency>("intermediate");

  const handleAddSkill = (nameToAdd?: string) => {
    const finalName = (nameToAdd || skillName).trim();
    if (!finalName) return;

    // Check if skill already exists (case-insensitive)
    if (skills.some((s) => s.name.toLowerCase() === finalName.toLowerCase())) {
      return;
    }

    const newSkill: StudentSkill = {
      name: finalName,
      level,
      verified: false,
    };

    onChange([...skills, newSkill]);
    setSkillName("");
  };

  const handleRemoveSkill = (nameToRemove: string) => {
    onChange(skills.filter((s) => s.name !== nameToRemove));
  };

  const getLevelBadgeStyle = (lvl: SkillProficiency) => {
    switch (lvl) {
      case "beginner":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "intermediate":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "expert":
        return "bg-emerald-50 text-emerald-800 border-emerald-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Skill Input Form */}
      <div className="rounded-xl border border-brand-navy/15 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-12 items-end">
          <div className="sm:col-span-6">
            <label
              htmlFor="skill-name-input"
              className="block text-xs font-semibold uppercase tracking-wider text-brand-slate"
            >
              Skill Name
            </label>
            <input
              id="skill-name-input"
              type="text"
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddSkill();
                }
              }}
              placeholder="e.g. React, Python, Product Design..."
              className="mt-1.5 block w-full rounded-md border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2 text-sm text-brand-navy placeholder:text-brand-slate/50 focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy"
            />
          </div>

          <div className="sm:col-span-4">
            <label
              htmlFor="skill-level-select"
              className="block text-xs font-semibold uppercase tracking-wider text-brand-slate"
            >
              Proficiency Level
            </label>
            <select
              id="skill-level-select"
              value={level}
              onChange={(e) => setLevel(e.target.value as SkillProficiency)}
              className="mt-1.5 block w-full rounded-md border border-brand-navy/20 bg-brand-paper/30 px-3 py-2 text-sm text-brand-navy focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy"
            >
              <option value="beginner">Beginner (Foundational)</option>
              <option value="intermediate">Intermediate (Working knowledge)</option>
              <option value="expert">Expert (Production-ready)</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <Button
              id="add-skill-btn"
              type="button"
              onClick={() => handleAddSkill()}
              disabled={!skillName.trim()}
              className="w-full h-10"
            >
              <Plus className="h-4 w-4 mr-1" />
              <span>Add</span>
            </Button>
          </div>
        </div>

        {/* Quick Suggestion Tags */}
        <div className="mt-4 pt-4 border-t border-brand-navy/10">
          <div className="flex items-center gap-1.5 text-xs text-brand-slate">
            <Sparkles className="h-3.5 w-3.5 text-brand-gold" />
            <span className="font-medium">Quick suggestions:</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {POPULAR_SKILLS.map((item) => {
              const alreadyAdded = skills.some(
                (s) => s.name.toLowerCase() === item.toLowerCase()
              );
              return (
                <button
                  key={item}
                  type="button"
                  disabled={alreadyAdded}
                  onClick={() => handleAddSkill(item)}
                  className={`rounded-full px-2.5 py-1 text-xs transition-all ${
                    alreadyAdded
                      ? "opacity-40 cursor-not-allowed bg-gray-100 text-gray-500"
                      : "bg-brand-paper border border-brand-navy/15 text-brand-navy hover:border-brand-gold hover:bg-brand-gold/10"
                  }`}
                >
                  + {item}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Added Skills Chips Display */}
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-slate">
            Added Skills ({skills.length})
          </span>
          {skills.length === 0 && (
            <span className="text-xs text-brand-brick font-medium">
              * Add at least 1 skill to continue
            </span>
          )}
        </div>

        {skills.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-brand-navy/20 bg-white/40 p-6 text-center text-xs text-brand-slate">
            No skills added yet. Type a skill above or tap the suggestions to build your vector matching profile.
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2.5">
            {skills.map((s) => (
              <div
                key={s.name}
                id={`skill-chip-${s.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                className="group inline-flex items-center gap-2 rounded-lg border border-brand-navy/20 bg-white px-3 py-1.5 text-sm shadow-xs transition-all hover:border-brand-navy/40"
              >
                <span className="font-semibold text-brand-navy">{s.name}</span>
                <span
                  className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getLevelBadgeStyle(
                    s.level
                  )}`}
                >
                  {s.level}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(s.name)}
                  aria-label={`Remove ${s.name}`}
                  className="rounded-full p-0.5 text-brand-slate hover:bg-brand-brick/10 hover:text-brand-brick transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
