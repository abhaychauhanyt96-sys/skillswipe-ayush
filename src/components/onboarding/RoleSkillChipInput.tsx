"use client";

import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RoleSkillChipInputProps {
  skills: string[];
  onChange: (skills: string[]) => void;
  label?: string;
  placeholder?: string;
}

const COMMON_ROLE_SKILLS = [
  "React",
  "Node.js",
  "TypeScript",
  "Python",
  "Next.js",
  "Tailwind CSS",
  "Firebase",
  "SQL",
  "AWS",
  "Docker",
  "UI/UX Design",
  "Machine Learning",
];

export function RoleSkillChipInput({
  skills,
  onChange,
  label = "Required Skills *",
  placeholder = "e.g. React, Node.js, SQL...",
}: RoleSkillChipInputProps) {
  const [inputVal, setInputVal] = useState("");

  const handleAdd = (skillToAdd?: string) => {
    const clean = (skillToAdd || inputVal).trim();
    if (!clean) return;

    if (!skills.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      onChange([...skills, clean]);
    }
    setInputVal("");
  };

  const handleRemove = (skillToRemove: string) => {
    onChange(skills.filter((s) => s !== skillToRemove));
  };

  return (
    <div className="space-y-3">
      <label className="block text-xs font-semibold uppercase tracking-wider text-brand-slate">
        {label}
      </label>

      <div className="flex gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder={placeholder}
          className="block flex-1 rounded-md border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2 text-sm text-brand-navy placeholder:text-brand-slate/50 focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy"
        />
        <Button
          type="button"
          size="sm"
          onClick={() => handleAdd()}
          disabled={!inputVal.trim()}
          className="h-10"
        >
          <Plus className="h-4 w-4 mr-1" />
          <span>Add</span>
        </Button>
      </div>

      {/* Suggested Quick Tags */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {COMMON_ROLE_SKILLS.map((item) => {
          const added = skills.some((s) => s.toLowerCase() === item.toLowerCase());
          return (
            <button
              key={item}
              type="button"
              disabled={added}
              onClick={() => handleAdd(item)}
              className={`rounded-full px-2 py-0.5 text-[11px] transition-all ${
                added
                  ? "opacity-35 cursor-not-allowed bg-gray-100 text-gray-400"
                  : "bg-brand-paper border border-brand-navy/15 text-brand-navy hover:border-brand-teal hover:bg-brand-teal/10"
              }`}
            >
              + {item}
            </button>
          );
        })}
      </div>

      {/* Active Chips */}
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-brand-navy/10">
          {skills.map((skill) => (
            <span
              key={skill}
              className="inline-flex items-center gap-1.5 rounded-md border border-brand-teal/30 bg-brand-teal/10 px-2.5 py-1 text-xs font-semibold text-brand-teal"
            >
              <span>{skill}</span>
              <button
                type="button"
                onClick={() => handleRemove(skill)}
                className="rounded-full p-0.5 hover:bg-brand-teal/20"
                aria-label={`Remove ${skill}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
