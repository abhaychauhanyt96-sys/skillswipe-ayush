"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { UserRole } from "@/types";
import {
  GraduationCap,
  Building2,
  Award,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export default function RoleSelectPage() {
  const { user, selectRole, refreshUserProfile } = useAuth();
  const router = useRouter();
  const [selected, setSelected] = useState<UserRole | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRoleSelection = async (role: UserRole) => {
    setSelected(role);
    setSubmitting(true);
    setError(null);

    try {
      await selectRole(role);
      await refreshUserProfile();

      // Redirect according to blueprint specifications
      if (role === "student") {
        router.push("/onboarding/student");
      } else if (role === "company") {
        router.push("/onboarding/company");
      } else if (role === "academician") {
        router.push("/onboarding/academician");
      }
    } catch (err: any) {
      console.error("Failed to set role:", err);
      setError("Failed to save your role. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="mx-auto min-h-[calc(100vh-4rem)] max-w-5xl px-4 py-12 sm:px-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-gold/30 bg-brand-gold/10 px-3.5 py-1 text-xs font-semibold text-[#8f6a00]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Step 1 of Onboarding</span>
          </div>
          <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
            Choose your role on SkillSwipe
          </h1>
          <p className="mt-2 text-sm text-brand-slate max-w-xl mx-auto">
            Welcome, <span className="font-semibold text-brand-navy">{user?.displayName || user?.email}</span>. Select how you will participate in the mutual-matching portal.
          </p>
        </div>

        {error && (
          <div className="mx-auto mt-6 max-w-md rounded-md bg-brand-brick/10 border border-brand-brick/30 p-3 text-center text-xs text-brand-brick">
            {error}
          </div>
        )}

        {/* 3 Large Interactive Cards */}
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {/* 1. Student Card */}
          <button
            id="role-card-student"
            type="button"
            disabled={submitting}
            onClick={() => handleRoleSelection("student")}
            className={`group relative flex flex-col justify-between rounded-xl border-2 p-6 text-left transition-all duration-200 bg-white hover:shadow-lg ${
              selected === "student"
                ? "border-brand-navy bg-brand-paper/50 ring-2 ring-brand-navy"
                : "border-brand-navy/15 hover:border-brand-navy/40"
            }`}
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-navy text-brand-gold transition-transform group-hover:scale-105">
                <GraduationCap className="h-6 w-6" />
              </div>

              <div className="mt-5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-slate">
                  For Candidates
                </span>
                <h2 className="mt-1 font-serif text-xl font-bold text-brand-navy">
                  I&apos;m a Student
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-brand-slate">
                  Build your verified skill profile, swipe on matching roles, and connect directly when interest is mutual.
                </p>
              </div>

              <ul className="mt-6 space-y-2 border-t border-brand-navy/10 pt-4 text-xs text-brand-slate">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-teal shrink-0" />
                  <span>Verified project & skill badges</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-teal shrink-0" />
                  <span>Explainable compatibility scoring</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-teal shrink-0" />
                  <span>No one-way cold resume drops</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-brand-navy/10 pt-4">
              <span className="text-xs font-semibold text-brand-navy group-hover:text-brand-gold transition-colors">
                {submitting && selected === "student" ? "Saving..." : "Continue as Student"}
              </span>
              <ArrowRight className="h-4 w-4 text-brand-navy transition-transform group-hover:translate-x-1" />
            </div>
          </button>

          {/* 2. Company Card */}
          <button
            id="role-card-company"
            type="button"
            disabled={submitting}
            onClick={() => handleRoleSelection("company")}
            className={`group relative flex flex-col justify-between rounded-xl border-2 p-6 text-left transition-all duration-200 bg-white hover:shadow-lg ${
              selected === "company"
                ? "border-brand-teal bg-brand-paper/50 ring-2 ring-brand-teal"
                : "border-brand-navy/15 hover:border-brand-teal/50"
            }`}
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-teal text-white transition-transform group-hover:scale-105">
                <Building2 className="h-6 w-6" />
              </div>

              <div className="mt-5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-slate">
                  For Industry & Recruiters
                </span>
                <h2 className="mt-1 font-serif text-xl font-bold text-brand-navy">
                  I&apos;m a Company
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-brand-slate">
                  Post internships and roles, review ranked student cards, and interview only candidates who enthusiastically opt in.
                </p>
              </div>

              <ul className="mt-6 space-y-2 border-t border-brand-navy/10 pt-4 text-xs text-brand-slate">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-teal shrink-0" />
                  <span>Zero 500-resume inbox flooding</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-teal shrink-0" />
                  <span>Skill-overlap vector matching</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-teal shrink-0" />
                  <span>Instant auto-match notifications</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-brand-navy/10 pt-4">
              <span className="text-xs font-semibold text-brand-navy group-hover:text-brand-teal transition-colors">
                {submitting && selected === "company" ? "Saving..." : "Continue as Company"}
              </span>
              <ArrowRight className="h-4 w-4 text-brand-navy transition-transform group-hover:translate-x-1" />
            </div>
          </button>

          {/* 3. Academician Card */}
          <button
            id="role-card-academician"
            type="button"
            disabled={submitting}
            onClick={() => handleRoleSelection("academician")}
            className={`group relative flex flex-col justify-between rounded-xl border-2 p-6 text-left transition-all duration-200 bg-white hover:shadow-lg ${
              selected === "academician"
                ? "border-brand-gold bg-brand-paper/50 ring-2 ring-brand-gold"
                : "border-brand-navy/15 hover:border-brand-gold/60"
            }`}
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-navy text-brand-gold transition-transform group-hover:scale-105">
                <Award className="h-6 w-6" />
              </div>

              <div className="mt-5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-slate">
                  For Faculty & Researchers
                </span>
                <h2 className="mt-1 font-serif text-xl font-bold text-brand-navy">
                  I&apos;m an Academician
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-brand-slate">
                  Partner with companies for FDPs, joint research consultancies, and track institutional curriculum-to-industry gaps.
                </p>
              </div>

              <ul className="mt-6 space-y-2 border-t border-brand-navy/10 pt-4 text-xs text-brand-slate">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-teal shrink-0" />
                  <span>Faculty Development Programs (FDP)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-teal shrink-0" />
                  <span>Industrial consultancy projects</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-teal shrink-0" />
                  <span>Full SIH206644 track alignment</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-brand-navy/10 pt-4">
              <span className="text-xs font-semibold text-brand-navy group-hover:text-brand-gold transition-colors">
                {submitting && selected === "academician" ? "Saving..." : "Continue as Academician"}
              </span>
              <ArrowRight className="h-4 w-4 text-brand-navy transition-transform group-hover:translate-x-1" />
            </div>
          </button>
        </div>
      </div>
    </ProtectedRoute>
  );
}
