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
import { Company, Student, Match } from "@/types";
import { searchProfiles } from "@/lib/search/searchProfiles";
import { MatchModal } from "@/components/discover/MatchModal";
import { triggerMatchEmail } from "@/lib/email/client";
import { Button } from "@/components/ui/button";
import {
  Search,
  Building2,
  Sparkles,
  ExternalLink,
  MapPin,
  Briefcase,
  Heart,
  Check,
  ArrowLeft,
  SlidersHorizontal,
  X,
  Layers,
} from "lucide-react";
import Link from "next/link";

export default function StudentBrowseCompaniesPage() {
  const { user } = useAuth();
  const [studentProfile, setStudentProfile] = useState<Student | null>(null);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [interestedCompanyIds, setInterestedCompanyIds] = useState<Set<string>>(new Set());
  const [matchedCompanyIds, setMatchedCompanyIds] = useState<Set<string>>(new Set());
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Match Modal State
  const [activeMatch, setActiveMatch] = useState<{
    companyName: string;
    roleTitle: string;
    companyLogoUrl?: string;
  } | null>(null);

  // Fetch student profile and all companies from Firestore
  useEffect(() => {
    async function loadBrowseData() {
      if (!user) return;
      setLoading(true);

      try {
        // 1. Fetch current student
        const studentRef = doc(db, "students", user.uid);
        const studentSnap = await getDoc(studentRef);

        let currentStudent: Student;
        if (studentSnap.exists()) {
          currentStudent = studentSnap.data() as Student;
        } else {
          currentStudent = {
            uid: user.uid,
            basicInfo: { college: "University", degree: "Student", year: "2026", location: "India" },
            skills: [],
            projects: [],
            links: {},
            certificates: [],
            swipedRight: [],
            swipedLeft: [],
            matches: [],
          };
        }
        setStudentProfile(currentStudent);

        setInterestedCompanyIds(new Set(currentStudent.swipedRight || []));
        setMatchedCompanyIds(new Set(currentStudent.matches || []));

        // 2. Fetch all companies
        const companiesSnap = await getDocs(collection(db, "companies"));
        const comps: Company[] = [];
        companiesSnap.forEach((d) => {
          comps.push(d.data() as Company);
        });

        setAllCompanies(comps);
      } catch (err) {
        console.error("Failed loading browse companies:", err);
      } finally {
        setLoading(false);
      }
    }

    loadBrowseData();
  }, [user]);

  // Client-side filtering via standalone searchProfiles function
  const filteredCompanies = useMemo(() => {
    return searchProfiles(allCompanies, searchQuery);
  }, [allCompanies, searchQuery]);

  // Handle "I'm Interested" action (same right-swipe logic as Discover)
  const handleExpressInterest = async (company: Company) => {
    if (!user || !studentProfile || processingId || interestedCompanyIds.has(company.uid)) {
      return;
    }

    setProcessingId(company.uid);

    try {
      const studentDocRef = doc(db, "students", user.uid);

      // 1. Optimistic UI update
      setInterestedCompanyIds((prev) => new Set(prev).add(company.uid));

      // 2. Write to student's swipedRight
      await updateDoc(studentDocRef, {
        swipedRight: arrayUnion(company.uid),
      });

      // 3. Check reciprocal match
      const companyDocRef = doc(db, "companies", company.uid);
      const companySnap = await getDoc(companyDocRef);

      let isMutual = false;
      if (companySnap.exists()) {
        const cData = companySnap.data() as Company;
        if (cData.swipedRight && cData.swipedRight.includes(user.uid)) {
          isMutual = true;
        }
      }

      if (isMutual) {
        const matchId = `match_${user.uid}_${company.uid}_${Date.now()}`;
        const newMatch: Match = {
          matchId,
          studentId: user.uid,
          companyId: company.uid,
          matchedAt: new Date().toISOString(),
          status: "new",
          emailSentAt: null,
        };

        // Write match doc to Firestore
        await setDoc(doc(db, "matches", matchId), newMatch);

        // Update both parties' matches arrays
        await updateDoc(studentDocRef, { matches: arrayUnion(company.uid) });
        await updateDoc(companyDocRef, { matches: arrayUnion(user.uid) });

        setMatchedCompanyIds((prev) => new Set(prev).add(company.uid));

        // Dispatch automatic match notification emails asynchronously
        triggerMatchEmail({
          matchId,
          studentId: user.uid,
          studentName: user.displayName || user.email?.split("@")[0] || "Student Candidate",
          studentEmail: user.email || "",
          companyId: company.uid,
          companyName: company.basicInfo?.name || "Partner Company",
          roleTitle: company.openRoles?.[0]?.title || "Internship Role",
          studentCollege: studentProfile.basicInfo?.college,
          studentSkills: studentProfile.skills?.map((s) => s.name),
        }).catch((e) => console.warn("Email dispatch notice:", e));

        // Trigger celebratory Wax Seal reveal!
        setActiveMatch({
          companyName: company.basicInfo?.name || "Partner Company",
          roleTitle: company.openRoles?.[0]?.title || "Open Position",
          companyLogoUrl: company.basicInfo?.logoUrl,
        });
      }
    } catch (err) {
      console.error("Failed expressing interest from browse:", err);
      // Revert optimistic state on error
      setInterestedCompanyIds((prev) => {
        const next = new Set(prev);
        next.delete(company.uid);
        return next;
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <div className="min-h-[calc(100vh-4rem)] bg-brand-paper/40 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          
          {/* Header & Navigation Bar */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-brand-navy/15 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/student"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-slate hover:text-brand-navy"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Student Portal</span>
                </Link>
                <span className="text-brand-slate/40">&bull;</span>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-gold">
                  Directory
                </span>
              </div>
              <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
                Browse All Companies
              </h1>
              <p className="mt-1 text-xs text-brand-slate">
                Explore verified enterprise partners, search across industries and skills, and express direct mutual interest.
              </p>
            </div>

            {/* View Switcher: Discover Stack vs Browse All */}
            <div className="flex items-center gap-2">
              <Link href="/dashboard/student/discover">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-brand-navy/30 text-brand-navy hover:bg-brand-navy hover:text-brand-paper text-xs font-semibold"
                >
                  <Layers className="h-3.5 w-3.5 mr-1.5 text-brand-gold" />
                  <span>Swipe Discover Deck</span>
                </Button>
              </Link>
              <Link href="/dashboard/student/matches">
                <Button
                  size="sm"
                  className="bg-brand-navy hover:bg-[#182344] text-brand-paper text-xs font-semibold"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5 text-brand-gold" />
                  <span>My Matches</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Search Bar & Active Count */}
          <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-slate" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by company name, required skills (e.g. Python, React), or industry..."
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
              Showing <span className="text-brand-navy font-bold">{filteredCompanies.length}</span> of{" "}
              {allCompanies.length} registered partners
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
                    <div className="h-12 w-12 rounded-lg bg-black/10" />
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
          ) : filteredCompanies.length === 0 ? (
            /* Empty State */
            <div className="mt-12 rounded-2xl border-2 border-dashed border-brand-navy/20 bg-white p-12 text-center max-w-lg mx-auto">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-navy/5 text-brand-gold">
                <Search className="h-7 w-7" />
              </div>
              <h3 className="mt-4 font-serif text-lg font-bold text-brand-navy">
                No Companies Match Your Search
              </h3>
              <p className="mt-1 text-xs text-brand-slate leading-relaxed">
                {searchQuery
                  ? `No industry partners found matching "${searchQuery}". Try broadening your query or searching by a foundational skill.`
                  : "No enterprise companies are currently registered on the collaboration roster."}
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
            /* Companies Grid */
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCompanies.map((company) => {
                const isMatch = matchedCompanyIds.has(company.uid);
                const isInterested = interestedCompanyIds.has(company.uid);
                const isPending = processingId === company.uid;
                const openRoles = company.openRoles || [];

                // Extract all unique skills across company roles
                const allRoleSkills = Array.from(
                  new Set(openRoles.flatMap((r) => r.requiredSkills || []))
                ).slice(0, 5);

                return (
                  <div
                    key={company.uid}
                    className="flex flex-col justify-between rounded-xl border-2 border-[#101830] bg-[#FDFCF9] p-6 shadow-md hover:border-[#D4A017] hover:shadow-lg transition-all"
                  >
                    {/* Top Info */}
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {company.basicInfo?.logoUrl ? (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-brand-navy/20 bg-white p-1 shadow-2xs">
                              <img
                                src={company.basicInfo.logoUrl}
                                alt={company.basicInfo?.name}
                                className="h-full w-full object-contain"
                              />
                            </div>
                          ) : (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-brand-navy/20 bg-brand-navy text-brand-gold shadow-2xs">
                              <Building2 className="h-6 w-6" />
                            </div>
                          )}

                          <div>
                            <Link
                              href={`/company/${company.uid}`}
                              className="font-serif text-lg font-bold text-brand-navy hover:text-brand-teal transition-colors"
                            >
                              {company.basicInfo?.name}
                            </Link>
                            <p className="text-xs text-brand-slate">
                              {company.basicInfo?.industry || "Industry Partner"}
                            </p>
                          </div>
                        </div>

                        {/* Open Roles Badge */}
                        <span className="rounded-full bg-brand-gold/15 border border-brand-gold/40 px-2.5 py-0.5 text-[10px] font-bold text-[#8E6503] font-mono shrink-0">
                          {openRoles.length} Role{openRoles.length === 1 ? "" : "s"}
                        </span>
                      </div>

                      {/* Location & Website */}
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-brand-slate">
                        {company.basicInfo?.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-brand-gold" />
                            <span>{company.basicInfo.location}</span>
                          </span>
                        )}
                        {company.basicInfo?.website && (
                          <a
                            href={company.basicInfo.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-brand-teal hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>Website</span>
                          </a>
                        )}
                      </div>

                      {/* Open Opportunities Summary */}
                      <div className="mt-4 border-t border-brand-navy/10 pt-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-brand-slate">
                          Active Openings:
                        </p>
                        {openRoles.length > 0 ? (
                          <div className="mt-1.5 space-y-1.5">
                            {openRoles.slice(0, 2).map((role, rIdx) => (
                              <div
                                key={rIdx}
                                className="flex items-center justify-between rounded bg-white px-2.5 py-1 text-xs border border-black/5"
                              >
                                <span className="font-semibold text-brand-navy truncate">
                                  {role.title}
                                </span>
                                <span className="text-[10px] font-mono text-[#1F6F5C] font-bold capitalize">
                                  {role.type}
                                </span>
                              </div>
                            ))}
                            {openRoles.length > 2 && (
                              <p className="text-[10px] text-brand-slate italic pl-1">
                                +{openRoles.length - 2} more position(s)
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="mt-1 text-xs text-brand-slate italic">
                            General talent pool inquiry.
                          </p>
                        )}
                      </div>

                      {/* Required Skills Chips */}
                      {allRoleSkills.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {allRoleSkills.map((sk) => (
                            <span
                              key={sk}
                              className="rounded border border-brand-navy/15 bg-white px-2 py-0.5 text-[10px] font-mono text-brand-navy shadow-3xs"
                            >
                              {sk}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Card Actions: View Charter & I'm Interested */}
                    <div className="mt-6 border-t border-brand-navy/15 pt-4 flex items-center justify-between gap-2">
                      <Link href={`/company/${company.uid}`} className="flex-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full border-brand-navy/20 text-brand-navy hover:bg-brand-paper hover:border-brand-gold text-xs font-semibold"
                        >
                          View Charter
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
                          onClick={() => handleExpressInterest(company)}
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
