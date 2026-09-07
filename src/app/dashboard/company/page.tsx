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
  updateDoc,
} from "firebase/firestore";
import { Company, Match, Student, CompanyOpenRole } from "@/types";
import { Button } from "@/components/ui/button";
import { WaxSealBadge } from "@/components/discover/WaxSealBadge";
import {
  Building2,
  Briefcase,
  Users,
  Sparkles,
  ArrowRight,
  GraduationCap,
  Plus,
  ExternalLink,
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Award,
  Search,
  Compass,
  Edit2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { AcademicOpportunitiesSection } from "@/components/company/AcademicOpportunitiesSection";
import { RolePostingModal } from "@/components/company/RolePostingModal";

interface SkillCategoryStat {
  category: string;
  count: number;
  percentage: number;
  color: string;
}

interface TopSkillStat {
  name: string;
  count: number;
}

const SKILL_TAXONOMY: Record<string, string[]> = {
  "Web & Frontend": ["react", "next.js", "typescript", "javascript", "html", "css", "tailwind", "vue", "angular", "frontend"],
  "Backend & Cloud": ["node.js", "python", "go", "java", "docker", "aws", "gcp", "express", "kubernetes", "cloud", "backend"],
  "AI & Data Science": ["machine learning", "deep learning", "tensorflow", "pytorch", "pandas", "data science", "nlp", "ai", "computer vision"],
  "Data & Systems": ["sql", "postgresql", "mongodb", "redis", "c++", "c", "rust", "database", "system design"],
  "Mobile & App": ["flutter", "react native", "swift", "kotlin", "android", "ios", "mobile"],
};

export default function CompanyDashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"pipeline" | "academic">("pipeline");
  const [companyData, setCompanyData] = useState<Company | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [interestedStudents, setInterestedStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Derived Analytics State
  const [categoryStats, setCategoryStats] = useState<SkillCategoryStat[]>([]);
  const [topSkills, setTopSkills] = useState<TopSkillStat[]>([]);
  const [roleMatchCounts, setRoleMatchCounts] = useState<Record<string, number>>({});

  // Role Modal State (Create & Edit)
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CompanyOpenRole | null>(null);
  const [editingRoleIndex, setEditingRoleIndex] = useState<number | null>(null);

  const handleOpenCreateRole = () => {
    setEditingRole(null);
    setEditingRoleIndex(null);
    setIsRoleModalOpen(true);
  };

  const handleOpenEditRole = (role: CompanyOpenRole, idx: number) => {
    setEditingRole(role);
    setEditingRoleIndex(idx);
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = async (savedRole: CompanyOpenRole) => {
    if (!user || !companyData) return;
    const currentRoles = companyData.openRoles ? [...companyData.openRoles] : [];
    if (editingRoleIndex !== null && editingRoleIndex >= 0) {
      currentRoles[editingRoleIndex] = savedRole;
    } else {
      currentRoles.push(savedRole);
    }
    const compRef = doc(db, "companies", user.uid);
    await updateDoc(compRef, { openRoles: currentRoles });
    setCompanyData({ ...companyData, openRoles: currentRoles });
  };

  const handleDeleteRole = async (idx: number) => {
    if (!user || !companyData) return;
    const target = companyData.openRoles?.[idx];
    if (
      !confirm(
        `Are you sure you want to remove the listing for "${target?.title || "this role"}"?`
      )
    ) {
      return;
    }
    try {
      const currentRoles = (companyData.openRoles || []).filter((_, i) => i !== idx);
      const compRef = doc(db, "companies", user.uid);
      await updateDoc(compRef, { openRoles: currentRoles });
      setCompanyData({ ...companyData, openRoles: currentRoles });
    } catch (err) {
      console.error("Failed to delete role:", err);
    }
  };

  useEffect(() => {
    async function loadDashboardData() {
      if (!user) return;
      setLoading(true);

      try {
        // 1. Fetch Company profile document
        const companyRef = doc(db, "companies", user.uid);
        const compSnap = await getDoc(companyRef);
        let currentCompany: Company | null = null;
        if (compSnap.exists()) {
          currentCompany = compSnap.data() as Company;
          setCompanyData(currentCompany);
        }

        // 2. Fetch all Matches where companyId == user.uid
        const matchesQuery = query(
          collection(db, "matches"),
          where("companyId", "==", user.uid)
        );
        const matchesSnap = await getDocs(matchesQuery);
        const userMatches: Match[] = [];
        matchesSnap.forEach((d) => userMatches.push(d.data() as Match));
        setMatches(userMatches);

        // 3. Fetch students who swiped right on this company OR matched with them
        const studentMap = new Map<string, Student>();

        // 3a. Try querying students with swipedRight array-contains
        try {
          const swipedStudentsQuery = query(
            collection(db, "students"),
            where("swipedRight", "array-contains", user.uid)
          );
          const swipedSnap = await getDocs(swipedStudentsQuery);
          swipedSnap.forEach((d) => {
            const s = d.data() as Student;
            studentMap.set(s.uid, s);
          });
        } catch (queryErr) {
          console.warn("Direct swipedRight query notice:", queryErr);
        }

        // 3b. Also fetch any students from the matches list not already retrieved
        await Promise.all(
          userMatches.map(async (m) => {
            if (!studentMap.has(m.studentId)) {
              try {
                const sSnap = await getDoc(doc(db, "students", m.studentId));
                if (sSnap.exists()) {
                  studentMap.set(m.studentId, sSnap.data() as Student);
                }
              } catch (e) {
                console.warn("Failed fetching matched student doc:", e);
              }
            }
          })
        );

        const studentsList = Array.from(studentMap.values());
        setInterestedStudents(studentsList);

        // 4. Compute matches per role
        const roleCounts: Record<string, number> = {};
        if (currentCompany?.openRoles) {
          currentCompany.openRoles.forEach((r) => {
            roleCounts[r.title] = 0;
          });
        }

        userMatches.forEach((m) => {
          if (m.roleTitle && roleCounts[m.roleTitle] !== undefined) {
            roleCounts[m.roleTitle] += 1;
          } else if (currentCompany?.openRoles && currentCompany.openRoles.length > 0) {
            // Attribute to the primary role if unspecified
            const firstRoleTitle = currentCompany.openRoles[0].title;
            roleCounts[firstRoleTitle] = (roleCounts[firstRoleTitle] || 0) + 1;
          }
        });
        setRoleMatchCounts(roleCounts);

        // 5. Compute Skills Category Analytics & Top Skills
        const categoryCounts: Record<string, number> = {
          "Web & Frontend": 0,
          "Backend & Cloud": 0,
          "AI & Data Science": 0,
          "Data & Systems": 0,
          "Mobile & App": 0,
        };

        const skillFrequency: Record<string, number> = {};

        // Aggregate from all students who swiped right or matched
        studentsList.forEach((st) => {
          st.skills?.forEach((sk) => {
            const rawName = sk.name.trim();
            const lowerName = rawName.toLowerCase();

            // Tally overall frequency
            skillFrequency[rawName] = (skillFrequency[rawName] || 0) + 1;

            // Map to category
            for (const [cat, keywords] of Object.entries(SKILL_TAXONOMY)) {
              if (keywords.some((kw) => lowerName.includes(kw))) {
                categoryCounts[cat] += 1;
                break;
              }
            }
          });
        });

        // Determine max category count for bar chart scaling
        const maxCatCount = Math.max(...Object.values(categoryCounts), 1);
        const categoryColors = [
          "bg-[#1F6F5C]", // Teal
          "bg-[#101830]", // Navy
          "bg-[#D4A017]", // Gold
          "bg-blue-600",
          "bg-indigo-600",
        ];

        const computedCatStats: SkillCategoryStat[] = Object.entries(categoryCounts).map(
          ([category, count], idx) => ({
            category,
            count,
            percentage: Math.round((count / maxCatCount) * 100),
            color: categoryColors[idx % categoryColors.length],
          })
        );
        setCategoryStats(computedCatStats);

        // Top 8 skills
        const sortedTopSkills: TopSkillStat[] = Object.entries(skillFrequency)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);
        setTopSkills(sortedTopSkills);

      } catch (err) {
        console.error("Failed loading company dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [user]);

  const totalMatchesCount = matches.length || companyData?.matches?.length || 0;
  const interestedStudentsCount = interestedStudents.length || totalMatchesCount;

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["company"]}>
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

  return (
    <ProtectedRoute allowedRoles={["company"]}>
      <div className="mx-auto min-h-[calc(100vh-4rem)] max-w-5xl px-4 py-8 sm:px-6 space-y-8">
        
        {/* Welcome Header */}
        <div className="rounded-2xl border-2 border-brand-navy/20 bg-[#FDFCF9] p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-brand-navy/20 bg-brand-paper/50 overflow-hidden shadow-2xs">
                {companyData?.basicInfo?.logoUrl ? (
                  <img
                    src={companyData.basicInfo.logoUrl}
                    alt="Company Logo"
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <Building2 className="h-8 w-8 text-brand-teal" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-serif text-2xl font-bold text-brand-navy sm:text-3xl">
                    {companyData?.basicInfo?.name || "Company Dashboard"}
                  </h1>
                  <span className="inline-flex items-center rounded-full border border-brand-teal/30 bg-brand-teal/10 px-2.5 py-0.5 text-xs font-semibold text-brand-teal">
                    Verified Industry Partner
                  </span>
                </div>

                <p className="mt-1 text-xs text-brand-slate">
                  {companyData?.basicInfo?.industry || "Industry Partner"} &bull;{" "}
                  {companyData?.basicInfo?.location || "Remote"}
                  {companyData?.basicInfo?.website && (
                    <a
                      href={companyData.basicInfo.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-brand-teal ml-2 hover:underline"
                    >
                      <span>Website</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </p>
                <p className="text-xs text-brand-slate/80 mt-0.5">
                  Recruiter Portal &bull; {user?.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link href="/onboarding/company">
                <Button variant="outline" size="sm" className="text-xs font-semibold">
                  Edit Profile
                </Button>
              </Link>
              <Link href="/dashboard/company/browse">
                <Button variant="outline" size="sm" className="border-brand-navy/30 text-brand-navy hover:bg-brand-navy hover:text-white text-xs font-semibold">
                  <Search className="h-3.5 w-3.5 mr-1 text-brand-gold" />
                  <span>Browse Talent</span>
                </Button>
              </Link>
              <Link href="/dashboard/company/discover">
                <Button size="sm" className="bg-brand-navy hover:bg-[#182344] text-brand-paper text-xs font-semibold shadow-xs">
                  <Sparkles className="h-3.5 w-3.5 mr-1 text-brand-gold" />
                  <span>Discover Deck</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Metric Indicators / Stat Cards */}
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 border-t border-brand-navy/10 pt-6">
            {/* Total Matches */}
            <Link
              href="/dashboard/company/matches"
              className="rounded-lg border border-brand-navy/10 bg-brand-paper/50 p-4 hover:border-brand-gold hover:bg-brand-paper transition-all cursor-pointer block"
            >
              <div className="flex items-center justify-between text-brand-slate text-xs font-semibold uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-brand-gold" />
                  <span>Total Matches</span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-brand-gold" />
              </div>
              <p className="mt-2 font-serif text-2xl font-bold text-brand-navy">
                {totalMatchesCount}
              </p>
              <span className="text-[11px] text-brand-slate">Reciprocal opt-ins &rarr;</span>
            </Link>

            {/* Active Open Roles */}
            <div className="rounded-lg border border-brand-navy/10 bg-brand-paper/50 p-4">
              <div className="flex items-center gap-1.5 text-brand-slate text-xs font-semibold uppercase tracking-wider">
                <Briefcase className="h-4 w-4 text-brand-teal" />
                <span>Posted Roles</span>
              </div>
              <p className="mt-2 font-serif text-2xl font-bold text-brand-navy">
                {companyData?.openRoles?.length || 0}
              </p>
              <span className="text-[11px] text-brand-slate">Published positions</span>
            </div>

            {/* Inflow / Interested Students */}
            <div className="rounded-lg border border-brand-navy/10 bg-brand-paper/50 p-4">
              <div className="flex items-center gap-1.5 text-brand-slate text-xs font-semibold uppercase tracking-wider">
                <Users className="h-4 w-4 text-blue-600" />
                <span>Candidate Inflow</span>
              </div>
              <p className="mt-2 font-serif text-2xl font-bold text-brand-navy">
                {interestedStudentsCount}
              </p>
              <span className="text-[11px] text-brand-slate">Interested students</span>
            </div>

            {/* Top In-Demand Skill */}
            <div className="rounded-lg border border-brand-navy/10 bg-brand-paper/50 p-4">
              <div className="flex items-center gap-1.5 text-brand-slate text-xs font-semibold uppercase tracking-wider">
                <Award className="h-4 w-4 text-brand-gold" />
                <span>Top Pipeline Skill</span>
              </div>
              <p className="mt-2 font-serif text-xl font-bold text-brand-navy truncate">
                {topSkills[0]?.name || "Python"}
              </p>
              <span className="text-[11px] text-brand-slate">
                {topSkills[0]?.count ? `${topSkills[0].count} candidates` : "Highest match density"}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b-2 border-brand-navy/10 gap-2">
          <button
            type="button"
            id="tab-btn-recruitment"
            onClick={() => setActiveTab("pipeline")}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-t-lg transition-all border-b-2 -mb-[2px] ${
              activeTab === "pipeline"
                ? "border-brand-navy bg-white text-brand-navy shadow-3xs"
                : "border-transparent text-brand-slate hover:text-brand-navy hover:bg-brand-paper/40"
            }`}
          >
            <Briefcase className="h-4 w-4 text-brand-teal" />
            <span>Student Recruitment & Pipeline</span>
          </button>
          <button
            type="button"
            id="tab-btn-academic"
            onClick={() => setActiveTab("academic")}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-t-lg transition-all border-b-2 -mb-[2px] ${
              activeTab === "academic"
                ? "border-brand-navy bg-white text-brand-navy shadow-3xs"
                : "border-transparent text-brand-slate hover:text-brand-navy hover:bg-brand-paper/40"
            }`}
          >
            <GraduationCap className="h-4 w-4 text-brand-gold" />
            <span>Post Academic Collaboration</span>
          </button>
        </div>

        {activeTab === "pipeline" ? (
          <>
            {/* Section 1: Posted Roles Summary & Match Counters */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-serif text-xl font-bold text-brand-navy">
                    Posted Roles & Match Performance
                  </h2>
                  <p className="text-xs text-brand-slate mt-0.5">
                    Summary of active recruitment openings, calibrated career tracks, and candidate match volumes per role.
                  </p>
                </div>
                <Button
                  id="dashboard-add-role-btn"
                  size="sm"
                  variant="outline"
                  onClick={handleOpenCreateRole}
                  className="text-xs font-semibold"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  <span>Add New Role</span>
                </Button>
              </div>

              {companyData?.openRoles && companyData.openRoles.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {companyData.openRoles.map((role, idx) => {
                    const matchCount = roleMatchCounts[role.title] || 0;

                    return (
                      <div
                        key={idx}
                        className="flex flex-col justify-between rounded-xl border border-brand-navy/15 bg-white p-5 shadow-xs transition-all hover:border-brand-gold hover:shadow-sm"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="rounded bg-brand-teal/10 px-2 py-0.5 text-[10px] font-bold capitalize text-brand-teal">
                                  {role.type}
                                </span>
                                {role.careerTrack && (
                                  <span className="inline-flex items-center gap-1 rounded bg-brand-gold/15 px-2 py-0.5 text-[10px] font-semibold text-[#8E6503] border border-brand-gold/30">
                                    <Compass className="h-3 w-3 text-brand-gold" />
                                    <span className="capitalize">{role.careerTrack.replace(/-/g, " ")}</span>
                                  </span>
                                )}
                              </div>
                              <h3 className="mt-1.5 font-serif text-base font-bold text-brand-navy">
                                {role.title}
                              </h3>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Edit Role Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditRole(role, idx)}
                                className="inline-flex items-center gap-1 rounded border border-brand-navy/15 bg-brand-paper/60 px-2 py-1 text-xs text-brand-navy hover:border-brand-navy hover:bg-white transition-all"
                                title="Edit Role"
                              >
                                <Edit2 className="h-3 w-3 text-brand-slate" />
                                <span className="text-[11px] font-medium">Edit</span>
                              </button>

                              {/* Delete Role Button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteRole(idx)}
                                className="rounded border border-brand-navy/15 bg-brand-paper/60 p-1 text-brand-slate hover:border-brand-brick hover:bg-brand-brick/10 hover:text-brand-brick transition-all"
                                title="Delete Role"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>

                              {/* Match counter badge */}
                              <Link href="/dashboard/company/matches">
                                <span className="inline-flex items-center gap-1 rounded-full border border-brand-gold/40 bg-brand-gold/15 px-2.5 py-1 text-xs font-bold text-[#8E6503] hover:bg-brand-gold/25 transition-colors cursor-pointer">
                                  <Sparkles className="h-3 w-3 text-brand-gold" />
                                  <span>{matchCount} Matched</span>
                                </span>
                              </Link>
                            </div>
                          </div>

                          {role.stipend && (
                            <p className="mt-1 font-mono text-xs font-semibold text-brand-gold">
                              Stipend: {role.stipend}
                            </p>
                          )}

                          <p className="mt-2 text-xs text-brand-slate leading-relaxed line-clamp-2">
                            {role.description}
                          </p>

                          {role.requiredSkills && role.requiredSkills.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1">
                              {role.requiredSkills.map((sk) => (
                                <span
                                  key={sk}
                                  className="rounded border border-brand-navy/15 bg-brand-paper px-2 py-0.5 text-[10px] font-mono text-brand-navy"
                                >
                                  {sk}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-brand-navy/10 flex items-center justify-between text-xs">
                          <span className="text-brand-slate text-[11px]">
                            Status: <span className="font-semibold text-emerald-700">Active Listing</span>
                          </span>
                          <Link
                            href="/dashboard/company/matches"
                            className="inline-flex items-center gap-1 font-semibold text-brand-navy hover:text-brand-teal transition-colors"
                          >
                            <span>Review Candidates</span>
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-brand-navy/20 bg-white p-8 text-center">
                  <Briefcase className="mx-auto h-8 w-8 text-brand-slate" />
                  <p className="mt-2 text-sm font-semibold text-brand-navy">No open roles published yet</p>
                  <p className="mt-1 text-xs text-brand-slate">
                    Add open roles with AYUSH career tracks and competencies to start matching with pre-qualified candidates.
                  </p>
                  <Button
                    size="sm"
                    onClick={handleOpenCreateRole}
                    className="mt-4 bg-brand-navy text-brand-paper"
                  >
                    Create Role
                  </Button>
                </div>
              )}
            </div>

        {/* Section 2: Clean & Functional Analytics View */}
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* Analytics Card 1: Matches by Skill Category Bar Chart */}
          <div className="rounded-xl border border-brand-navy/15 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-brand-navy/10 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-brand-teal" />
                <h3 className="font-serif text-base font-bold text-brand-navy">
                  Matches by Skill Category
                </h3>
              </div>
              <span className="text-[11px] font-mono font-medium text-brand-slate">
                Domain Distribution
              </span>
            </div>

            <p className="mt-2 text-xs text-brand-slate">
              Proportional distribution of candidate competencies in your talent pool.
            </p>

            {/* Simple CSS/SVG Bar Chart */}
            <div className="mt-5 space-y-4">
              {categoryStats.map((item) => (
                <div key={item.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-brand-navy">{item.category}</span>
                    <span className="font-mono text-brand-slate text-[11px]">
                      {item.count} skills &bull; {item.percentage}%
                    </span>
                  </div>
                  {/* Track & Bar */}
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                      style={{ width: `${Math.max(item.percentage, 4)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Analytics Card 2: Top Skills Leaderboard */}
          <div className="rounded-xl border border-brand-navy/15 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-brand-navy/10 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-brand-gold" />
                <h3 className="font-serif text-base font-bold text-brand-navy">
                  Top Skills Among Candidates
                </h3>
              </div>
              <span className="text-[11px] font-mono font-medium text-brand-slate">
                Interested Pipeline
              </span>
            </div>

            <p className="mt-2 text-xs text-brand-slate">
              Most frequent verified skills among students who swiped right on your company.
            </p>

            <div className="mt-4 divide-y divide-brand-navy/5">
              {topSkills.length > 0 ? (
                topSkills.map((sk, idx) => (
                  <div key={sk.name} className="flex items-center justify-between py-2.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-paper font-mono text-[10px] font-bold text-brand-navy border border-black/10">
                        {idx + 1}
                      </span>
                      <span className="font-mono font-semibold text-brand-navy">
                        {sk.name}
                      </span>
                      <WaxSealBadge size="xs" />
                    </div>
                    <span className="rounded bg-brand-gold/15 px-2 py-0.5 font-mono text-[11px] font-bold text-[#8E6503]">
                      {sk.count} {sk.count === 1 ? "student" : "students"}
                    </span>
                  </div>
                ))
              ) : (
                <p className="py-6 text-center text-xs text-brand-slate italic">
                  No candidate skill data recorded yet.
                </p>
              )}
            </div>
          </div>

        </div>

        {/* Section 3: Call To Action for Candidate Discovery */}
        <div className="rounded-2xl border-2 border-brand-navy bg-brand-navy p-6 sm:p-8 text-brand-paper shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-gold/20 px-3 py-1 text-xs font-semibold text-brand-gold">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Candidate Discovery Deck</span>
              </div>
              <h2 className="font-serif text-2xl font-bold tracking-tight text-brand-paper sm:text-3xl">
                Ready to Review Qualified Candidates?
              </h2>
              <p className="text-xs text-brand-paper/80 max-w-xl">
                No inbox flooding with 500 unranked resumes. Review pre-scored candidate credential cards ranked by skill overlap and swipe right to establish mutual consent.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link href="/dashboard/company/matches">
                <Button
                  variant="outline"
                  className="border-brand-gold/40 text-brand-gold hover:bg-brand-gold/20 text-xs font-semibold"
                >
                  <span>View Matches</span>
                </Button>
              </Link>

              <Link href="/dashboard/company/discover">
                <Button
                  id="company-launch-discover-btn"
                  size="lg"
                  className="bg-brand-gold text-brand-navy font-bold hover:bg-[#c49214] shadow-lg"
                >
                  <span>Review Candidate Stack</span>
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </>
    ) : (
      <AcademicOpportunitiesSection companyName={companyData?.basicInfo?.name} />
    )}

      </div>
      <RolePostingModal
        isOpen={isRoleModalOpen}
        onClose={() => {
          setIsRoleModalOpen(false);
          setEditingRole(null);
          setEditingRoleIndex(null);
        }}
        onSave={handleSaveRole}
        initialRole={editingRole}
      />
    </ProtectedRoute>
  );
}
