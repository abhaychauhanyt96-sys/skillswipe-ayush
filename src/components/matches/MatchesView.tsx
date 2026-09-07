"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { Match, MatchStatus, Company, Student, User } from "@/types";
import { WaxSealBadge } from "@/components/discover/WaxSealBadge";
import { MatchesListSkeleton } from "@/components/ui/SkeletonCard";
import { Button } from "@/components/ui/button";
import {
  Building2,
  GraduationCap,
  Sparkles,
  ExternalLink,
  Calendar,
  ChevronDown,
  Check,
  Clock,
  ArrowLeft,
  Mail,
  FileText,
  Briefcase,
  MapPin,
  X,
  PhoneCall,
  Layers,
} from "lucide-react";
import Link from "next/link";

interface HydratedMatch {
  match: Match;
  company?: Company;
  student?: Student;
  user?: User; // Counterpart basic auth user (for email/name)
}

interface MatchesViewProps {
  role: "student" | "company";
}

const STATUS_OPTIONS: { value: MatchStatus; label: string; bg: string; text: string; border: string }[] = [
  { value: "new", label: "New Match", bg: "bg-[#D4A017]/15", text: "text-[#8E6503]", border: "border-[#D4A017]/40" },
  { value: "contacted", label: "Contacted", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-300" },
  { value: "in-progress", label: "In Progress", bg: "bg-[#1F6F5C]/15", text: "text-[#1F6F5C]", border: "border-[#1F6F5C]/40" },
  { value: "closed", label: "Closed / Archived", bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-300" },
];

export function MatchesView({ role }: MatchesViewProps) {
  const { user } = useAuth();
  const [matches, setMatches] = useState<HydratedMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [updatingMatchId, setUpdatingMatchId] = useState<string | null>(null);

  // Fetch all mutual matches involving the current user
  useEffect(() => {
    async function loadMatches() {
      if (!user) return;
      setLoading(true);

      try {
        const matchesRef = collection(db, "matches");
        const q =
          role === "student"
            ? query(matchesRef, where("studentId", "==", user.uid))
            : query(matchesRef, where("companyId", "==", user.uid));

        const querySnapshot = await getDocs(q);
        const rawMatches: Match[] = [];
        querySnapshot.forEach((d) => {
          rawMatches.push(d.data() as Match);
        });

        // Sort matches by matchedAt descending (newest first)
        rawMatches.sort(
          (a, b) => new Date(b.matchedAt).getTime() - new Date(a.matchedAt).getTime()
        );

        // Hydrate counterpart records
        const hydrated: HydratedMatch[] = await Promise.all(
          rawMatches.map(async (m) => {
            if (role === "student") {
              // Counterpart is company
              try {
                const compSnap = await getDoc(doc(db, "companies", m.companyId));
                const userSnap = await getDoc(doc(db, "users", m.companyId));
                return {
                  match: m,
                  company: compSnap.exists() ? (compSnap.data() as Company) : undefined,
                  user: userSnap.exists() ? (userSnap.data() as User) : undefined,
                };
              } catch (e) {
                console.error("Failed hydrating company for match:", e);
                return { match: m };
              }
            } else {
              // Counterpart is student
              try {
                const studentSnap = await getDoc(doc(db, "students", m.studentId));
                const userSnap = await getDoc(doc(db, "users", m.studentId));
                return {
                  match: m,
                  student: studentSnap.exists() ? (studentSnap.data() as Student) : undefined,
                  user: userSnap.exists() ? (userSnap.data() as User) : undefined,
                };
              } catch (e) {
                console.error("Failed hydrating student for match:", e);
                return { match: m };
              }
            }
          })
        );

        setMatches(hydrated);
      } catch (err) {
        console.error("Failed to load matches:", err);
      } finally {
        setLoading(false);
      }
    }

    loadMatches();
  }, [user, role]);

  // Handle status update
  const handleStatusChange = async (matchId: string, newStatus: MatchStatus) => {
    try {
      setUpdatingMatchId(matchId);

      // 1. Update Firestore
      const matchDocRef = doc(db, "matches", matchId);
      await updateDoc(matchDocRef, { status: newStatus });

      // 2. Update local state
      setMatches((prev) =>
        prev.map((item) =>
          item.match.matchId === matchId
            ? { ...item, match: { ...item.match, status: newStatus } }
            : item
        )
      );
    } catch (err) {
      console.error("Failed to update match status:", err);
    } finally {
      setUpdatingMatchId(null);
    }
  };

  // Filtered list
  const filteredMatches = matches.filter((item) => {
    if (filterStatus === "all") return true;
    return item.match.status === filterStatus;
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-brand-navy py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/15 pb-6">
          <div>
            <Link
              href={`/dashboard/${role}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-paper/70 hover:text-brand-gold transition-colors mb-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-2xl font-bold tracking-tight text-brand-paper sm:text-3xl">
                {role === "student" ? "Your Mutual Matches" : "Matched Candidates"}
              </h1>
              <span className="rounded-full border border-brand-gold/30 bg-brand-gold/15 px-2.5 py-0.5 text-xs font-bold text-brand-gold">
                {matches.length} Total
              </span>
            </div>
            <p className="mt-1 text-sm text-brand-paper/70">
              {role === "student"
                ? "Companies where both you and the recruiter opted in for mutual collaboration."
                : "Qualified students who reviewed your open roles and granted mutual consent."}
            </p>
          </div>

          {/* Discover CTA */}
          <Link href={`/dashboard/${role}/discover`}>
            <Button className="bg-[#D4A017] hover:bg-[#B8870F] text-[#101830] font-semibold shadow-md">
              <Sparkles className="h-4 w-4 mr-1.5" />
              <span>Discover Deck</span>
            </Button>
          </Link>
        </div>

        {/* Filter Pills */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {["all", "new", "contacted", "in-progress", "closed"].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`rounded-full px-3.5 py-1 text-xs font-semibold capitalize transition-colors ${
                filterStatus === st
                  ? "bg-brand-gold text-brand-navy font-bold shadow-xs"
                  : "bg-white/10 text-brand-paper/70 hover:bg-white/15 hover:text-white"
              }`}
            >
              {st === "all" ? "All Matches" : st.replace("-", " ")}
            </button>
          ))}
        </div>

        {/* Matches Content */}
        {loading ? (
          <MatchesListSkeleton />
        ) : filteredMatches.length === 0 ? (
          <div className="mt-10 rounded-2xl border-2 border-dashed border-white/20 bg-white/5 p-12 text-center text-brand-paper backdrop-blur-xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-brand-gold/20 text-brand-gold border border-brand-gold/30">
              <Sparkles className="h-7 w-7" />
            </div>
            <h3 className="mt-4 font-serif text-xl font-bold text-brand-paper">
              {filterStatus === "all" ? "No Bilateral Consents Established Yet" : `No Matches Categorized Under '${filterStatus.replace("-", " ")}'`}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-brand-paper/70 max-w-md mx-auto">
              {filterStatus === "all"
                ? role === "student"
                  ? "Bilateral matches are recorded strictly when both the student and recruiter opt in. Review open postings on the Discover deck to establish verified connections."
                  : "Bilateral matches are established when your recruitment team and candidate both grant consent. Review candidate credentials on the Discover deck."
                : "You can update candidate pipeline status at any time using the status dropdown on active match documents."}
            </p>
            <div className="mt-6">
              <Link href={`/dashboard/${role}/discover`}>
                <Button className="bg-[#D4A017] hover:bg-[#B8870F] text-[#101830] font-bold text-xs shadow-md">
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  <span>Launch Discover Deck</span>
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {filteredMatches.map(({ match, company, student, user: counterpartUser }) => {
              const currentStatusMeta =
                STATUS_OPTIONS.find((s) => s.value === match.status) || STATUS_OPTIONS[0];

              const formattedDate = new Date(match.matchedAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });

              return (
                <div
                  key={match.matchId}
                  className="group relative overflow-hidden rounded-xl border-2 border-[#101830]/40 bg-[#F7F5EF] p-5 shadow-md transition-all hover:border-brand-gold hover:shadow-lg"
                >
                  {/* Subtle top gold accent hairline */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-[#D4A017]" />

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* Left: Counterpart Info */}
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#101830]/20 bg-white text-brand-navy shadow-xs">
                        {role === "student" ? (
                          company?.basicInfo?.logoUrl ? (
                            <img
                              src={company.basicInfo.logoUrl}
                              alt={company.basicInfo.name}
                              className="h-8 w-8 object-contain"
                            />
                          ) : (
                            <Building2 className="h-6 w-6 text-brand-teal" />
                          )
                        ) : (
                          <GraduationCap className="h-6 w-6 text-brand-navy" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-serif text-base font-bold text-brand-navy">
                            {role === "student"
                              ? company?.basicInfo?.name || counterpartUser?.name || "Partner Company"
                              : counterpartUser?.name || student?.basicInfo?.college || "Candidate"}
                          </h3>
                          <span className="inline-flex items-center gap-1 rounded bg-[#1F6F5C]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1F6F5C]">
                            <Check className="h-3 w-3" />
                            <span>Mutual</span>
                          </span>
                        </div>

                        <p className="text-xs text-brand-slate mt-0.5">
                          {role === "student" ? (
                            <>
                              {company?.basicInfo?.industry && (
                                <span className="font-medium text-brand-navy">
                                  {company.basicInfo.industry} &bull;{" "}
                                </span>
                              )}
                              {company?.basicInfo?.location || "Remote"}
                            </>
                          ) : (
                            <>
                              <span className="font-semibold text-brand-navy">
                                {student?.basicInfo?.degree || "Student"}
                              </span>{" "}
                              &bull; {student?.basicInfo?.college || "Institution"}
                            </>
                          )}
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-brand-slate">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-brand-gold" />
                            <span>Matched on {formattedDate}</span>
                          </span>

                          {match.emailSentAt && (
                            <span className="inline-flex items-center gap-1 text-[#1F6F5C]">
                              <Mail className="h-3.5 w-3.5" />
                              <span>Email notification sent</span>
                            </span>
                          )}
                        </div>

                        {/* If Recruiter Viewing Student: show verified skill pills */}
                        {role === "company" && student?.skills && student.skills.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                            {student.skills.slice(0, 4).map((sk) => (
                              <span
                                key={sk.name}
                                className="inline-flex items-center gap-1 rounded-sm border border-[#101830]/20 bg-white px-2 py-0.5 text-[10px] font-mono font-medium text-brand-navy"
                              >
                                {sk.verified && <WaxSealBadge size="xs" />}
                                <span>{sk.name}</span>
                              </span>
                            ))}
                            {student.skills.length > 4 && (
                              <span className="text-[10px] text-brand-slate">
                                +{student.skills.length - 4} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Status Dropdown & Action Links */}
                    <div className="flex flex-wrap sm:flex-col sm:items-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/10">
                      {/* Status Selector Dropdown */}
                      <div className="relative inline-block">
                        <label className="block text-[10px] uppercase tracking-wider text-brand-slate font-bold mb-1 sm:text-right">
                          Status
                        </label>
                        <select
                          value={match.status}
                          disabled={updatingMatchId === match.matchId}
                          onChange={(e) =>
                            handleStatusChange(match.matchId, e.target.value as MatchStatus)
                          }
                          className={`cursor-pointer rounded-md border px-3 py-1.5 text-xs font-bold transition-all shadow-2xs focus:outline-none focus:ring-2 focus:ring-brand-gold ${currentStatusMeta.bg} ${currentStatusMeta.text} ${currentStatusMeta.border}`}
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value} className="bg-white text-brand-navy">
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Action Button */}
                      {role === "student" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => company && setSelectedCompany(company)}
                          className="border-[#101830]/30 bg-white text-brand-navy hover:bg-brand-gold hover:text-brand-navy text-xs font-semibold"
                        >
                          <span>View Company Charter</span>
                          <ExternalLink className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      ) : (
                        <Link href={`/profile/${match.studentId}`}>
                          <Button
                            size="sm"
                            className="bg-brand-navy hover:bg-[#182344] text-brand-paper text-xs font-semibold shadow-xs"
                          >
                            <span>Open Digital Portfolio</span>
                            <ArrowLeft className="h-3.5 w-3.5 ml-1 rotate-180" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Student View: Company Charter Modal */}
      {selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-xl border-2 border-[#101830] bg-[#FDFCF9] p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#101830]/15 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-[#101830]/20 bg-white text-brand-teal">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-brand-navy">
                    {selectedCompany.basicInfo?.name}
                  </h3>
                  <p className="text-xs text-brand-slate">
                    {selectedCompany.basicInfo?.industry} &bull; {selectedCompany.basicInfo?.location || "Remote"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCompany(null)}
                className="rounded-md p-1.5 text-brand-slate hover:bg-black/5 hover:text-brand-navy"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Open Roles */}
            <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-4 pr-1">
              {selectedCompany.basicInfo?.website && (
                <div className="text-xs">
                  <span className="font-semibold text-brand-slate">Official Website: </span>
                  <a
                    href={selectedCompany.basicInfo.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-brand-teal hover:underline"
                  >
                    {selectedCompany.basicInfo.website}
                  </a>
                </div>
              )}

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-slate mb-2">
                  Active Opportunities
                </h4>
                {selectedCompany.openRoles && selectedCompany.openRoles.length > 0 ? (
                  <div className="space-y-3">
                    {selectedCompany.openRoles.map((role, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-[#101830]/15 bg-white p-3.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <h5 className="font-serif text-sm font-bold text-brand-navy">
                            {role.title}
                          </h5>
                          <span className="rounded bg-[#1F6F5C]/15 px-2 py-0.5 text-[10px] font-bold capitalize text-[#1F6F5C]">
                            {role.type}
                          </span>
                        </div>
                        {role.stipend && (
                          <p className="mt-1 text-xs font-mono font-medium text-brand-gold">
                            Stipend: {role.stipend}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-brand-slate leading-relaxed">
                          {role.description}
                        </p>
                        {role.requiredSkills && (
                          <div className="mt-2.5 flex flex-wrap gap-1">
                            {role.requiredSkills.map((sk) => (
                              <span
                                key={sk}
                                className="rounded bg-brand-paper px-2 py-0.5 text-[10px] font-mono border border-black/10 text-brand-navy"
                              >
                                {sk}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-brand-slate italic">
                    No individual open role descriptions published yet.
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 border-t border-[#101830]/15 pt-4 flex justify-end">
              <Button
                onClick={() => setSelectedCompany(null)}
                className="bg-brand-navy hover:bg-[#182344] text-brand-paper"
              >
                Close Charter
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
