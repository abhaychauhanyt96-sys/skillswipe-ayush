"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase/config";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  setDoc,
} from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { Company, Student, Match } from "@/types";
import { WaxSealBadge } from "@/components/discover/WaxSealBadge";
import { MatchModal } from "@/components/discover/MatchModal";
import { triggerMatchEmail } from "@/lib/email/client";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Sparkles,
  ExternalLink,
  MapPin,
  Briefcase,
  BookOpen,
  Share2,
  Check,
  Printer,
  ArrowLeft,
  Mail,
  Heart,
  Layers,
} from "lucide-react";
import Link from "next/link";

export default function PublicCompanyProfilePage() {
  const params = useParams();
  const companyId = params.companyId as string;
  const { user, userRole } = useAuth();

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [hasExpressedInterest, setHasExpressedInterest] = useState(false);
  const [isMatched, setIsMatched] = useState(false);
  const [processingInterest, setProcessingInterest] = useState(false);

  // Match Modal State
  const [activeMatch, setActiveMatch] = useState<{
    companyName: string;
    roleTitle: string;
    companyLogoUrl?: string;
  } | null>(null);

  useEffect(() => {
    async function loadCompanyProfile() {
      if (!companyId) return;
      setLoading(true);

      try {
        const compRef = doc(db, "companies", companyId);
        const compSnap = await getDoc(compRef);

        if (compSnap.exists()) {
          const cData = compSnap.data() as Company;
          setCompany(cData);

          // If current user is a student, check if they already swiped or matched
          if (user && userRole === "student") {
            const studentRef = doc(db, "students", user.uid);
            const studentSnap = await getDoc(studentRef);
            if (studentSnap.exists()) {
              const sData = studentSnap.data() as Student;
              if (sData.matches?.includes(companyId)) {
                setIsMatched(true);
              } else if (sData.swipedRight?.includes(companyId)) {
                setHasExpressedInterest(true);
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed loading company profile:", err);
      } finally {
        setLoading(false);
      }
    }

    loadCompanyProfile();
  }, [companyId, user, userRole]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleExpressInterest = async () => {
    if (!user || userRole !== "student" || hasExpressedInterest || isMatched || processingInterest) {
      return;
    }
    setProcessingInterest(true);

    try {
      const studentDocRef = doc(db, "students", user.uid);
      const studentSnap = await getDoc(studentDocRef);
      const studentData = studentSnap.exists() ? (studentSnap.data() as Student) : null;

      // 1. Add companyId to student's swipedRight
      await updateDoc(studentDocRef, {
        swipedRight: arrayUnion(companyId),
      });
      setHasExpressedInterest(true);

      // 2. Check if company already swiped right on this student
      const targetCompanyDocRef = doc(db, "companies", companyId);
      const targetSnap = await getDoc(targetCompanyDocRef);

      let isMutual = false;
      if (targetSnap.exists()) {
        const cData = targetSnap.data() as Company;
        if (cData.swipedRight && cData.swipedRight.includes(user.uid)) {
          isMutual = true;
        }
      }

      if (isMutual) {
        const matchId = `match_${user.uid}_${companyId}_${Date.now()}`;
        const newMatch: Match = {
          matchId,
          studentId: user.uid,
          companyId,
          matchedAt: new Date().toISOString(),
          status: "new",
          emailSentAt: null,
        };

        // Write match doc
        await setDoc(doc(db, "matches", matchId), newMatch);

        // Update both parties' matches arrays
        await updateDoc(studentDocRef, { matches: arrayUnion(companyId) });
        await updateDoc(targetCompanyDocRef, { matches: arrayUnion(user.uid) });

        setIsMatched(true);

        // Trigger transactional email
        triggerMatchEmail({
          matchId,
          studentId: user.uid,
          studentName: user.displayName || user.email?.split("@")[0] || "Student Candidate",
          studentEmail: user.email || "",
          companyId,
          companyName: company?.basicInfo?.name || "Partner Company",
          roleTitle: company?.openRoles?.[0]?.title || "Open Opportunity",
          studentCollege: studentData?.basicInfo?.college,
          studentSkills: studentData?.skills?.map((s) => s.name),
        }).catch((e) => console.warn("Email notice:", e));

        // Celebratory match modal
        setActiveMatch({
          companyName: company?.basicInfo?.name || "Partner Company",
          roleTitle: company?.openRoles?.[0]?.title || "General Position",
          companyLogoUrl: company?.basicInfo?.logoUrl,
        });
      }
    } catch (err) {
      console.error("Failed expressing interest:", err);
    } finally {
      setProcessingInterest(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E1528] py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-xl border-3 border-[#101830] bg-[#FDFCF9] shadow-2xl">
          <div className="bg-[#101830] px-6 py-8 sm:px-10 border-b-2 border-[#D4A017] space-y-4">
            <div className="h-4 w-44 rounded-full bg-white/10 animate-pulse" />
            <div className="h-8 w-64 rounded bg-white/20 animate-pulse" />
            <div className="h-4 w-52 rounded bg-white/10 animate-pulse" />
          </div>
          <div className="p-6 sm:p-10 space-y-8 bg-[#FDFCF9]">
            <div className="h-10 w-full rounded bg-black/5 animate-pulse" />
            <div className="space-y-3">
              <div className="h-5 w-40 rounded bg-black/10 animate-pulse" />
              <div className="h-24 rounded-lg bg-black/5 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-brand-navy flex flex-col items-center justify-center p-4 text-center text-brand-paper">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-brand-gold">
          <Building2 className="h-8 w-8" />
        </div>
        <h2 className="mt-4 font-serif text-2xl font-bold">Company Record Not Found</h2>
        <p className="mt-2 text-sm text-brand-paper/60 max-w-md">
          The requested company charter could not be located on the SkillSwipe industry registry.
        </p>
        <Link href="/" className="mt-6">
          <Button className="bg-brand-gold hover:bg-[#B8870F] text-brand-navy font-semibold">
            Return to Home
          </Button>
        </Link>
      </div>
    );
  }

  const { basicInfo, openRoles = [], learningPrograms = [] } = company;

  return (
    <div className="min-h-screen bg-[#0E1528] py-8 px-4 sm:px-6 lg:px-8 text-brand-navy print:bg-white print:p-0">
      {/* Top Bar / Navigation */}
      <div className="mx-auto max-w-4xl mb-6 flex items-center justify-between print:hidden">
        <Link
          href={userRole === "student" ? "/dashboard/student/browse" : "/"}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-paper/70 hover:text-brand-gold transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{userRole === "student" ? "Back to Browse Companies" : "SkillSwipe Registry"}</span>
        </Link>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePrint}
            className="border-white/20 bg-white/10 text-brand-paper hover:bg-white/20 hover:text-white text-xs font-semibold"
          >
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            <span>Print / PDF</span>
          </Button>

          <Button
            size="sm"
            onClick={handleCopyLink}
            className="bg-[#D4A017] hover:bg-[#B8870F] text-[#101830] text-xs font-bold shadow-md"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-900" />
                <span>Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="h-3.5 w-3.5 mr-1.5" />
                <span>Share Charter</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Official Folio / Credential Document */}
      <div className="mx-auto max-w-4xl overflow-hidden rounded-xl border-3 border-[#101830] bg-[#FDFCF9] shadow-2xl print:border-none print:shadow-none">
        
        {/* Certificate Header Bar */}
        <div className="relative bg-[#101830] px-6 py-8 sm:px-10 text-brand-paper border-b-2 border-[#D4A017]">
          <div className="absolute top-2 left-2 text-[#D4A017]/40 text-xs font-serif select-none">❖</div>
          <div className="absolute top-2 right-2 text-[#D4A017]/40 text-xs font-serif select-none">❖</div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              {basicInfo?.logoUrl ? (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white p-1 border-2 border-brand-gold/50 shadow-md">
                  <img
                    src={basicInfo.logoUrl}
                    alt={basicInfo.name}
                    className="h-full w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white/10 text-brand-gold border border-brand-gold/30">
                  <Building2 className="h-8 w-8" />
                </div>
              )}

              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-brand-gold/40 bg-brand-gold/15 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand-gold">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Verified Industry Partner &bull; SIH206644</span>
                </div>
                <h1 className="mt-2 font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#F7F5EF]">
                  {basicInfo?.name || "Industry Partner"}
                </h1>
                <p className="mt-1 text-sm text-slate-300 flex flex-wrap items-center gap-x-2 gap-y-1">
                  {basicInfo?.industry && <span className="font-semibold text-white">{basicInfo.industry}</span>}
                  {basicInfo?.location && <span>&bull; {basicInfo.location}</span>}
                  <span className="text-brand-gold font-mono">&bull; {openRoles.length} Active Role{openRoles.length === 1 ? "" : "s"}</span>
                </p>
              </div>
            </div>

            {/* Interest Button or Status on Header */}
            {userRole === "student" && (
              <div className="shrink-0 flex sm:flex-col items-end gap-2">
                {isMatched ? (
                  <div className="inline-flex items-center gap-1.5 rounded-lg border-2 border-emerald-500/50 bg-emerald-500/20 px-4 py-2 text-xs font-bold text-emerald-300">
                    <Sparkles className="h-4 w-4 text-emerald-400" />
                    <span>Mutual Match Confirmed!</span>
                  </div>
                ) : hasExpressedInterest ? (
                  <div className="inline-flex items-center gap-1.5 rounded-lg border border-brand-gold/40 bg-brand-gold/20 px-4 py-2 text-xs font-bold text-brand-gold">
                    <Check className="h-4 w-4" />
                    <span>Interest Expressed</span>
                  </div>
                ) : (
                  <Button
                    onClick={handleExpressInterest}
                    disabled={processingInterest}
                    className="bg-[#D4A017] hover:bg-[#B8870F] text-[#101830] font-bold text-xs shadow-lg"
                  >
                    <Heart className="h-3.5 w-3.5 mr-1.5 fill-current text-rose-700" />
                    <span>{processingInterest ? "Recording..." : "I'm Interested"}</span>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Website / Links Row */}
          {basicInfo?.website && (
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/15 pt-4 text-xs text-slate-300">
              <a
                href={basicInfo.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-brand-gold hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>{basicInfo.website}</span>
              </a>
              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-mono">
                <Check className="h-3.5 w-3.5" />
                <span>Corporate Registration Verified</span>
              </span>
            </div>
          )}
        </div>

        {/* Folio Body */}
        <div className="p-6 sm:p-10 space-y-10 bg-[#FDFCF9]">

          {/* Section 1: Open Opportunities */}
          <div>
            <div className="flex items-center gap-2 border-b-2 border-[#101830] pb-2">
              <Briefcase className="h-5 w-5 text-brand-gold" />
              <h2 className="font-serif text-xl font-bold tracking-tight text-brand-navy">
                Active Open Roles & Positions
              </h2>
            </div>

            {openRoles.length > 0 ? (
              <div className="mt-4 space-y-4">
                {openRoles.map((role, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-[#101830]/20 bg-[#F7F5EF] p-5 shadow-2xs hover:border-brand-gold transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h3 className="font-serif text-base font-bold text-brand-navy">
                          {role.title}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-brand-slate">
                          <span className="rounded bg-[#1F6F5C]/15 px-2 py-0.5 font-bold uppercase text-[#1F6F5C] text-[10px]">
                            {role.type}
                          </span>
                          {role.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>{role.location}</span>
                            </span>
                          )}
                          {role.stipend && (
                            <span className="font-mono font-bold text-brand-gold">
                              &bull; {role.stipend}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-brand-slate leading-relaxed">
                      {role.description}
                    </p>

                    {role.requiredSkills && role.requiredSkills.length > 0 && (
                      <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase text-brand-navy/60 mr-1">
                          Required Competencies:
                        </span>
                        {role.requiredSkills.map((sk, sIdx) => (
                          <span
                            key={sIdx}
                            className="rounded border border-[#101830]/20 bg-white px-2 py-0.5 text-[10px] font-mono text-brand-navy"
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
              <p className="mt-4 text-xs text-brand-slate italic">
                No specific roles posted yet. Seeking general student candidate interest.
              </p>
            )}
          </div>

          {/* Section 2: Learning & Development Programs */}
          {learningPrograms && learningPrograms.length > 0 && (
            <div>
              <div className="flex items-center gap-2 border-b-2 border-[#101830] pb-2">
                <BookOpen className="h-5 w-5 text-brand-teal" />
                <h2 className="font-serif text-xl font-bold tracking-tight text-brand-navy">
                  Learning & Upskilling Programs
                </h2>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {learningPrograms.map((prog, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-[#101830]/20 bg-[#F7F5EF] p-4 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-serif text-sm font-bold text-brand-navy">
                        {prog.title}
                      </h4>
                      {prog.certificationOffered && (
                        <span className="rounded bg-brand-gold/20 px-2 py-0.5 text-[9px] font-bold uppercase text-[#8E6503]">
                          Certification
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-brand-slate leading-relaxed">
                      {prog.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Express Interest Bar for Students */}
          {userRole === "student" && !isMatched && (
            <div className="rounded-xl border-2 border-brand-gold/40 bg-brand-gold/10 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-serif text-base font-bold text-brand-navy">
                  Interested in collaborating with {basicInfo?.name}?
                </h3>
                <p className="text-xs text-brand-slate mt-1">
                  Expressing interest notifies this company. If they also choose your profile, a mutual consent match is established instantly.
                </p>
              </div>

              <Button
                onClick={handleExpressInterest}
                disabled={hasExpressedInterest || processingInterest}
                className="bg-brand-navy hover:bg-[#182344] text-brand-paper font-bold text-xs shrink-0"
              >
                {hasExpressedInterest ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1.5 text-brand-gold" />
                    <span>Interest Expressed</span>
                  </>
                ) : (
                  <>
                    <Heart className="h-3.5 w-3.5 mr-1.5 fill-current text-rose-500" />
                    <span>{processingInterest ? "Recording..." : "I'm Interested"}</span>
                  </>
                )}
              </Button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-[#ECE8DE] px-6 py-6 sm:px-10 border-t-2 border-[#101830] text-center">
          <p className="font-serif text-xs font-bold text-brand-navy uppercase tracking-wider">
            Official SkillSwipe Corporate Profile Charter &bull; SIH206644
          </p>
          <p className="mt-1 text-[11px] text-brand-slate">
            Authenticated enterprise dossier on the Academia–Industry Collaboration Platform.
          </p>
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
    </div>
  );
}
