"use client";

import React, { useEffect, useState, useMemo } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import {
  Academician,
  AcademicOpportunity,
  AcademicOpportunityType,
} from "@/types";
import { searchOpportunities } from "@/lib/search/searchOpportunities";
import { triggerAcademicianInterestEmail } from "@/lib/email/client";
import { Button } from "@/components/ui/button";
import { WaxSealBadge } from "@/components/discover/WaxSealBadge";
import {
  Award,
  Building2,
  BookOpen,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  GraduationCap,
  Layers,
  ArrowRight,
  Briefcase,
  Search,
  Mail,
  Calendar,
  Clock,
  MapPin,
  Check,
  Star,
  Filter,
  X,
  Send,
} from "lucide-react";
import Link from "next/link";

interface FilterOption {
  id: "all" | "recommended" | AcademicOpportunityType;
  label: string;
  typeKey?: AcademicOpportunityType;
}

const OPPORTUNITY_TYPES: { id: AcademicOpportunityType; label: string; badge: string }[] = [
  { id: "FDP", label: "Faculty Development (FDP)", badge: "bg-amber-100 text-amber-800 border-amber-300" },
  { id: "industrial-training", label: "Industrial Training", badge: "bg-blue-100 text-blue-800 border-blue-300" },
  { id: "consultancy", label: "Industrial Consultancy", badge: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  { id: "research", label: "Collaborative Research", badge: "bg-purple-100 text-purple-800 border-purple-300" },
  { id: "guest-lecture", label: "Guest Lectures & Workshops", badge: "bg-orange-100 text-orange-800 border-orange-300" },
];

export default function AcademicianDashboardPage() {
  const { user } = useAuth();
  const [academicianData, setAcademicianData] = useState<Academician | null>(null);
  const [allOpportunities, setAllOpportunities] = useState<AcademicOpportunity[]>([]);
  const [expressedInterestIds, setExpressedInterestIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"all" | "recommended" | AcademicOpportunityType>("recommended");
  const [sendingInterestId, setSendingInterestId] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Load profile, opportunities, and past expressed interests
  useEffect(() => {
    async function loadData() {
      if (!user) return;
      setLoading(true);

      try {
        // 1. Fetch Academician Profile
        const docRef = doc(db, "academicians", user.uid);
        const snap = await getDoc(docRef);
        let profileInterests: string[] = [];

        if (snap.exists()) {
          const profile = snap.data() as Academician;
          setAcademicianData(profile);
          profileInterests = profile.interests || [];
        }

        // Default filter: if user has stated interests, default to "recommended", else "all"
        if (profileInterests.length === 0) {
          setSelectedFilter("all");
        }

        // 2. Fetch all Academic Opportunities
        const oppsSnap = await getDocs(collection(db, "academicOpportunities"));
        const opps: AcademicOpportunity[] = [];
        oppsSnap.forEach((d) => {
          const data = d.data();
          opps.push({
            id: d.id,
            postedBy: data.postedBy,
            type: data.type,
            title: data.title,
            description: data.description,
            requiredExpertise: data.requiredExpertise || [],
            duration: data.duration,
            mode: data.mode,
            applyBy: data.applyBy,
            createdAt: data.createdAt?.toDate
              ? data.createdAt.toDate().toISOString()
              : (data.createdAt || new Date().toISOString()),
            companyName: data.companyName || "Industry Partner",
          });
        });
        opps.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setAllOpportunities(opps);

        // 3. Fetch past Expressed Interests for this academician
        const interestsQuery = query(
          collection(db, "academicianInterests"),
          where("academicianId", "==", user.uid)
        );
        const interestsSnap = await getDocs(interestsQuery);
        const appliedSet = new Set<string>();
        interestsSnap.forEach((d) => {
          const item = d.data();
          if (item.opportunityId) {
            appliedSet.add(item.opportunityId);
          }
        });
        setExpressedInterestIds(appliedSet);
      } catch (err) {
        console.error("Failed loading academician dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  // Express Interest Handler
  const handleExpressInterest = async (opp: AcademicOpportunity) => {
    if (!user) return;
    setSendingInterestId(opp.id);
    setFeedbackBanner(null);

    try {
      // 1. Create document in academicianInterests collection
      const docRef = await addDoc(collection(db, "academicianInterests"), {
        academicianId: user.uid,
        opportunityId: opp.id,
        companyId: opp.postedBy,
        expressedAt: serverTimestamp(),
        status: "new",
        opportunityTitle: opp.title,
        academicianName: user.displayName || user.email?.split("@")[0] || "Faculty Member",
      });

      // 2. Trigger non-blocking email notification to company
      triggerAcademicianInterestEmail({
        interestId: docRef.id,
        academicianId: user.uid,
        opportunityId: opp.id,
        companyId: opp.postedBy,
      });

      // 3. Update local state
      setExpressedInterestIds((prev) => new Set(prev).add(opp.id));
      setFeedbackBanner({
        type: "success",
        message: `Your interest in "${opp.title}" was submitted successfully. The host organization has been notified!`,
      });
    } catch (err: any) {
      console.error("Error expressing interest:", err);
      setFeedbackBanner({
        type: "error",
        message: "Failed to record interest. Please check your network connection and try again.",
      });
    } finally {
      setSendingInterestId(null);
    }
  };

  // Filtered & Searched Opportunities
  const filteredOpportunities = useMemo(() => {
    // 1. First apply text search using standalone searchOpportunities
    let list = searchOpportunities(allOpportunities, searchQuery);

    // 2. Apply type filter
    const myInterests = academicianData?.interests || [];
    if (selectedFilter === "recommended") {
      if (myInterests.length > 0) {
        list = list.filter((opp) => myInterests.includes(opp.type));
      }
    } else if (selectedFilter !== "all") {
      list = list.filter((opp) => opp.type === selectedFilter);
    }

    return list;
  }, [allOpportunities, searchQuery, selectedFilter, academicianData]);

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["academician"]}>
        <div className="mx-auto min-h-[calc(100vh-4rem)] max-w-5xl px-4 py-8 sm:px-6 space-y-8">
          <div className="rounded-2xl border-2 border-brand-navy/20 bg-[#FDFCF9] p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-xl bg-black/10 animate-pulse" />
              <div className="space-y-2">
                <div className="h-6 w-48 rounded bg-black/15 animate-pulse" />
                <div className="h-4 w-32 rounded bg-black/10 animate-pulse" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 pt-6 border-t border-brand-navy/10">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 rounded-lg bg-black/5 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const basicInfo = academicianData?.basicInfo || {
    institution: "Academic Institution",
    department: "Department",
    designation: "Faculty Member",
  };
  const myInterests = academicianData?.interests || [];

  return (
    <ProtectedRoute allowedRoles={["academician"]}>
      <div className="mx-auto min-h-[calc(100vh-4rem)] max-w-5xl px-4 py-8 sm:px-6 space-y-8">
        
        {/* Welcome Header */}
        <div className="rounded-2xl border-2 border-brand-navy/20 bg-[#FDFCF9] p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-brand-gold shadow-2xs border border-brand-gold/30">
                <Award className="h-8 w-8" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-serif text-2xl font-bold text-brand-navy sm:text-3xl">
                    {basicInfo.designation}
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand-teal/30 bg-brand-teal/10 px-2.5 py-0.5 text-xs font-semibold text-brand-teal">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Verified Faculty</span>
                  </span>
                </div>

                <p className="mt-1 text-xs text-brand-slate">
                  {basicInfo.department} &bull;{" "}
                  <span className="font-semibold text-brand-navy">{basicInfo.institution}</span>
                </p>
                <p className="text-xs text-brand-slate/80 mt-0.5">
                  Academician Portal &bull; {user?.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link href="/onboarding/academician">
                <Button variant="outline" size="sm" className="text-xs font-semibold">
                  Edit Dossier
                </Button>
              </Link>
              {user && (
                <Link href={`/profile/academician/${user.uid}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-brand-gold/40 text-brand-navy hover:bg-brand-gold/10 text-xs font-semibold"
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1 text-brand-gold" />
                    <span>View Public Dossier</span>
                  </Button>
                </Link>
              )}
              <Link href="/dashboard/student/browse">
                <Button size="sm" className="bg-brand-navy hover:bg-[#182344] text-brand-paper text-xs font-semibold shadow-xs">
                  <Search className="h-3.5 w-3.5 mr-1 text-brand-gold" />
                  <span>Browse Industry</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Metric Indicators */}
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 border-t border-brand-navy/10 pt-6">
            <div className="rounded-lg border border-brand-navy/10 bg-brand-paper/50 p-4">
              <div className="flex items-center gap-1.5 text-brand-slate text-xs font-semibold uppercase tracking-wider">
                <Briefcase className="h-4 w-4 text-brand-teal" />
                <span>Total Calls</span>
              </div>
              <p className="mt-2 font-serif text-2xl font-bold text-brand-navy">
                {allOpportunities.length}
              </p>
              <span className="text-[11px] text-brand-slate">Corporate initiatives</span>
            </div>

            <div className="rounded-lg border border-brand-navy/10 bg-brand-paper/50 p-4">
              <div className="flex items-center gap-1.5 text-brand-slate text-xs font-semibold uppercase tracking-wider">
                <Star className="h-4 w-4 text-brand-gold" />
                <span>Profile Matches</span>
              </div>
              <p className="mt-2 font-serif text-2xl font-bold text-brand-navy">
                {allOpportunities.filter((o) => myInterests.includes(o.type)).length}
              </p>
              <span className="text-[11px] text-brand-slate">Aligned with your tracks</span>
            </div>

            <div className="rounded-lg border border-brand-navy/10 bg-brand-paper/50 p-4">
              <div className="flex items-center gap-1.5 text-brand-slate text-xs font-semibold uppercase tracking-wider">
                <Send className="h-4 w-4 text-emerald-600" />
                <span>Interests Sent</span>
              </div>
              <p className="mt-2 font-serif text-2xl font-bold text-brand-navy">
                {expressedInterestIds.size}
              </p>
              <span className="text-[11px] text-brand-slate">Active applications</span>
            </div>

            <div className="rounded-lg border border-brand-navy/10 bg-brand-paper/50 p-4">
              <div className="flex items-center gap-1.5 text-brand-slate text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="h-4 w-4 text-brand-gold" />
                <span>Registry</span>
              </div>
              <p className="mt-2 font-serif text-sm font-bold text-brand-navy">
                SIH206644
              </p>
              <span className="text-[11px] text-brand-slate">Accredited track</span>
            </div>
          </div>
        </div>

        {/* Feedback Banner */}
        {feedbackBanner && (
          <div
            className={`flex items-start justify-between rounded-xl border p-4 text-xs ${
              feedbackBanner.type === "success"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-rose-300 bg-rose-50 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackBanner.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <X className="h-4 w-4 shrink-0 text-rose-600" />
              )}
              <span className="font-medium">{feedbackBanner.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackBanner(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* MAIN SECTION: Browse & Filter Academic Opportunities */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-gold/20 px-2.5 py-0.5 text-[11px] font-bold text-brand-navy mb-1">
                <Sparkles className="h-3 w-3 text-brand-gold" />
                <span>Academia–Industry Discovery Feed</span>
              </div>
              <h2 className="font-serif text-2xl font-bold text-brand-navy flex items-center gap-2">
                <span>Explore Academic Opportunities</span>
                <span className="rounded-full bg-brand-navy/10 px-2.5 py-0.5 text-xs font-bold text-brand-navy">
                  {filteredOpportunities.length} Available
                </span>
              </h2>
              <p className="text-xs text-brand-slate mt-0.5">
                Browse corporate calls for FDPs, consultancies, joint research, and guest lectures. Filter by category or search by topic.
              </p>
            </div>
          </div>

          {/* Search Bar & Controls */}
          <div className="rounded-2xl border border-brand-navy/15 bg-white p-4 sm:p-5 shadow-xs space-y-4">
            {/* Search Bar Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-slate" />
              <input
                id="academic-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search opportunities by title, description, company, or expertise (e.g. Machine Learning, Cloud)..."
                className="w-full rounded-xl border border-brand-navy/20 bg-brand-paper/30 pl-10 pr-10 py-2.5 text-sm text-brand-navy placeholder:text-brand-slate/60 focus:border-brand-navy focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-slate hover:text-brand-navy p-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter Chips Bar */}
            <div className="space-y-1.5 pt-2 border-t border-brand-navy/10">
              <div className="flex items-center justify-between text-xs text-brand-slate mb-1">
                <span className="font-bold uppercase tracking-wider text-[10px]">Filter by Opportunity Type:</span>
                {myInterests.length > 0 && (
                  <span className="text-[11px] text-brand-teal flex items-center gap-1 font-semibold">
                    <Star className="h-3 w-3 text-brand-gold fill-brand-gold" />
                    <span>Highlighted types match your profile dossier</span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {/* 1. Recommended / Matches Profile Filter */}
                {myInterests.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedFilter("recommended")}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all border ${
                      selectedFilter === "recommended"
                        ? "bg-brand-navy text-brand-gold border-brand-navy shadow-3xs"
                        : "bg-brand-gold/15 text-brand-navy border-brand-gold/40 hover:bg-brand-gold/25"
                    }`}
                  >
                    <Star className="h-3 w-3 fill-brand-gold text-brand-gold" />
                    <span>Recommended for You ({allOpportunities.filter((o) => myInterests.includes(o.type)).length})</span>
                  </button>
                )}

                {/* 2. All Filter */}
                <button
                  type="button"
                  onClick={() => setSelectedFilter("all")}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all border ${
                    selectedFilter === "all"
                      ? "bg-brand-navy text-brand-paper border-brand-navy shadow-3xs"
                      : "bg-white text-brand-slate border-brand-navy/20 hover:bg-brand-paper/50 hover:text-brand-navy"
                  }`}
                >
                  All Opportunities ({allOpportunities.length})
                </button>

                {/* 3. Individual Type Chips */}
                {OPPORTUNITY_TYPES.map((typeObj) => {
                  const isMatch = myInterests.includes(typeObj.id);
                  const isSelected = selectedFilter === typeObj.id;
                  const count = allOpportunities.filter((o) => o.type === typeObj.id).length;

                  return (
                    <button
                      key={typeObj.id}
                      type="button"
                      onClick={() => setSelectedFilter(typeObj.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all border ${
                        isSelected
                          ? "bg-brand-navy text-brand-paper border-brand-navy font-bold shadow-3xs"
                          : isMatch
                          ? "bg-brand-paper/90 text-brand-navy border-brand-gold/60 font-semibold hover:border-brand-navy"
                          : "bg-white text-brand-slate border-brand-navy/15 hover:bg-brand-paper/40 hover:text-brand-navy"
                      }`}
                    >
                      {isMatch && (
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-gold shrink-0" />
                      )}
                      <span>{typeObj.label}</span>
                      <span className="text-[10px] opacity-70">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Opportunities Grid / List */}
          {filteredOpportunities.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-brand-navy/20 bg-brand-paper/30 p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-navy/10 text-brand-navy mb-3">
                <BookOpen className="h-7 w-7" />
              </div>
              <h3 className="font-serif text-lg font-bold text-brand-navy">
                No Opportunities Found
              </h3>
              <p className="mt-1 text-xs text-brand-slate max-w-md mx-auto leading-relaxed">
                {searchQuery
                  ? `No calls matching "${searchQuery}". Try a broader keyword or reset the search.`
                  : selectedFilter === "recommended"
                  ? "No current corporate calls match your primary profile interest tracks. Switch to 'All Opportunities' to explore every open call."
                  : "No opportunities currently listed under this category. Check back soon as new industry partners publish calls."}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                {searchQuery && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSearchQuery("")}
                    className="text-xs"
                  >
                    Clear Search
                  </Button>
                )}
                {selectedFilter !== "all" && (
                  <Button
                    size="sm"
                    onClick={() => setSelectedFilter("all")}
                    className="bg-brand-navy text-brand-paper text-xs"
                  >
                    Show All Opportunities
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredOpportunities.map((opp) => {
                const typeMeta = OPPORTUNITY_TYPES.find((t) => t.id === opp.type);
                const hasExpressed = expressedInterestIds.has(opp.id);
                const isSubmittingThis = sendingInterestId === opp.id;
                const matchesMyInterest = myInterests.includes(opp.type);

                return (
                  <div
                    key={opp.id}
                    className={`flex flex-col justify-between rounded-2xl border-2 bg-white p-6 shadow-xs transition-all hover:shadow-sm ${
                      hasExpressed
                        ? "border-emerald-300/80 bg-emerald-50/20"
                        : matchesMyInterest
                        ? "border-brand-gold/60 hover:border-brand-gold"
                        : "border-brand-navy/15 hover:border-brand-navy/40"
                    }`}
                  >
                    <div className="space-y-3.5">
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              typeMeta?.badge || "bg-brand-paper text-brand-navy border-brand-navy/20"
                            }`}
                          >
                            {typeMeta?.label || opp.type}
                          </span>

                          {matchesMyInterest && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand-gold/20 px-2 py-0.5 text-[10px] font-bold text-brand-navy">
                              <Star className="h-2.5 w-2.5 fill-brand-gold text-brand-gold" />
                              <span>Profile Match</span>
                            </span>
                          )}
                        </div>

                        <span className="inline-flex items-center gap-1 rounded bg-brand-navy/5 px-2 py-0.5 text-[10px] font-semibold text-brand-slate uppercase tracking-wide shrink-0">
                          <MapPin className="h-3 w-3 text-brand-teal" />
                          <span>{opp.mode}</span>
                        </span>
                      </div>

                      {/* Title & Posting Company */}
                      <div>
                        <h3 className="font-serif text-lg font-bold text-brand-navy leading-snug">
                          {opp.title}
                        </h3>
                        <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-brand-teal">
                          <Building2 className="h-3.5 w-3.5 text-brand-teal" />
                          <span>{opp.companyName || "Industry Partner"}</span>
                          <span className="text-brand-slate/60 font-normal">&bull; Verified Host</span>
                        </p>
                        <p className="mt-2 text-xs text-brand-slate line-clamp-3 leading-relaxed">
                          {opp.description}
                        </p>
                      </div>

                      {/* Required Expertise Tags */}
                      {opp.requiredExpertise && opp.requiredExpertise.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-slate mb-1.5">
                            Required Domain Expertise:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {opp.requiredExpertise.map((skill, sIdx) => (
                              <span
                                key={sIdx}
                                className="rounded bg-brand-paper px-2.5 py-1 text-[11px] font-mono font-medium text-brand-navy border border-brand-navy/15"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Meta Information: Duration & Deadline */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-brand-slate pt-3 border-t border-brand-navy/10">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-brand-teal" />
                          <span>Duration: <strong>{opp.duration}</strong></span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-brand-gold" />
                          <span>Apply by: <strong>{opp.applyBy}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action / Express Interest Button */}
                    <div className="mt-5 pt-4 border-t border-brand-navy/10 flex items-center justify-between gap-3">
                      <span className="text-[11px] text-brand-slate">
                        {hasExpressed ? "Application registered" : "Direct faculty application"}
                      </span>

                      {hasExpressed ? (
                        <Button
                          disabled
                          size="sm"
                          className="bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-xs px-4 cursor-default shadow-3xs"
                        >
                          <Check className="h-3.5 w-3.5 mr-1 text-emerald-600 stroke-[3]" />
                          <span>Interest Sent ✓</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleExpressInterest(opp)}
                          disabled={isSubmittingThis}
                          className="bg-brand-navy hover:bg-[#182344] text-brand-paper font-semibold text-xs px-4 shadow-xs"
                        >
                          {isSubmittingThis ? (
                            <span>Submitting...</span>
                          ) : (
                            <>
                              <Send className="h-3 w-3 mr-1.5 text-brand-gold" />
                              <span>Express Interest</span>
                            </>
                          )}
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
    </ProtectedRoute>
  );
}
