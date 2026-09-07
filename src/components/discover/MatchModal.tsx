"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Building2, GraduationCap, X } from "lucide-react";
import Link from "next/link";

interface MatchModalProps {
  isOpen?: boolean;
  onClose: () => void;
  candidateName?: string;
  candidateSubtitle?: string;
  companyName: string;
  companyLogoUrl?: string;
  roleTitle: string;
  matchesUrl?: string;
}

export function MatchModal({
  isOpen = true,
  onClose,
  candidateName = "Candidate",
  candidateSubtitle,
  companyName,
  companyLogoUrl,
  roleTitle,
  matchesUrl,
}: MatchModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/90 p-4 backdrop-blur-md">
        {/* Backdrop Glow */}
        <div className="absolute inset-0 bg-radial from-brand-gold/15 to-transparent pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-2xl rounded-2xl border-2 border-brand-gold/40 bg-brand-paper p-8 text-center shadow-2xl overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full p-2 text-brand-slate hover:bg-brand-navy/10 hover:text-brand-navy transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Banner Tag */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-gold bg-brand-gold/20 px-4 py-1 text-xs font-bold uppercase tracking-widest text-[#7a5800]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Mutual Consent Established</span>
          </div>

          <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
            It&apos;s a Match!
          </h2>

          <p className="mt-2 text-xs text-brand-slate max-w-md mx-auto">
            Both parties have opted in. No cold outreach required — direct collaboration is now officially unlocked.
          </p>

          {/* Converging Cards Moment */}
          <div className="relative mt-8 flex items-center justify-center py-6">
            {/* Candidate Card (Sliding from Left) */}
            <motion.div
              initial={{ x: -120, rotate: -8, opacity: 0 }}
              animate={{ x: -30, rotate: -4, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.15 }}
              className="z-10 flex h-40 w-52 flex-col justify-between rounded-xl border-2 border-brand-navy/25 bg-white p-4 shadow-lg text-left"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-navy text-brand-gold">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-brand-gold">
                    Candidate
                  </span>
                  <h3 className="truncate font-serif text-xs font-bold text-brand-navy">
                    {candidateName}
                  </h3>
                </div>
              </div>

              <p className="text-[11px] text-brand-slate truncate">
                {candidateSubtitle || "Verified Skill Profile"}
              </p>

              <div className="border-t border-brand-navy/10 pt-2 text-[10px] font-semibold text-brand-teal uppercase">
                ✓ Consent Granted
              </div>
            </motion.div>

            {/* Stamped Wax Seal (The Center Impact) */}
            <motion.div
              initial={{ scale: 3, rotate: -30, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 22,
                delay: 0.45,
              }}
              className="z-30 -mx-6 flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#D4A017] shadow-2xl ring-4 ring-white border-2 border-[#8E6503]"
            >
              <div className="flex flex-col items-center justify-center text-center p-1 text-white">
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 36 36"
                  fill="none"
                  className="drop-shadow-sm"
                >
                  <circle cx="18" cy="18" r="14" stroke="#7A5800" strokeWidth="1.5" strokeDasharray="2 2" />
                  <path
                    d="M18 10L20.2 14.8L25.5 15.2L21.5 18.8L22.7 24L18 21.2L13.3 24L14.5 18.8L10.5 15.2L15.8 14.8L18 10Z"
                    fill="#FFF3D4"
                  />
                </svg>
                <span className="text-[8px] font-black uppercase tracking-tighter text-[#5C4000] -mt-0.5">
                  SEALED
                </span>
              </div>
            </motion.div>

            {/* Company Card (Sliding from Right) */}
            <motion.div
              initial={{ x: 120, rotate: 8, opacity: 0 }}
              animate={{ x: 30, rotate: 4, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.15 }}
              className="z-10 flex h-40 w-52 flex-col justify-between rounded-xl border-2 border-brand-teal/40 bg-white p-4 shadow-lg text-left"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-teal text-white">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-brand-teal">
                    Company
                  </span>
                  <h3 className="truncate font-serif text-xs font-bold text-brand-navy">
                    {companyName}
                  </h3>
                </div>
              </div>

              <div className="truncate">
                <span className="text-[10px] text-brand-slate uppercase font-semibold">
                  Role Matched:
                </span>
                <p className="text-xs font-bold text-brand-navy truncate">
                  {roleTitle}
                </p>
              </div>

              <div className="border-t border-brand-navy/10 pt-2 text-[10px] font-semibold text-brand-teal uppercase">
                ✓ Consent Granted
              </div>
            </motion.div>
          </div>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            {matchesUrl && (
              <Link href={matchesUrl} onClick={onClose}>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto border-brand-navy/30 bg-white text-brand-navy hover:bg-[#F7F5EF] px-6 font-semibold shadow-xs"
                >
                  <span>View in Matches</span>
                </Button>
              </Link>
            )}

            <Button
              size="lg"
              onClick={onClose}
              className="w-full sm:w-auto bg-brand-navy text-brand-gold hover:bg-[#182344] px-8 shadow-md font-bold"
            >
              <span>Keep Swiping</span>
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
