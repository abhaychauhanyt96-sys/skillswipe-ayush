"use client";

import React, { useEffect, useState, useMemo } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  setDoc,
} from "firebase/firestore";
import { Company, Student, User, Match } from "@/types";
import { searchProfiles, StudentWithDisplayName } from "@/lib/search/searchProfiles";
import { WaxSealBadge } from "@/components/discover/WaxSealBadge";
import { MatchModal } from "@/components/discover/MatchModal";
import { triggerMatchEmail } from "@/lib/email/client";
import { Button } from "@/components/ui/button";
import {
  Search,
  GraduationCap,
  Sparkles,
  ExternalLink,
  MapPin,
  Heart,
  Check,
  ArrowLeft,
  X,
  Layers,
  FolderGit2,
  Award,
} from "lucide-react";
import Link from "next/link";

export default function CompanyBrowseStudentsPage() {
  const { user } = useAuth();
  const [companyProfile, setCompanyProfile] = useState<Company | null>(null);
  const [allStudents, setAllStudents] = useState<StudentWithDisplayName[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [interestedStudentIds, setInterestedStudentIds] = useState<Set<string>>(new Set());
  const [matchedStudentIds, setMatchedStudentIds] = useState<Set<string>>(new Set());
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Match Celebration Modal State
  const [activeMatch, setActiveMatch] = useState<{
    companyName: string;
    roleTitle: string;
    companyLogoUrl?: string;
  } | null>(null);

  useEffect(() => {
    async function loadBrowseData() {
      if (!user) return;
      setLoading(true);

      try {
        // 1. Fetch current company document
        const companyRef = doc(db, "companies", user.uid);
        const compSnap = await getDoc(companyRef);

        let currentCompany: Company;
        if (compSnap.exists()) {
          currentCompany = compSnap.data() as Company;
        } else {
          currentCompany = {
            uid: user.uid,
            basicInfo: { name: "Partner Enterprise", industry: "Technology" },
            openRoles: [],
            learningPrograms: [],
            swipedRight: [],
            swipedLeft: [],
            matches: [],
          };
        }
        setCompanyProfile(currentCompany);

        setInterestedStudentIds(new Set(currentCompany.swipedRight || []));
        setMatchedStudentIds(new Set(currentCompany.matches || []));

        // 2. Fetch all students + hydrate their user display names
        const studentsSnap = await getDocs(collection(db, "students"));
        const studentsList: Student[] = [];
        studentsSnap.forEach((d) => {
          studentsList.push(d.data() as Student);
        });

        // Hydrate display names from users collection in parallel
        const hydrated: StudentWithDisplayName[] = await Promise.all(
          studentsList.map(async (st) => {
            try {
              const uSnap = await getDoc(doc(db, "users", st.uid));
              if (uSnap.exists()) {
                const uData = uSnap.data() as User;
                return {
                  ...st,
                  displayName: uData.name || uData.email?.split("@")[0] || "Candidate",
                  email: uData.email,
                };
              }
            } catch (e) {
              console.warn("User hydration notice:", e);
            }
            return {
              ...st,
              displayName: "Candidate Student",
            };
          })
        );

        setAllStudents(hydrated);
      } catch (err) {
        console.error("Failed loading students roster:", err);
      } finally {
        setLoading(false);
      }
    }

    loadBrowseData();
  }, [user]);

  // Client-side filtering via standalone searchProfiles function
  const filteredStudents = useMemo(() => {
    return searchProfiles(allStudents, searchQuery);
  }, [allStudents, searchQuery]);

  // Handle "I'm Interested" action (same right-swipe logic as Discover)
  const handleExpressInterest = async (student: StudentWithDisplayName) => {
    if (!user || !companyProfile || processingId || interestedStudentIds.has(student.uid)) {
      return;
    }

    setProcessingId(student.uid);

    try {
      const companyDocRef = doc(db, "companies", user.uid);

      // 1. Optimistic UI update
      setInterestedStudentIds((prev) => new Set(prev).add(student.uid));

      // 2. Write to company's swipedRight
      await updateDoc(companyDocRef, {
        swipedRight: arrayUnion(student.uid),
      });

      // 3. Check reciprocal match: Has student already swiped right on this company?
      const studentDocRef = doc(db, "students", student.uid);
      const studentSnap = await getDoc(studentDocRef);

      let isMutual = false;
      if (studentSnap.exists()) {
        const sData = studentSnap.data() as Student;
        if (sData.swipedRight && sData.swipedRight.includes(user.uid)) {
          isMutual = true;
        }
      }

      if (isMutual) {
        const matchId = `match_${student.uid}_${user.uid}_${Date.now()}`;
        const newMatch: Match = {
          matchId,
          studentId: student.uid,
          companyId: user.uid,
          matchedAt: new Date().toISOString(),
          status: "new",
          emailSentAt: null,
        };

        // Write match doc to Firestore
        await setDoc(doc(db, "matches", matchId), newMatch);

        // Update both parties' matches arrays
        await updateDoc(studentDocRef, { matches: arrayUnion(user.uid) });
        await updateDoc(companyDocRef, { matches: arrayUnion(student.uid) });

        setMatchedStudentIds((prev) => new Set(prev).add(student.uid));

        // Dispatch transactional email asynchronously
        triggerMatchEmail({
          matchId,
          studentId: student.uid,
          studentName: student.displayName || "Student Candidate",
          studentEmail: student.email || "",
          companyId: user.uid,
          companyName: companyProfile.basicInfo?.name || "Partner Company",
          roleTitle: companyProfile.openRoles?.[0]?.title || "Internship Role",
          studentCollege: student.basicInfo?.college,
          studentSkills: student.skills?.map((s) => s.name),
        }).catch((e) => console.warn("Email notice:", e));

        // Trigger celebratory Wax Seal reveal!
        setActiveMatch({
          companyName: companyProfile.basicInfo?.name || "Partner Enterprise",
          roleTitle: companyProfile.openRoles?.[0]?.title || "Open Opportunity",
          companyLogoUrl: companyProfile.basicInfo?.logoUrl,
        });
      }
    } catch (err) {
      console.error("Failed expressing interest from company browse:", err);
      // Revert optimistic state
      setInterestedStudentIds((prev) => {
        const next = new Set(prev);
        next.delete(student.uid);
        return next;
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["company"]}>
      <div className="min-h-[calc(100vh-4rem)] bg-brand-paper/40 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          
          {/* Header & Navigation */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-brand-navy/15 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/company"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-slate hover:text-brand-navy"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Company Dashboard</span>
                </Link>
                <span className="text-brand-slate/40">&bull;</span>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-gold">
                  Talent Directory
                </span>
              </div>
              <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
                Browse Student Talent
              </h1>
              <p className="mt-1 text-xs text-brand-slate">
                Search authenticated student candidates by name, verified skills, or academic institution.
              </p>
            </div>

            {/* View Switcher: Discover Deck vs Browse All */}
            <div className="flex items-center gap-2">
              <Link href="/dashboard/company/discover">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-brand-navy/30 text-brand-navy hover:bg-brand-navy hover:text-brand-paper text-xs font-semibold"
                >
                  <Layers className="h-3.5 w-3.5 mr-1.5 text-brand-gold" />
                  <span>Candidate Swipe Deck</span>
                </Button>
              </Link>
              <Link href="/dashboard/company/matches">
                <Button
                  size="sm"
                  className="bg-brand-navy hover:bg-[#182344] text-brand-paper text-xs font-semibold"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5 text-brand-gold" />
                  <span>Matches Console</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Search Bar & Counter */}
          <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-slate" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student name, skills (e.g. Python, Machine Learning), or college..."
                className="w-full rounded-xl border-2 border-brand-navy/20 bg-white py-2.5 pl-10 pr-10 text-xs font-medium text-brand-navy placeholder:text-brand-slate/60 focus:border-brand-gold focus:outline-none shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-slate hover:text-brand-navy"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="text-xs font-semibold text-brand-slate self-end sm:self-center">
              Showing <span className="text-brand-navy font-bold">{filteredStudents.length}</span> of{" "}
              {allStudents.length} registered candidates
            </div>
          </div>

          {/* Content Area */}
          {loading ? (
            /* Skeleton Loading Grid */
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border-2 border-brand-navy/15 bg-white p-6 shadow-sm space-y-4 animate-pulse"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-black/10" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-32 rounded bg-black/15" />
                      <div className="h-3 w-24 rounded bg-black/10" />
                    </div>
                  </div>
                  <div className="h-12 rounded bg-black/5" />
                  <div className="h-8 rounded bg-black/10" />
                </div>
              ))}
            </div>
          ) : filteredStudents.length === 0 ? (
            /* Empty State */
            <div className="mt-12 rounded-2xl border-2 border-dashed border-brand-navy/20 bg-white p-12 text-center max-w-lg mx-auto">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-navy/5 text-brand-gold">
                <Search className="h-7 w-7" />
              </div>
              <h3 className="mt-4 font-serif text-lg font-bold text-brand-navy">
                No Student Candidates Found
              </h3>
              <p className="mt-1 text-xs text-brand-slate leading-relaxed">
                {searchQuery
                  ? `No verified candidates match "${searchQuery}". Try searching for specific technical skills or university keywords.`
                  : "No students are currently registered in the database."}
              </p>
              {searchQuery && (
                <Button
                  onClick={() => setSearchQuery("")}
                  variant="outline"
                  size="sm"
                  className="mt-4 text-xs font-semibold"
                >
                  Clear Search Filter
                </Button>
              )}
            </div>
          ) : (
            /* Student Cards Grid */
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStudents.map((student) => {
                const isMatch = matchedStudentIds.has(student.uid);
                const isInterested = interestedStudentIds.has(student.uid);
                const isPending = processingId === student.uid;
                const skills = student.skills || [];
                const projects = student.projects || [];
                const certs = student.certificates || [];

                return (
                  <div
                    key={student.uid}
                    className="flex flex-col justify-between rounded-xl border-2 border-[#101830] bg-[#FDFCF9] p-6 shadow-md hover:border-[#D4A017] hover:shadow-lg transition-all"
                  >
                    {/* Candidate Top Header */}
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-brand-gold shadow-2xs border border-brand-gold/30">
                            <GraduationCap className="h-6 w-6" />
                          </div>

                          <div>
                            <Link
                              href={`/profile/${student.uid}`}
                              className="font-serif text-lg font-bold text-brand-navy hover:text-brand-teal transition-colors"
                            >
                              {student.displayName || "Candidate"}
                            </Link>
                            <p className="text-xs text-brand-slate line-clamp-1">
                              {student.basicInfo?.degree || "Student"} &bull; {student.basicInfo?.college}
                            </p>
                          </div>
                        </div>

                        {student.basicInfo?.year && (
                          <span className="rounded-full bg-brand-gold/15 border border-brand-gold/40 px-2 py-0.5 text-[10px] font-bold text-[#8E6503] font-mono shrink-0">
                            &apos;{student.basicInfo.year.slice(-2)}
                          </span>
                        )}
                      </div>

                      {/* Location & Summary */}
                      <div className="mt-3 flex items-center gap-4 text-xs text-brand-slate">
                        {student.basicInfo?.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-brand-gold" />
                            <span>{student.basicInfo.location}</span>
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-brand-navy">
                          <FolderGit2 className="h-3 w-3 text-brand-teal" />
                          <span>{projects.length} Project{projects.length === 1 ? "" : "s"}</span>
                        </span>
                        {certs.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-brand-gold">
                            <Award className="h-3 w-3" />
                            <span>{certs.length} Cert{certs.length === 1 ? "" : "s"}</span>
                          </span>
                        )}
                      </div>

                      {/* Verified Skills Matrix */}
                      <div className="mt-4 border-t border-brand-navy/10 pt-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-brand-slate mb-1.5">
                          Verified Skill Competencies:
                        </p>
                        {skills.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {skills.slice(0, 5).map((sk, sIdx) => (
                              <span
                                key={sIdx}
                                className="inline-flex items-center gap-1 rounded border border-[#101830]/15 bg-white px-2 py-0.5 text-[10px] font-mono text-brand-navy shadow-3xs"
                              >
                                <WaxSealBadge size="sm" />
                                <span>{sk.name}</span>
                                <span className="text-[9px] text-brand-slate">({sk.level.slice(0, 3)})</span>
                              </span>
                            ))}
                            {skills.length > 5 && (
                              <span className="text-[10px] text-brand-slate self-center italic">
                                +{skills.length - 5} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-brand-slate italic">
                            No calibrated skill badges logged.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Card Bottom Actions: View Portfolio & I'm Interested */}
                    <div className="mt-6 border-t border-brand-navy/15 pt-4 flex items-center justify-between gap-2">
                      <Link href={`/profile/${student.uid}`} className="flex-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-brand-navy/20 text-brand-navy hover:bg-brand-paper hover:border-brand-gold text-xs font-semibold"
                        >
                          View Portfolio
                        </Button>
                      </Link>

                      {isMatch ? (
                        <div className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#1F6F5C]/40 bg-[#1F6F5C]/15 px-3 py-1.5 text-xs font-bold text-[#1F6F5C]">
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Matched 🎉</span>
                        </div>
                      ) : isInterested ? (
                        <div className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#D4A017]/40 bg-[#D4A017]/15 px-3 py-1.5 text-xs font-bold text-[#8E6503]">
                          <Check className="h-3.5 w-3.5" />
                          <span>Interested ✓</span>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleExpressInterest(student)}
                          disabled={isPending}
                          className="bg-[#D4A017] hover:bg-[#B8870F] text-[#101830] text-xs font-bold shadow-xs"
                        >
                          <Heart className="h-3.5 w-3.5 mr-1 fill-current text-rose-700" />
                          <span>{isPending ? "Recording..." : "I'm Interested"}</span>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* Celebratory Mutual Match Modal */}
      {activeMatch && (
        <MatchModal
          companyName={activeMatch.companyName}
          roleTitle={activeMatch.roleTitle}
          companyLogoUrl={activeMatch.companyLogoUrl}
          onClose={() => setActiveMatch(null)}
        />
      )}
    </ProtectedRoute>
  );
}
