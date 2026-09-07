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
import { CredentialCard, CardData } from "@/components/discover/CredentialCard";
import { MatchModal } from "@/components/discover/MatchModal";
import { calculateCompatibilityScore } from "@/lib/matching/scoring";
import { triggerMatchEmail } from "@/lib/email/client";
import { DiscoverCardSkeleton } from "@/components/ui/SkeletonCard";
import { Button } from "@/components/ui/button";
import {
  X,
  Heart,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowLeft,
  Building2,
  Info,
  Search,
} from "lucide-react";
import Link from "next/link";

export default function StudentDiscoverPage() {
  const { user } = useAuth();
  const [studentProfile, setStudentProfile] = useState<Student | null>(null);
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);

  // Match Celebration State
  const [activeMatch, setActiveMatch] = useState<{
    companyName: string;
    roleTitle: string;
    companyLogoUrl?: string;
  } | null>(null);

  // Fetch student profile and company stack
  useEffect(() => {
    async function loadStack() {
      if (!user) return;
      setLoading(true);

      try {
        // 1. Fetch current student's full document
        const studentDocRef = doc(db, "students", user.uid);
        const studentSnap = await getDoc(studentDocRef);

        let currentStudent: Student;
        if (studentSnap.exists()) {
          currentStudent = studentSnap.data() as Student;
        } else {
          // Fallback minimal student if not onboarded yet
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

        // 2. Fetch all companies from Firestore
        const companiesSnap = await getDocs(collection(db, "companies"));
        const swipedLeftSet = new Set(currentStudent.swipedLeft || []);
        const swipedRightSet = new Set(currentStudent.swipedRight || []);

        const candidateCards: CardData[] = [];

        companiesSnap.forEach((docSnap) => {
          const comp = docSnap.data() as Company;
          // Filter out companies already swiped
          if (swipedLeftSet.has(comp.uid) || swipedRightSet.has(comp.uid)) {
            return;
          }

          // If company has open roles, create a card for each role or top role
          if (comp.openRoles && comp.openRoles.length > 0) {
            comp.openRoles.forEach((role, idx) => {
              const { score, matchedSkills, missingSkills, breakdown } = calculateCompatibilityScore(
                currentStudent,
                comp,
                role
              );

              candidateCards.push({
                id: comp.uid,
                type: "company-role",
                company: comp,
                role,
                compatibilityScore: score,
                breakdown,
                matchedSkills,
                missingSkills,
              });
            });
          } else {
            // General company card if no specific role is posted
            candidateCards.push({
              id: comp.uid,
              type: "company-role",
              company: comp,
              role: {
                title: "General Open Positions",
                type: "internship",
                requiredSkills: ["Problem Solving", "Adaptability"],
                description: comp.basicInfo?.industry
                  ? `Exploring early talent for ${comp.basicInfo.industry} initiatives.`
                  : "Seeking motivated candidates.",
              },
              compatibilityScore: 70,
            });
          }
        });

        // Order stack descending by compatibility score
        candidateCards.sort((a, b) => (b.compatibilityScore || 0) - (a.compatibilityScore || 0));

        setCards(candidateCards);
      } catch (err) {
        console.error("Failed to load discover stack:", err);
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

    // Remove from UI immediately for 60fps responsiveness
    setCards((prev) => prev.slice(1));

    try {
      const studentDocRef = doc(db, "students", user.uid);
      await updateDoc(studentDocRef, {
        swipedLeft: arrayUnion(topCard.id),
      });
    } catch (err) {
      console.error("Failed to record left swipe:", err);
    }
  };

  // Handle Swipe Right (Mutual Interest / Opt-In)
  const handleSwipeRight = async () => {
    if (cards.length === 0 || !user || !studentProfile) return;
    const topCard = cards[0];
    const targetCompany = topCard.company;

    // Remove from UI immediately
    setCards((prev) => prev.slice(1));

    try {
      const studentDocRef = doc(db, "students", user.uid);
      await updateDoc(studentDocRef, {
        swipedRight: arrayUnion(topCard.id),
      });

      // CHECK RECIPROCAL MATCH: Has company already swiped right on this student?
      const targetCompanyDocRef = doc(db, "companies", topCard.id);
      const targetSnap = await getDoc(targetCompanyDocRef);

      let isMutual = false;
      if (targetSnap.exists()) {
        const companyData = targetSnap.data() as Company;
        if (companyData.swipedRight && companyData.swipedRight.includes(user.uid)) {
          isMutual = true;
        }
      }

      if (isMutual) {
        // MATCH CREATION!
        const matchId = `match_${user.uid}_${topCard.id}_${Date.now()}`;
        const newMatch: Match = {
          matchId,
          studentId: user.uid,
          companyId: topCard.id,
          matchedAt: new Date().toISOString(),
          status: "new",
          emailSentAt: null,
        };

        // Write match doc to Firestore
        await setDoc(doc(db, "matches", matchId), newMatch);

        // Update both parties' matches arrays
        await updateDoc(studentDocRef, { matches: arrayUnion(topCard.id) });
        await updateDoc(targetCompanyDocRef, { matches: arrayUnion(user.uid) });

        // Dispatch automatic match notification emails asynchronously (non-blocking)
        triggerMatchEmail({
          matchId,
          studentId: user.uid,
          studentName: user.displayName || user.email?.split("@")[0] || "Student",
          studentEmail: user.email || "",
          companyId: topCard.id,
          companyName: targetCompany?.basicInfo?.name || "Partner Company",
          roleTitle: topCard.role?.title,
          studentCollege: studentProfile?.basicInfo?.college,
          studentSkills: studentProfile?.skills?.map((s) => s.name),
        }).catch((e) => console.warn("Email notification fire-and-forget notice:", e));

        // Trigger the celebratory Wax Seal Stamp full-screen reveal!
        setActiveMatch({
          companyName: targetCompany?.basicInfo?.name || "Partner Company",
          roleTitle: topCard.role?.title || "Internship Role",
          companyLogoUrl: targetCompany?.basicInfo?.logoUrl,
        });
      }
    } catch (err) {
      console.error("Failed to record right swipe:", err);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <div className="relative min-h-[calc(100vh-4rem)] bg-brand-navy px-4 py-6 sm:px-6 flex flex-col justify-between overflow-hidden">
        {/* Top Header Bar */}
        <div className="mx-auto flex w-full max-w-lg items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/student"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-paper/70 hover:text-brand-gold transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>

            <Link
              href="/dashboard/student/browse"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-paper/70 hover:text-brand-gold transition-colors"
            >
              <Search className="h-3.5 w-3.5 text-brand-gold" />
              <span>Browse All</span>
            </Link>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-gold/30 bg-white/10 px-3 py-1 text-xs font-bold text-brand-gold backdrop-blur-xs">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Mutual Discovery Stack</span>
          </div>

          <span className="text-xs font-mono text-brand-paper/60">
            {cards.length} {cards.length === 1 ? "Role" : "Roles"} Remaining
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
                <Layers className="h-7 w-7" />
              </div>
              <h3 className="mt-4 font-serif text-xl font-bold text-brand-paper">
                All Accredited Postings Evaluated
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-brand-paper/70">
                You have evaluated all active opportunity charters matching your current calibrated skill domain. You can also search the full directory or review your existing mutual matches.
              </p>
              <div className="mt-6 flex flex-col gap-2.5">
                <Link href="/dashboard/student/browse">
                  <Button className="w-full bg-brand-gold hover:bg-[#B8870F] text-brand-navy font-bold text-xs shadow-md">
                    <Search className="h-3.5 w-3.5 mr-1.5" />
                    <span>Browse All Companies & Search</span>
                  </Button>
                </Link>
                <Link href="/dashboard/student/matches">
                  <Button variant="outline" size="sm" className="w-full text-brand-paper border-white/20 hover:bg-white/10 text-xs">
                    <Sparkles className="h-3.5 w-3.5 mr-1.5 text-brand-gold" />
                    <span>Review Mutual Matches</span>
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            /* Active Card Stack */
            <div className="relative h-full w-full">
              {cards.slice(0, 2).map((card, index) => (
                <CredentialCard
                  key={`${card.id}_${card.role?.title || index}`}
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
              id="swipe-reject-btn"
              onClick={handleSwipeLeft}
              className="group flex h-14 w-14 items-center justify-center rounded-full border-2 border-brand-brick/40 bg-brand-paper text-brand-brick shadow-lg transition-transform active:scale-95 hover:bg-brand-brick hover:text-white focus-visible:ring-4 focus-visible:ring-brand-gold focus-visible:outline-none"
              title="Dismiss Role (Swipe Left)"
              aria-label="Dismiss Role (Swipe Left)"
            >
              <X className="h-6 w-6 transition-transform group-hover:scale-110" />
            </button>

            {/* Hint Badge */}
            <span className="text-[10px] font-mono uppercase tracking-widest text-brand-paper/50 select-none">
              Drag or Tap
            </span>

            {/* Opt-In Button (Right Swipe) */}
            <button
              id="swipe-accept-btn"
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
            candidateName={studentProfile?.uid ? user?.displayName || "You" : "You"}
            candidateSubtitle={studentProfile?.basicInfo?.degree}
            companyName={activeMatch.companyName}
            companyLogoUrl={activeMatch.companyLogoUrl}
            roleTitle={activeMatch.roleTitle}
            matchesUrl="/dashboard/student/matches"
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
