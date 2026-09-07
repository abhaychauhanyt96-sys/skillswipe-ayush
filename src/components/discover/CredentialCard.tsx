"use client";

import React from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { WaxSealBadge } from "@/components/discover/WaxSealBadge";
import {
  Building2,
  GraduationCap,
  Sparkles,
  ExternalLink,
  MapPin,
  Briefcase,
  Layers,
  Award,
} from "lucide-react";
import { Student, Company, CompanyOpenRole } from "@/types";
import { ScoreBreakdown } from "@/lib/matching/scoring";

export interface CardData {
  id: string; // Document ID (company UID or student UID)
  type: "company-role" | "student-candidate";
  // If company role:
  company?: Company;
  role?: CompanyOpenRole;
  // If student candidate:
  student?: Student;
  // Calculated compatibility score & debug breakdown:
  compatibilityScore?: number;
  breakdown?: ScoreBreakdown;
  matchedSkills?: string[];
  missingSkills?: string[];
}

interface CredentialCardProps {
  card: CardData;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isTopCard: boolean;
}

export function CredentialCard({
  card,
  onSwipeLeft,
  onSwipeRight,
  isTopCard,
}: CredentialCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-250, 250], [-18, 18]);
  const opacity = useTransform(x, [-350, -200, 0, 200, 350], [0, 1, 1, 1, 0]);

  // Watermark stamp opacity transforms
  const rightStampOpacity = useTransform(x, [30, 120], [0, 1]);
  const leftStampOpacity = useTransform(x, [-30, -120], [0, 1]);

  const handleDragEnd = (_: any, info: any) => {
    const threshold = 120;
    const velocity = info.velocity.x;

    if (info.offset.x > threshold || velocity > 400) {
      onSwipeRight();
    } else if (info.offset.x < -threshold || velocity < -400) {
      onSwipeLeft();
    }
  };

  const isCompanyRole = card.type === "company-role";

  return (
    <motion.div
      style={isTopCard ? { x, rotate, opacity } : {}}
      drag={isTopCard ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      className={`absolute inset-0 cursor-grab active:cursor-grabbing select-none ${
        isTopCard ? "z-20" : "z-10 scale-[0.97] translate-y-3 opacity-80 pointer-events-none"
      }`}
    >
      {/* Credential Card Folio */}
      <div className="relative h-full w-full rounded-2xl border-2 border-brand-navy/30 bg-brand-paper p-6 sm:p-7 flex flex-col justify-between overflow-hidden shadow-sm">
        {/* Inner Gold Hairline Rule (Academic Charter Motif) */}
        <div className="absolute inset-2.5 rounded-xl border border-brand-gold/40 pointer-events-none" />

        {/* DRAG WATERMARK STAMP - RIGHT (MUTUAL CONSENT) */}
        <motion.div
          style={{ opacity: rightStampOpacity }}
          className="absolute top-10 right-8 z-30 pointer-events-none rotate-12 border-4 border-brand-teal px-4 py-1.5 rounded-lg bg-white/95 text-brand-teal shadow-md"
        >
          <span className="font-serif text-lg font-black uppercase tracking-widest">
            MUTUAL CONSENT
          </span>
        </motion.div>

        {/* DRAG WATERMARK STAMP - LEFT (DISMISSED) */}
        <motion.div
          style={{ opacity: leftStampOpacity }}
          className="absolute top-10 left-8 z-30 pointer-events-none -rotate-12 border-4 border-brand-brick px-4 py-1.5 rounded-lg bg-white/95 text-brand-brick shadow-md"
        >
          <span className="font-serif text-lg font-black uppercase tracking-widest">
            DISMISSED
          </span>
        </motion.div>

        {/* CARD TOP HEADER: Issuer & Compatibility Score Ledger */}
        <div>
          <div className="flex items-start justify-between gap-3 border-b border-brand-navy/15 pb-4">
            <div className="flex items-center gap-3">
              {/* Seal Emblem / Avatar */}
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-brand-navy/20 bg-white p-1 shadow-xs">
                {isCompanyRole ? (
                  card.company?.basicInfo?.logoUrl ? (
                    <img
                      src={card.company.basicInfo.logoUrl}
                      alt="Logo"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Building2 className="h-6 w-6 text-brand-teal" />
                  )
                ) : (
                  <GraduationCap className="h-6 w-6 text-brand-navy" />
                )}
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-brand-slate">
                  {isCompanyRole
                    ? card.company?.basicInfo?.industry || "Industry Partner"
                    : "Official Candidate Dossier"}
                </span>
                <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-brand-navy">
                  {isCompanyRole
                    ? card.company?.basicInfo?.name
                    : card.student?.uid}
                </h3>
                <p className="text-xs text-brand-slate">
                  {isCompanyRole
                    ? card.company?.basicInfo?.location || "Location Flexible"
                    : `${card.student?.basicInfo?.degree} • ${card.student?.basicInfo?.college}`}
                </p>
              </div>
            </div>

            {/* Compatibility Score Chip & Debug Inspector */}
            {card.compatibilityScore !== undefined && (
              <div className="flex flex-col items-end shrink-0">
                <div className="flex items-center gap-1.5 rounded-md border border-brand-gold/50 bg-white px-2.5 py-1 shadow-xs">
                  <Sparkles className="h-3.5 w-3.5 text-brand-gold" />
                  <span className="font-mono text-sm font-black text-brand-navy">
                    {card.compatibilityScore}%
                  </span>
                </div>

                {/* Testing Debug Ribbon */}
                {card.breakdown && (
                  <div
                    title="Debug Inspector: (Skill Overlap × 0.5) + (Location × 0.15) + (Experience × 0.15) + (Industry × 0.2)"
                    className="mt-1 flex items-center gap-1 rounded bg-brand-navy/5 border border-brand-navy/15 px-1.5 py-0.5 font-mono text-[9px] text-brand-navy shadow-2xs"
                  >
                    <span className="font-bold text-brand-teal">S:{card.breakdown.skillOverlapScore}</span>
                    <span className="text-brand-slate/40">|</span>
                    <span className="font-bold text-blue-700">L:{card.breakdown.locationScore}</span>
                    <span className="text-brand-slate/40">|</span>
                    <span className="font-bold text-amber-700">E:{card.breakdown.experienceScore}</span>
                    <span className="text-brand-slate/40">|</span>
                    <span className="font-bold text-purple-700">I:{card.breakdown.industryScore}</span>
                  </div>
                )}
                <span className="text-[9px] font-mono text-brand-slate uppercase mt-0.5">
                  Best Match First
                </span>
              </div>
            )}
          </div>

          {/* CARD MAIN BODY */}
          <div className="mt-5 space-y-4">
            {isCompanyRole ? (
              <>
                {/* Role Title & Badge */}
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-serif text-lg font-bold text-brand-navy">
                      {card.role?.title}
                    </h4>
                    <span className="rounded border border-brand-teal/30 bg-brand-teal/10 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-teal">
                      {card.role?.type}
                    </span>
                  </div>
                  {card.role?.stipend && (
                    <p className="font-mono text-xs font-semibold text-brand-teal mt-0.5">
                      {card.role.stipend}
                    </p>
                  )}
                </div>

                {/* Role Description */}
                <p className="text-xs text-brand-slate leading-relaxed line-clamp-3">
                  {card.role?.description}
                </p>

                {/* Exam-Mark Chips: Required Skills Vector */}
                <div className="border-t border-brand-navy/10 pt-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-slate">
                      Target Skill Vector
                    </span>
                    <span className="text-[10px] font-mono text-brand-slate/70">
                      Exam Ledger
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {card.role?.requiredSkills.map((sk) => {
                      const isMatched = card.matchedSkills?.some(
                        (m) => m.toLowerCase() === sk.toLowerCase()
                      );
                      return (
                        <span
                          key={sk}
                          className={`inline-flex items-center gap-1 rounded border px-2.5 py-1 text-xs font-mono transition-all ${
                            isMatched
                              ? "border-brand-teal/40 bg-brand-teal/10 font-bold text-brand-teal"
                              : "border-brand-navy/20 bg-white text-brand-navy"
                          }`}
                        >
                          {isMatched && <WaxSealBadge size={14} />}
                          <span>{sk}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Student Candidate Details */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-brand-navy">
                      Class of {card.student?.basicInfo?.year}
                    </span>
                    <span className="text-xs text-brand-slate">•</span>
                    <span className="text-xs text-brand-slate flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-brand-slate" />
                      {card.student?.basicInfo?.location}
                    </span>
                  </div>

                  {card.student?.summary && (
                    <p className="mt-2 font-serif text-xs italic text-brand-slate bg-white/60 border border-brand-navy/10 rounded p-2.5">
                      &ldquo;{card.student.summary}&rdquo;
                    </p>
                  )}
                </div>

                {/* Skills Ledger */}
                <div className="border-t border-brand-navy/10 pt-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-slate block mb-1.5">
                    Calibrated Skills ({card.student?.skills?.length || 0})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {card.student?.skills.map((s) => (
                      <span
                        key={s.name}
                        className="inline-flex items-center gap-1.5 rounded border border-brand-navy/20 bg-white px-2.5 py-1 text-xs font-mono text-brand-navy"
                      >
                        <WaxSealBadge size={14} />
                        <span className="font-semibold">{s.name}</span>
                        <span className="text-[9px] uppercase opacity-60">
                          {s.level}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Projects Showcase */}
                {card.student?.projects && card.student.projects.length > 0 && (
                  <div className="border-t border-brand-navy/10 pt-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-slate block mb-1">
                      Featured Project
                    </span>
                    <div className="rounded bg-white/70 border border-brand-navy/10 p-2 text-xs">
                      <h5 className="font-serif font-bold text-brand-navy">
                        {card.student.projects[0].title}
                      </h5>
                      <p className="text-[11px] text-brand-slate line-clamp-2 mt-0.5">
                        {card.student.projects[0].description}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* CARD FOOTER: Instruction bar */}
        <div className="border-t border-brand-navy/15 pt-3 flex items-center justify-between text-[11px] text-brand-slate font-mono">
          <span className="flex items-center gap-1">
            <span className="text-brand-brick font-bold">← Swipe Left</span> to dismiss
          </span>
          <span className="flex items-center gap-1">
            <span className="text-brand-teal font-bold">Swipe Right →</span> to consent
          </span>
        </div>
      </div>
    </motion.div>
  );
}
