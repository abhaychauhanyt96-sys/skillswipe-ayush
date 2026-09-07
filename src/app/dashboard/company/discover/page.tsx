"use client";

import React, { useEffect, useState } from "react";
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
import { CredentialCard, CardData } from "@/components/discover/CredentialCard";
import { MatchModal } from "@/components/discover/MatchModal";
import { calculateCompatibilityScore } from "@/lib/matching/scoring";
import { triggerMatchEmail } from "@/lib/email/client";
import { DiscoverCardSkeleton } from "@/components/ui/SkeletonCard";
import { Button } from "@/components/ui/button";
import {
  X,
  Heart,
  Sparkles,
  Layers,
  ArrowLeft,
  GraduationCap,
  Search,
} from "lucide-react";
import Link from "next/link";

export default function CompanyDiscoverPage() {
  const { user } = useAuth();
  const [companyProfile, setCompanyProfile] = useState<Company | null>(null);
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);

  // Match Celebration State
  const [activeMatch, setActiveMatch] = useState<{
    candidateName: string;
    candidateSubtitle?: string;
    roleTitle: string;
  } | null>(null);

  // Fetch company profile and candidate stack
  useEffect(() => {
    async function loadStack() {
      if (!user) return;
      setLoading(true);

      try {
        // 1. Fetch current company document
        const companyDocRef = doc(db, "companies", user.uid);
        const compSnap = await getDoc(companyDocRef);

        let currentCompany: Company;
        if (compSnap.exists()) {
          currentCompany = compSnap.data() as Company;
        } else {
          currentCompany = {
            uid: user.uid,
            basicInfo: { name: "Company Partner", industry: "Technology" },
            openRoles: [],
            learningPrograms: [],
            swipedRight: [],
            swipedLeft: [],
            matches: [],
          };
        }
        setCompanyProfile(currentCompany);

        // 2. Fetch all students from Firestore
        const studentsSnap = await getDocs(collection(db, "students"));
        const swipedLeftSet = new Set(currentCompany.swipedLeft || []);
        const swipedRightSet = new Set(currentCompany.swipedRight || []);

        const candidateCards: CardData[] = [];
        const topRole = currentCompany.openRoles?.[0] || {
          title: "Graduate Apprentice",
          type: "internship" as const,
          requiredSkills: ["React", "Python", "Problem Solving"],
          description: "General technical role",
        };

        studentsSnap.forEach((docSnap) => {
          const student = docSnap.data() as Student;
          // Filter out students already swiped
          if (swipedLeftSet.has(student.uid) || swipedRightSet.has(student.uid)) {
            return;
          }

          const { score, matchedSkills, missingSkills, breakdown } = calculateCompatibilityScore(
            student,
            currentCompany,
            topRole
          );

          candidateCards.push({
            id: student.uid,
            type: "student-candidate",
            student,
            role: topRole,
            compatibilityScore: score,
            breakdown,
            matchedSkills,
            missingSkills,
          });
        });

        // Order stack descending by compatibility score
        candidateCards.sort((a, b) => (b.compatibilityScore || 0) - (a.compatibilityScore || 0));

        setCards(candidateCards);
      } catch (err) {
        console.error("Failed to load company candidate stack:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStack();
  }, [user]);

  // Handle Swipe Left (Dismiss)
  const handleSwipeLeft = async () => {
    if (cards.length === 0 || !user) return;
    const topCard = cards[0];

    setCards((prev) => prev.slice(1));

    try {
      const companyDocRef = doc(db, "companies", user.uid);
      await updateDoc(companyDocRef, {
        swipedLeft: arrayUnion(topCard.id),
      });
    } catch (err) {
      console.error("Failed to record left swipe:", err);
    }
  };

  // Handle Swipe Right (Mutual Interest / Opt-In)
  const handleSwipeRight = async () => {
    if (cards.length === 0 || !user || !companyProfile) return;
    const topCard = cards[0];
    const targetStudent = topCard.student;

    setCards((prev) => prev.slice(1));

    try {
      const companyDocRef = doc(db, "companies", user.uid);
      await updateDoc(companyDocRef, {
        swipedRight: arrayUnion(topCard.id),
      });

      // CHECK RECIPROCAL MATCH: Has student already swiped right on this company?
      const targetStudentDocRef = doc(db, "students", topCard.id);
      const targetSnap = await getDoc(targetStudentDocRef);

      let isMutual = false;
      if (targetSnap.exists()) {
        const studentData = targetSnap.data() as Student;
        if (studentData.swipedRight && studentData.swipedRight.includes(user.uid)) {
          isMutual = true;
        }
      }

      if (isMutual) {
        // MATCH CREATION!
        const matchId = `match_${topCard.id}_${user.uid}_${Date.now()}`;
        const newMatch: Match = {
          matchId,
          studentId: topCard.id,
          companyId: user.uid,
          matchedAt: new Date().toISOString(),
          status: "new",
          emailSentAt: null,
        };

        // Write match doc to Firestore
        await setDoc(doc(db, "matches", matchId), newMatch);

        // Update both parties' matches arrays
        await updateDoc(companyDocRef, { matches: arrayUnion(topCard.id) });
        await updateDoc(targetStudentDocRef, { matches: arrayUnion(user.uid) });

        // Dispatch automatic match notification emails asynchronously (non-blocking)
        triggerMatchEmail({
          matchId,
          studentId: topCard.id,
          studentName: targetStudent?.basicInfo?.college || "Candidate",
          companyId: user.uid,
          companyName: companyProfile?.basicInfo?.name || user.displayName || "Partner Organization",
          companyEmail: user.email || "",
          roleTitle: topCard.role?.title,
          studentCollege: targetStudent?.basicInfo?.college,
          studentSkills: targetStudent?.skills?.map((s) => s.name),
        }).catch((e) => console.warn("Email notification fire-and-forget notice:", e));

        // Trigger the celebratory Wax Seal Stamp full-screen reveal!
        setActiveMatch({
          candidateName: targetStudent?.basicInfo?.college || "Qualified Candidate",
          candidateSubtitle: targetStudent?.basicInfo?.degree,
          roleTitle: topCard.role?.title || "Open Role",
        });
      }
    } catch (err) {
      console.error("Failed to record right swipe:", err);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["company"]}>
      <div className="relative min-h-[calc(100vh-4rem)] bg-brand-navy px-4 py-6 sm:px-6 flex flex-col justify-between overflow-hidden">
        {/* Top Header Bar */}
        <div className="mx-auto flex w-full max-w-lg items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/company"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-paper/70 hover:text-brand-gold transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>

            <Link
              href="/dashboard/company/browse"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-paper/70 hover:text-brand-gold transition-colors"
            >
              <Search className="h-3.5 w-3.5 text-brand-gold" />
              <span>Browse Talent</span>
            </Link>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-gold/30 bg-white/10 px-3 py-1 text-xs font-bold text-brand-gold backdrop-blur-xs">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Candidate Discovery Stack</span>
          </div>

          <span className="text-xs font-mono text-brand-paper/60">
            {cards.length} {cards.length === 1 ? "Candidate" : "Candidates"} Left
          </span>
        </div>

        {/* Card Stage Container */}
        <div className="mx-auto my-auto flex h-[530px] w-full max-w-md items-center justify-center relative">
          {loading ? (
            <DiscoverCardSkeleton />
          ) : cards.length === 0 ? (
            /* Dignified Academic Empty State */
            <div className="rounded-2xl border-2 border-dashed border-brand-paper/25 bg-white/5 p-8 text-center text-brand-paper max-w-sm backdrop-blur-xs shadow-xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-brand-gold/20 text-brand-gold border border-brand-gold/30">
                <GraduationCap className="h-7 w-7" />
              </div>
              <h3 className="mt-4 font-serif text-xl font-bold text-brand-paper">
                Candidate Dossier Deck Complete
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-brand-paper/70">
                You have evaluated all qualified student candidates in this cohort. You can also search the full talent directory or manage existing matches.
              </p>
              <div className="mt-6 flex flex-col gap-2.5">
                <Link href="/dashboard/company/browse">
                  <Button className="w-full bg-brand-gold hover:bg-[#B8870F] text-brand-navy font-bold text-xs shadow-md">
                    <Search className="h-3.5 w-3.5 mr-1.5" />
                    <span>Browse All Talent & Search</span>
                  </Button>
                </Link>
                <Link href="/dashboard/company/matches">
                  <Button variant="outline" size="sm" className="w-full text-brand-paper border-white/20 hover:bg-white/10 text-xs">
                    <Sparkles className="h-3.5 w-3.5 mr-1.5 text-brand-gold" />
                    <span>Review Matched Candidates</span>
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            /* Active Card Stack */
            <div className="relative h-full w-full">
              {cards.slice(0, 2).map((card, index) => (
                <CredentialCard
                  key={`${card.id}_${index}`}
                  card={card}
                  isTopCard={index === 0}
                  onSwipeLeft={handleSwipeLeft}
                  onSwipeRight={handleSwipeRight}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottom Tactile Action Controls */}
        {cards.length > 0 && !loading && (
          <div className="mx-auto mb-2 flex items-center justify-center gap-6">
            {/* Dismiss Button (Left Swipe) */}
            <button
              id="company-swipe-reject-btn"
              onClick={handleSwipeLeft}
              className="group flex h-14 w-14 items-center justify-center rounded-full border-2 border-brand-brick/40 bg-brand-paper text-brand-brick shadow-lg transition-transform active:scale-95 hover:bg-brand-brick hover:text-white focus-visible:ring-4 focus-visible:ring-brand-gold focus-visible:outline-none"
              title="Dismiss Candidate (Swipe Left)"
              aria-label="Dismiss Candidate (Swipe Left)"
            >
              <X className="h-6 w-6 transition-transform group-hover:scale-110" />
            </button>

            <span className="text-[10px] font-mono uppercase tracking-widest text-brand-paper/50 select-none">
              Drag or Tap
            </span>

            {/* Opt-In Button (Right Swipe) */}
            <button
              id="company-swipe-accept-btn"
              onClick={handleSwipeRight}
              className="group flex h-14 w-14 items-center justify-center rounded-full border-2 border-brand-teal/40 bg-brand-paper text-brand-teal shadow-lg transition-transform active:scale-95 hover:bg-brand-teal hover:text-white focus-visible:ring-4 focus-visible:ring-brand-gold focus-visible:outline-none"
              title="Mutual Consent (Swipe Right)"
              aria-label="Mutual Consent (Swipe Right)"
            >
              <Heart className="h-6 w-6 transition-transform group-hover:scale-110" fill="currentColor" />
            </button>
          </div>
        )}

        {/* Celebratory Match Modal Reveal */}
        {activeMatch && (
          <MatchModal
            isOpen={!!activeMatch}
            onClose={() => setActiveMatch(null)}
            candidateName={activeMatch.candidateName}
            candidateSubtitle={activeMatch.candidateSubtitle}
            companyName={companyProfile?.basicInfo?.name || "Your Company"}
            companyLogoUrl={companyProfile?.basicInfo?.logoUrl}
            roleTitle={activeMatch.roleTitle}
            matchesUrl="/dashboard/company/matches"
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
