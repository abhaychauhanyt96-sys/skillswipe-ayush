"use client";

import React, { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  Student,
  CareerTrack,
  TaxonomySkill,
  TaxonomySkillCourse,
  SkillProficiency,
} from "@/types";
import { Button } from "@/components/ui/button";
import {
  Compass,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  GraduationCap,
  Sparkles,
  ExternalLink,
  BookOpen,
  Award,
  ShieldCheck,
  Clock,
  ArrowRight,
  TrendingUp,
  Layers,
  HelpCircle,
  Loader2,
  Landmark,
  Building,
} from "lucide-react";
import Link from "next/link";

interface EvaluatedTaxonomySkill extends TaxonomySkill {
  acquired: boolean;
  proficiencyLevel?: SkillProficiency;
}

export default function StudentSkillGapPage() {
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [track, setTrack] = useState<CareerTrack | null>(null);
  const [allTrackSkills, setAllTrackSkills] = useState<EvaluatedTaxonomySkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSkillGapAnalysis() {
      if (!user) return;
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch Student Profile
        const studentRef = doc(db, "students", user.uid);
        const studentSnap = await getDoc(studentRef);

        if (!studentSnap.exists()) {
          setLoading(false);
          return;
        }

        const studentData = studentSnap.data() as Student;
        setStudent(studentData);

        const selectedTrackId = studentData.selectedTrack;

        // If no track selected or student selected "still exploring" (null/undefined)
        if (!selectedTrackId) {
          setLoading(false);
          return;
        }

        // 2. Fetch Career Track Document
        const trackRef = doc(db, "careerTracks", selectedTrackId);
        const trackSnap = await getDoc(trackRef);
        if (trackSnap.exists()) {
          const trackData = trackSnap.data();
          setTrack({
            id: trackSnap.id,
            name: trackData.name || trackSnap.id,
            idealFor: trackData.idealFor || "",
            targetRoles: trackData.targetRoles || [],
            exampleEmployers: trackData.exampleEmployers || [],
          });
        }

        // 3. Fetch all skillsTaxonomy where tracks contains selectedTrackId
        const taxonomyQuery = query(
          collection(db, "skillsTaxonomy"),
          where("tracks", "array-contains", selectedTrackId)
        );
        const taxSnap = await getDocs(taxonomyQuery);

        const evaluated: EvaluatedTaxonomySkill[] = [];
        const studentTaxSkills = studentData.taxonomySkills || [];
        const studentRegularSkills = studentData.skills || [];

        taxSnap.forEach((d) => {
          const data = d.data();
          const skillId = d.id;
          const skillName = data.name || skillId;

          // Check if student has this skill either by taxonomySkills ID match or by skill name match
          const foundInTax = studentTaxSkills.find((ts) => ts.skillId === skillId);
          const foundInRegular = studentRegularSkills.find(
            (rs) => rs.name.toLowerCase().trim() === skillName.toLowerCase().trim()
          );

          const acquired = !!(foundInTax || foundInRegular);
          const proficiencyLevel = foundInTax
            ? foundInTax.proficiencyLevel
            : foundInRegular
            ? foundInRegular.level
            : undefined;

          evaluated.push({
            id: skillId,
            name: skillName,
            tracks: data.tracks || [],
            description: data.description || "",
            isMicroCredential: !!data.isMicroCredential,
            courses: data.courses || [],
            acquired,
            proficiencyLevel,
          });
        });

        // Sort: Core competencies first, then micro-credentials
        evaluated.sort((a, b) => {
          if (a.isMicroCredential === b.isMicroCredential) {
            return a.name.localeCompare(b.name);
          }
          return a.isMicroCredential ? 1 : -1;
        });

        setAllTrackSkills(evaluated);
      } catch (err: any) {
        console.error("Failed to load skill gap report:", err);
        setError(err.message || "Failed to load skill gap data.");
      } finally {
        setLoading(false);
      }
    }

    loadSkillGapAnalysis();
  }, [user]);

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["student"]}>
        <div className="mx-auto min-h-[calc(100vh-4rem)] max-w-5xl px-4 py-10 sm:px-6 space-y-6">
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 rounded-2xl border border-brand-navy/15 bg-white p-8 shadow-sm">
            <Loader2 className="h-10 w-10 animate-spin text-brand-gold" />
            <div className="space-y-1">
              <h2 className="font-serif text-xl font-bold text-brand-navy">
                Generating Skill Gap Dossier...
              </h2>
              <p className="text-xs text-brand-slate">
                Benchmarking candidate competencies against official AYUSH career taxonomy.
              </p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // EMPTY STATE: Student chose "Still exploring" or hasn't selected a track yet
  if (!student?.selectedTrack) {
    return (
      <ProtectedRoute allowedRoles={["student"]}>
        <div className="mx-auto min-h-[calc(100vh-4rem)] max-w-5xl px-4 py-10 sm:px-6 space-y-6">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-xs text-brand-slate">
            <Link href="/dashboard/student" className="hover:text-brand-navy transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="font-semibold text-brand-navy">Skill Gap Report</span>
          </div>

          <div className="rounded-2xl border-2 border-dashed border-brand-navy/20 bg-white p-10 sm:p-14 text-center shadow-xs">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-brand-gold border border-amber-200">
              <Compass className="h-8 w-8" />
            </div>
            <h1 className="mt-5 font-serif text-2xl font-bold text-brand-navy sm:text-3xl">
              No Career Track Selected Yet
            </h1>
            <p className="mt-2 text-sm text-brand-slate max-w-xl mx-auto leading-relaxed">
              Skill Gap Reports analyze your current competencies against the specific requirements of an AYUSH sector (such as Ayurvedic Pharma & R&D, Clinical Research, or Wellness Resorts).
            </p>
            <p className="mt-1 text-xs text-brand-slate/80 max-w-lg mx-auto">
              You selected <strong>&quot;Still exploring&quot;</strong> during onboarding. To generate your customized coverage benchmark and micro-credential pathways, select a target track.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/onboarding/student">
                <Button className="bg-brand-navy text-brand-gold hover:bg-[#182344] px-6 shadow-md">
                  <Compass className="h-4 w-4 mr-2 text-brand-gold" />
                  <span>Choose Career Track</span>
                </Button>
              </Link>
              <Link href="/dashboard/student">
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // COMPUTED SKILL GAP METRICS
  const haveSkills = allTrackSkills.filter((s) => s.acquired);
  const missingSkills = allTrackSkills.filter((s) => !s.acquired);
  const totalSkillsCount = allTrackSkills.length;
  const coveragePercentage =
    totalSkillsCount > 0
      ? Math.round((haveSkills.length / totalSkillsCount) * 100)
      : 0;

  // "Quick Wins": Missing skills where isMicroCredential === true
  const quickWins = missingSkills.filter((s) => s.isMicroCredential);

  // Core missing skills (multi-month or foundational)
  const coreMissingGaps = missingSkills.filter((s) => !s.isMicroCredential);

  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <div className="mx-auto min-h-[calc(100vh-4rem)] max-w-5xl px-4 py-8 sm:px-6 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-brand-slate">
            <Link href="/dashboard/student" className="hover:text-brand-navy transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="font-semibold text-brand-navy">Skill Gap Report</span>
          </div>

          <Link href="/onboarding/student">
            <Button variant="outline" size="sm" className="text-xs">
              <Compass className="h-3.5 w-3.5 mr-1.5 text-brand-gold" />
              <span>Change Career Track</span>
            </Button>
          </Link>
        </div>

        {error && (
          <div className="flex items-center gap-3 rounded-lg border border-brand-brick/30 bg-brand-brick/10 p-4 text-xs text-brand-brick">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* SECTION 1: Executive Header Card */}
        <div className="rounded-2xl border border-brand-navy/15 bg-white p-6 sm:p-8 shadow-sm relative overflow-hidden">
          {/* Subtle watermark seal accent */}
          <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-brand-gold/10 pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-gold/40 bg-brand-gold/15 px-3 py-1 text-xs font-bold text-[#8E6503]">
                <Compass className="h-3.5 w-3.5 text-brand-gold" />
                <span>AYUSH Career Pathway Analysis</span>
              </div>

              <div>
                <h1 className="font-serif text-2xl font-bold text-brand-navy sm:text-3xl">
                  {track?.name || "AYUSH Career Track"}
                </h1>
                {track?.idealFor && (
                  <p className="mt-1.5 text-xs text-brand-slate max-w-2xl leading-relaxed">
                    <strong>Target Background:</strong> {track.idealFor}
                  </p>
                )}
              </div>

              {/* Target Roles Preview Badges */}
              {track?.targetRoles && track.targetRoles.length > 0 && (
                <div className="pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-slate flex items-center gap-1">
                    <Briefcase className="h-3 w-3 text-brand-teal" />
                    Target Industry Roles
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {track.targetRoles.map((role) => (
                      <span
                        key={role}
                        className="rounded bg-brand-paper px-2.5 py-1 text-xs font-semibold text-brand-navy border border-brand-navy/15"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Candidate Metadata Summary */}
            <div className="rounded-xl border border-brand-navy/10 bg-brand-paper/50 p-4 text-xs space-y-1.5 min-w-[240px] shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-brand-gold block">
                Candidate Dossier
              </span>
              <p className="font-serif text-sm font-bold text-brand-navy">
                {user?.displayName || "Student Candidate"}
              </p>
              <p className="text-brand-slate">
                {student?.basicInfo?.degree || "Degree"} • Class of {student?.basicInfo?.year || "2026"}
              </p>
              <p className="text-brand-slate truncate">
                {student?.basicInfo?.college || "Institution"}
              </p>
            </div>
          </div>

          {/* SECTION 2: Skill Coverage Benchmark Bar */}
          <div className="mt-8 border-t border-brand-navy/10 pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2.5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-slate">
                  Overall Career Track Competency Coverage
                </span>
                <p className="text-xs text-brand-slate">
                  Proportion of standard track competencies calibrated on your profile.
                </p>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="font-serif text-2xl font-bold text-brand-navy">
                  {coveragePercentage}%
                </span>
                <span className="text-xs font-mono text-brand-teal font-semibold">
                  ({haveSkills.length} of {totalSkillsCount} verified)
                </span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="h-3.5 w-full rounded-full bg-brand-paper border border-brand-navy/15 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-teal via-emerald-600 to-brand-gold transition-all duration-500 shadow-xs"
                style={{ width: `${Math.max(coveragePercentage, 4)}%` }}
              />
            </div>

            {/* 3 Status Metric Boxes */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-brand-teal/20 bg-brand-teal/5 p-3 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-teal">
                  Calibrated Skills
                </span>
                <p className="mt-1 font-serif text-xl font-bold text-brand-navy">
                  {haveSkills.length}
                </p>
                <span className="text-[10px] text-brand-slate">Ready on Profile</span>
              </div>

              <div className="rounded-lg border border-brand-brick/20 bg-brand-brick/5 p-3 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-brick">
                  Competency Gaps
                </span>
                <p className="mt-1 font-serif text-xl font-bold text-brand-navy">
                  {missingSkills.length}
                </p>
                <span className="text-[10px] text-brand-slate">To Be Completed</span>
              </div>

              <div className="rounded-lg border border-brand-gold/30 bg-amber-50/60 p-3 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E6503]">
                  Quick-Win Micro-Certs
                </span>
                <p className="mt-1 font-serif text-xl font-bold text-brand-navy">
                  {quickWins.length}
                </p>
                <span className="text-[10px] text-brand-slate">1–4 Weeks Duration</span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: "Quick Wins" High-ROI Micro-Credentials (1–4 Weeks) */}
        {quickWins.length > 0 && (
          <div className="rounded-2xl border-2 border-brand-gold/40 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/40 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-brand-gold/30 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-brand-gold" />
                  <h2 className="font-serif text-xl font-bold text-brand-navy">
                    Fast-Track Micro-Credentials (Learn in 1–4 Weeks)
                  </h2>
                </div>
                <p className="mt-1 text-xs text-brand-slate leading-relaxed">
                  These high-ROI nano-skills can be completed in a few weeks through free government portals or short certifications. Completing them immediately eliminates critical entry-level resume filters.
                </p>
              </div>

              <span className="rounded-full bg-brand-gold/20 px-3 py-1 text-xs font-bold text-[#8E6503] font-mono shrink-0">
                {quickWins.length} High-Yield Actions
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {quickWins.map((skill) => (
                <div
                  key={skill.id}
                  className="flex flex-col justify-between rounded-xl border border-brand-gold/40 bg-white p-5 shadow-xs transition-all hover:border-brand-gold hover:shadow-sm"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-serif text-base font-bold text-brand-navy">
                        {skill.name}
                      </h3>
                      <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-300 shrink-0">
                        <Clock className="h-3 w-3" />
                        1–4 Weeks
                      </span>
                    </div>

                    <p className="text-xs text-brand-slate leading-relaxed">
                      {skill.description}
                    </p>
                  </div>

                  {/* Course Options Preview */}
                  <div className="mt-4 pt-3 border-t border-brand-navy/10">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-slate block mb-1.5">
                      Recommended Fast-Track Course
                    </span>
                    {skill.courses && skill.courses.length > 0 ? (
                      <div className="space-y-1.5">
                        {skill.courses.map((c, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between gap-2 rounded bg-brand-paper/60 p-2 text-xs border border-brand-navy/10"
                          >
                            <span className="font-medium text-brand-navy truncate">
                              {c.provider}
                            </span>
                            {c.url ? (
                              <a
                                href={c.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-teal hover:underline shrink-0"
                              >
                                <span>Enroll</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-[10px] text-brand-slate font-mono">
                                Inquire at Institute
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-brand-slate italic">
                        Check AYUSH ministry portals for seasonal cohorts.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 4: Deep Skill Gap Breakdown (Missing Skills) */}
        <div className="space-y-4">
          <div className="border-b border-brand-navy/10 pb-3 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl font-bold text-brand-navy">
                Identified Competency Gaps ({missingSkills.length})
              </h2>
              <p className="text-xs text-brand-slate mt-0.5">
                Detailed breakdown of unmet requirements with curated government and industry learning pathways.
              </p>
            </div>
          </div>

          {missingSkills.length === 0 ? (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/60 p-8 text-center space-y-2">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
              <h3 className="font-serif text-lg font-bold text-emerald-900">
                Full Competency Benchmark Achieved!
              </h3>
              <p className="text-xs text-emerald-800 max-w-md mx-auto leading-relaxed">
                You have calibrated 100% of the foundational competencies for {track?.name}. Prospective employers will see your profile with maximum qualification status.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {missingSkills.map((skill) => {
                const govtCourses = skill.courses.filter((c) => c.type === "free-govt");
                const privateCourses = skill.courses.filter((c) => c.type === "private-global");

                return (
                  <div
                    key={skill.id}
                    id={`skill-gap-${skill.id}`}
                    className="rounded-xl border-2 border-brand-navy/15 bg-white p-5 sm:p-6 shadow-xs space-y-4 transition-all hover:border-brand-navy/30"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-navy/10 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-brick/10 text-brand-brick border border-brand-brick/20">
                          <AlertCircle className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-serif text-lg font-bold text-brand-navy">
                            {skill.name}
                          </h3>
                        </div>
                      </div>

                      <div>
                        {skill.isMicroCredential ? (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800 border border-amber-200">
                            <Clock className="h-3 w-3" />
                            Micro-Credential (1–4 Wks)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-800 border border-blue-200">
                            <ShieldCheck className="h-3 w-3" />
                            Core Track Competency
                          </span>
                        )}
                      </div>
                    </div>

                    {/* "Why It Matters" Description */}
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-slate block mb-1">
                        Why It Matters in Industry
                      </span>
                      <p className="text-xs text-brand-navy/80 leading-relaxed bg-brand-paper/50 p-3 rounded-lg border border-brand-navy/10">
                        {skill.description}
                      </p>
                    </div>

                    {/* Dual Learning Pathways: Free/Govt vs Private/Global */}
                    <div className="grid gap-4 md:grid-cols-2 pt-2">
                      {/* Column 1: Government & Free Accredited Programs */}
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-3.5 space-y-2.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                          <Landmark className="h-4 w-4 text-emerald-700" />
                          <span>Government & Free Modules</span>
                        </div>

                        {govtCourses.length > 0 ? (
                          <div className="space-y-2">
                            {govtCourses.map((c, idx) => (
                              <div
                                key={idx}
                                className="rounded bg-white p-2.5 text-xs border border-emerald-100 shadow-3xs space-y-1.5"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <span className="font-bold text-brand-navy leading-snug">
                                    {c.provider}
                                  </span>
                                  {c.url && (
                                    <a
                                      href={c.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline shrink-0"
                                    >
                                      <span>Enroll Free</span>
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </div>

                                {c.tags && c.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 pt-0.5">
                                    {c.tags.map((tag) => (
                                      <span
                                        key={tag}
                                        className="rounded bg-emerald-50 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-800 border border-emerald-200 font-mono"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-brand-slate italic p-2">
                            No direct government module indexed. See private options.
                          </p>
                        )}
                      </div>

                      {/* Column 2: Global & Industry Certifications */}
                      <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-3.5 space-y-2.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                          <Building className="h-4 w-4 text-blue-700" />
                          <span>Private & Global Certifications</span>
                        </div>

                        {privateCourses.length > 0 ? (
                          <div className="space-y-2">
                            {privateCourses.map((c, idx) => (
                              <div
                                key={idx}
                                className="rounded bg-white p-2.5 text-xs border border-blue-100 shadow-3xs space-y-1.5"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <span className="font-bold text-brand-navy leading-snug">
                                    {c.provider}
                                  </span>
                                  {c.url && (
                                    <a
                                      href={c.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:underline shrink-0"
                                    >
                                      <span>Explore Course</span>
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </div>

                                {c.tags && c.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 pt-0.5">
                                    {c.tags.map((tag) => (
                                      <span
                                        key={tag}
                                        className="rounded bg-blue-50 px-1.5 py-0.2 text-[9px] font-semibold text-blue-800 border border-blue-200 font-mono"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-brand-slate italic p-2">
                            Industry modules in development for this track.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 5: Acquired & Verified Competencies */}
        <div className="space-y-4 pt-4 border-t border-brand-navy/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl font-bold text-brand-navy">
                Acquired Competencies ({haveSkills.length})
              </h2>
              <p className="text-xs text-brand-slate mt-0.5">
                Skills already calibrated on your dossier that contribute to your matching score.
              </p>
            </div>
          </div>

          {haveSkills.length === 0 ? (
            <div className="rounded-xl border border-dashed border-brand-navy/20 bg-white p-6 text-center text-xs text-brand-slate">
              No track skills calibrated yet. Complete courses above and update your profile.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {haveSkills.map((skill) => (
                <div
                  key={skill.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/20 p-4 shadow-3xs"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm text-brand-navy">
                        {skill.name}
                      </h4>
                      <span className="text-[10px] text-brand-slate font-medium">
                        {skill.isMicroCredential ? "Micro-Credential" : "Core Competency"}
                      </span>
                    </div>
                  </div>

                  {skill.proficiencyLevel && (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 border border-emerald-200">
                      {skill.proficiencyLevel}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
