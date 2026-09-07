"use client";

import React, { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { Student } from "@/types";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Sparkles,
  CheckCircle2,
  FolderGit2,
  Award,
  Layers,
  ArrowRight,
  UserCheck,
  Search,
  Compass,
  Target,
  BookOpen,
} from "lucide-react";
import Link from "next/link";

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [studentData, setStudentData] = useState<Student | null>(null);
  const [trackName, setTrackName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStudentProfile() {
      if (!user) return;
      try {
        const docRef = doc(db, "students", user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data() as Student;
          setStudentData(data);
          if (data.selectedTrack) {
            try {
              const trackSnap = await getDoc(doc(db, "careerTracks", data.selectedTrack));
              if (trackSnap.exists()) {
                setTrackName(trackSnap.data().name);
              }
            } catch (err) {
              console.error("Failed to load track:", err);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load student data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStudentProfile();
  }, [user]);

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["student"]}>
        <div className="mx-auto min-h-[calc(100vh-4rem)] max-w-5xl px-4 py-10 sm:px-6 space-y-6">
          <div className="rounded-2xl border border-brand-navy/15 bg-white p-6 sm:p-8 shadow-sm space-y-6">
            <div className="h-14 w-60 rounded bg-black/5 animate-pulse" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 pt-4 border-t border-brand-navy/10">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 rounded-lg bg-black/5 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <div className="mx-auto min-h-[calc(100vh-4rem)] max-w-5xl px-4 py-10 sm:px-6">
        {/* Welcome Header */}
        <div className="rounded-2xl border border-brand-navy/15 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-brand-gold shadow-sm">
                <GraduationCap className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-serif text-2xl font-bold text-brand-navy sm:text-3xl">
                    Welcome back, {user?.displayName || "Candidate"}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand-teal/30 bg-brand-teal/10 px-2.5 py-0.5 text-xs font-semibold text-brand-teal">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Onboarded</span>
                  </span>
                </div>

                <p className="mt-1 text-xs text-brand-slate">
                  {studentData?.basicInfo
                    ? `${studentData.basicInfo.degree} • ${studentData.basicInfo.college} (Class of ${studentData.basicInfo.year})`
                    : "Candidate profile registered"}
                </p>
                <p className="text-xs text-brand-slate mt-0.5">
                  📍 {studentData?.basicInfo?.location || "Location saved"}
                </p>
              </div>
            </div>

            {/* Quick Action */}
            <div className="shrink-0">
              <Link href="/onboarding/student">
                <Button variant="outline" size="sm">
                  Edit Profile
                </Button>
              </Link>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 border-t border-brand-navy/10 pt-6">
            <div className="rounded-lg border border-brand-navy/10 bg-brand-paper/50 p-4">
              <div className="flex items-center gap-1.5 text-brand-slate text-xs font-semibold uppercase tracking-wider">
                <Layers className="h-4 w-4 text-brand-gold" />
                <span>Skills</span>
              </div>
              <p className="mt-2 font-serif text-2xl font-bold text-brand-navy">
                {studentData?.skills?.length || 0}
              </p>
              <span className="text-[11px] text-brand-slate">Calibrated tags</span>
            </div>

            <div className="rounded-lg border border-brand-navy/10 bg-brand-paper/50 p-4">
              <div className="flex items-center gap-1.5 text-brand-slate text-xs font-semibold uppercase tracking-wider">
                <FolderGit2 className="h-4 w-4 text-brand-teal" />
                <span>Projects</span>
              </div>
              <p className="mt-2 font-serif text-2xl font-bold text-brand-navy">
                {studentData?.projects?.length || 0}
              </p>
              <span className="text-[11px] text-brand-slate">Showcased works</span>
            </div>

            <div className="rounded-lg border border-brand-navy/10 bg-brand-paper/50 p-4">
              <div className="flex items-center gap-1.5 text-brand-slate text-xs font-semibold uppercase tracking-wider">
                <Award className="h-4 w-4 text-brand-navy" />
                <span>Certs</span>
              </div>
              <p className="mt-2 font-serif text-2xl font-bold text-brand-navy">
                {studentData?.certificates?.length || 0}
              </p>
              <span className="text-[11px] text-brand-slate">Cloud storage</span>
            </div>

            <Link
              href="/dashboard/student/matches"
              className="rounded-lg border border-brand-navy/10 bg-brand-paper/50 p-4 hover:border-brand-gold hover:bg-brand-paper transition-all cursor-pointer block"
            >
              <div className="flex items-center justify-between text-brand-slate text-xs font-semibold uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-brand-gold" />
                  <span>Matches</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-brand-gold" />
              </div>
              <p className="mt-2 font-serif text-2xl font-bold text-brand-navy">
                {studentData?.matches?.length || 0}
              </p>
              <span className="text-[11px] text-brand-slate">Mutual consents &rarr;</span>
            </Link>
          </div>
        </div>

        {/* AYUSH Skill Gap Analysis Card */}
        <div className="mt-8 rounded-2xl border border-brand-navy/15 bg-white p-6 sm:p-7 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-teal/30 bg-brand-teal/10 px-3 py-1 text-xs font-semibold text-brand-teal">
                <Target className="h-3.5 w-3.5" />
                <span>Industry Alignment &bull; Skill Gap Intelligence</span>
              </div>
              <h2 className="font-serif text-xl font-bold tracking-tight text-brand-navy sm:text-2xl">
                {studentData?.selectedTrack
                  ? `AYUSH Career Readiness: ${trackName || "Track Selected"}`
                  : "AYUSH Career Track & Skill Gap Analysis"}
              </h2>
              <p className="text-xs text-brand-slate max-w-2xl leading-relaxed">
                {studentData?.selectedTrack
                  ? "Evaluate your real-time syllabus coverage against employer hiring benchmarks. Discover missing competencies, free government certifications (CCRAS, FSSAI), and fast-track micro-credentials."
                  : "Explore the 4 specialized AYUSH industry tracks, identify missing technical proficiencies, and unlock curated government & global certification pathways to boost your candidacy."}
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-3">
              <Link href="/dashboard/student/skill-gap">
                <Button
                  id="view-skill-gap-report-btn"
                  className="bg-brand-navy hover:bg-[#0f1f38] text-white font-semibold shadow-sm text-xs px-4 py-2.5 flex items-center gap-2"
                >
                  <BookOpen className="h-4 w-4 text-brand-gold" />
                  <span>View My Skill Gap Report</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Hero Next Step Banner: Discover / Swipe */}
        <div className="mt-8 rounded-2xl border-2 border-brand-navy bg-brand-navy p-6 sm:p-8 text-brand-paper shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-gold/20 px-3 py-1 text-xs font-semibold text-brand-gold">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Hero Feature &bull; Mutual Consent Matching</span>
              </div>
              <h2 className="font-serif text-2xl font-bold tracking-tight text-brand-paper sm:text-3xl">
                Ready to Discover Opportunities?
              </h2>
              <p className="text-xs text-brand-paper/80 max-w-xl">
                Our explainable vector scoring engine will rank company internship and job cards tailored to your calibrated skills. Swipe right to express interest without cold application spam!
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link href="/dashboard/student/browse">
                <Button
                  variant="outline"
                  className="border-white/30 text-brand-paper hover:bg-white/10 text-xs font-semibold"
                >
                  <Search className="h-3.5 w-3.5 mr-1.5 text-brand-gold" />
                  <span>Browse Directory</span>
                </Button>
              </Link>

              {user && (
                <Link href={`/profile/${user.uid}`}>
                  <Button
                    variant="outline"
                    className="border-brand-gold/40 text-brand-gold hover:bg-brand-gold/20 text-xs font-semibold"
                  >
                    <span>My Digital Portfolio</span>
                  </Button>
                </Link>
              )}

              <Link href="/dashboard/student/discover">
                <Button
                  id="student-launch-discover-btn"
                  size="lg"
                  className="bg-brand-gold text-brand-navy font-bold hover:bg-[#c49214] shadow-lg"
                >
                  <span>Launch Discover Stack</span>
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
