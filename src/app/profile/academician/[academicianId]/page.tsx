"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { Academician, User } from "@/types";
import { WaxSealBadge } from "@/components/discover/WaxSealBadge";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Sparkles,
  ExternalLink,
  Award,
  Share2,
  Check,
  Printer,
  Mail,
  ArrowLeft,
  Building2,
  BookOpen,
  Briefcase,
  Layers,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

const TRACK_META: Record<string, { label: string; desc: string }> = {
  FDP: {
    label: "Faculty Development Programs (FDP)",
    desc: "Pedagogical training, modern technology workshops, and faculty upskilling.",
  },
  "industrial-training": {
    label: "Industrial Training",
    desc: "Corporate faculty sabbaticals and experiential industry curriculum exposure.",
  },
  consultancy: {
    label: "Industrial Consultancy",
    desc: "Expert technical advisory, solution architecture, and funded problem solving.",
  },
  research: {
    label: "Collaborative Research",
    desc: "Joint industry-academia research grants, IP co-development, and publications.",
  },
  "guest-lecture": {
    label: "Guest Lectures & Workshops",
    desc: "Expert keynote delivery, hackathon mentorship, and masterclasses.",
  },
};

export default function PublicAcademicianProfilePage() {
  const params = useParams();
  const academicianId = params.academicianId as string;

  const [academician, setAcademician] = useState<Academician | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!academicianId) return;
      setLoading(true);

      try {
        const acadRef = doc(db, "academicians", academicianId);
        const acadSnap = await getDoc(acadRef);

        const userRef = doc(db, "users", academicianId);
        const userSnap = await getDoc(userRef);

        if (acadSnap.exists()) {
          setAcademician(acadSnap.data() as Academician);
        }
        if (userSnap.exists()) {
          setUserProfile(userSnap.data() as User);
        }
      } catch (err) {
        console.error("Failed loading academician portfolio:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [academicianId]);

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

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#F4F1EA] py-12 px-4 flex justify-center">
        <div className="w-full max-w-3xl space-y-6">
          <div className="h-64 rounded-2xl bg-black/5 animate-pulse" />
          <div className="h-48 rounded-2xl bg-black/5 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!academician && !userProfile) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-[#F4F1EA] py-16 px-4 flex justify-center items-center">
        <div className="max-w-md w-full rounded-2xl border-2 border-dashed border-brand-navy/20 bg-[#FDFCF9] p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-navy/10 text-brand-navy mb-4">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h2 className="font-serif text-xl font-bold text-brand-navy">
            Academician Dossier Not Found
          </h2>
          <p className="mt-2 text-xs text-brand-slate leading-relaxed">
            The requested faculty profile could not be located on the SkillSwipe registry. It may be private or pending verification.
          </p>
          <div className="mt-6">
            <Link href="/">
              <Button size="sm" className="bg-brand-navy text-brand-paper text-xs font-semibold">
                Return Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const basicInfo = academician?.basicInfo || {
    institution: "Academic Institution",
    department: "Academic Department",
    designation: "Faculty Member",
  };
  const facultyName = userProfile?.name || basicInfo.designation;
  const interests = academician?.interests || [];
  const expertise = academician?.expertiseAreas || [];
  const links = academician?.links;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F4F1EA] py-8 sm:py-12 px-4 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        
        {/* Navigation & Action Bar */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/dashboard/company"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-navy hover:text-brand-teal transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="h-8 border-brand-navy/20 bg-[#FDFCF9] text-xs font-semibold text-brand-navy hover:bg-white shadow-3xs"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5 mr-1 text-brand-gold" />
                  <span>Share Dossier</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8 border-brand-navy/20 bg-[#FDFCF9] text-xs font-semibold text-brand-navy hover:bg-white shadow-3xs"
            >
              <Printer className="h-3.5 w-3.5 mr-1 text-brand-teal" />
              <span>Print</span>
            </Button>
          </div>
        </div>

        {/* Credential Dossier Certificate Container */}
        <div className="rounded-2xl border-4 border-double border-brand-navy/30 bg-[#FDFCF9] p-6 sm:p-10 shadow-md relative overflow-hidden">
          
          {/* Top Gold Corner Accents */}
          <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-brand-gold/60" />
          <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-brand-gold/60" />
          <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-brand-gold/60" />
          <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-brand-gold/60" />

          {/* Institutional Header */}
          <div className="border-b-2 border-brand-navy/15 pb-6 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-navy px-3.5 py-1 text-[10px] font-bold uppercase tracking-widest text-brand-gold mb-3 shadow-3xs">
              <Sparkles className="h-3 w-3" />
              <span>Smart India Hackathon • SIH206644</span>
            </div>
            
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-brand-navy">
              {facultyName}
            </h1>
            
            <p className="mt-1 font-serif text-base font-semibold text-brand-teal">
              {basicInfo.designation}
            </p>

            <p className="mt-0.5 text-xs text-brand-slate flex items-center justify-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-brand-navy/60" />
              <span>{basicInfo.department}</span> &bull; <strong>{basicInfo.institution}</strong>
            </p>

            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                <span>Verified Academician</span>
              </span>
              <span className="rounded-full bg-brand-navy/10 px-2.5 py-0.5 text-[11px] font-mono text-brand-navy">
                ID: {academicianId.slice(0, 8)}
              </span>
            </div>
          </div>

          {/* Section: Collaboration Interests */}
          <div className="mt-8 space-y-3">
            <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-brand-navy flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-brand-teal" />
              <span>Active Collaboration Interests</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {interests.map((interestKey) => {
                const meta = TRACK_META[interestKey] || { label: interestKey, desc: "Academic initiative" };
                return (
                  <div
                    key={interestKey}
                    className="rounded-xl border border-brand-navy/15 bg-white p-4 shadow-3xs"
                  >
                    <div className="flex items-center gap-2">
                      <WaxSealBadge size="sm" />
                      <h3 className="font-serif text-xs font-bold text-brand-navy">
                        {meta.label}
                      </h3>
                    </div>
                    <p className="mt-1 text-[11px] text-brand-slate leading-relaxed">
                      {meta.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Subject Expertise */}
          <div className="mt-8 space-y-3">
            <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-brand-navy flex items-center gap-2">
              <Layers className="h-4 w-4 text-brand-gold" />
              <span>Subject & Research Expertise</span>
            </h2>

            {expertise.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {expertise.map((exp, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 rounded-full border border-brand-navy/20 bg-white px-3.5 py-1 text-xs font-mono font-bold text-brand-navy shadow-3xs"
                  >
                    <WaxSealBadge size="sm" />
                    <span>{exp}</span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-brand-slate italic">
                General academic and instructional domain.
              </p>
            )}
          </div>

          {/* Section: Verified External Profiles & Contact */}
          {links && (
            <div className="mt-8 pt-6 border-t border-brand-navy/15 space-y-3">
              <h2 className="font-serif text-sm font-bold uppercase tracking-wider text-brand-navy flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-brand-navy" />
                <span>Verified Faculty Contacts & Portals</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {links.email && (
                  <div className="rounded-lg border border-brand-navy/10 bg-white p-3.5 flex items-center justify-between">
                    <div>
                      <span className="block text-[10px] font-bold uppercase text-brand-slate">
                        Official Email
                      </span>
                      <span className="font-mono font-bold text-brand-navy">{links.email}</span>
                    </div>
                    <a
                      href={`mailto:${links.email}`}
                      className="rounded p-1.5 bg-brand-navy text-brand-paper hover:bg-brand-navy/90"
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}

                {links.linkedin && (
                  <div className="rounded-lg border border-brand-navy/10 bg-white p-3.5 flex items-center justify-between">
                    <div className="truncate pr-2">
                      <span className="block text-[10px] font-bold uppercase text-brand-slate">
                        LinkedIn
                      </span>
                      <span className="font-medium text-brand-teal truncate block">
                        {links.linkedin}
                      </span>
                    </div>
                    <a
                      href={links.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded p-1.5 bg-brand-teal/10 text-brand-teal hover:bg-brand-teal/20"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}

                {links.scholarProfile && (
                  <div className="rounded-lg border border-brand-navy/10 bg-white p-3.5 flex items-center justify-between">
                    <div className="truncate pr-2">
                      <span className="block text-[10px] font-bold uppercase text-brand-slate">
                        Google Scholar / ORCID
                      </span>
                      <span className="font-medium text-brand-teal truncate block">
                        {links.scholarProfile}
                      </span>
                    </div>
                    <a
                      href={links.scholarProfile}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded p-1.5 bg-brand-teal/10 text-brand-teal hover:bg-brand-teal/20"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}

                {links.institutionProfile && (
                  <div className="rounded-lg border border-brand-navy/10 bg-white p-3.5 flex items-center justify-between">
                    <div className="truncate pr-2">
                      <span className="block text-[10px] font-bold uppercase text-brand-slate">
                        Faculty / Lab Webpage
                      </span>
                      <span className="font-medium text-brand-teal truncate block">
                        {links.institutionProfile}
                      </span>
                    </div>
                    <a
                      href={links.institutionProfile}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded p-1.5 bg-brand-teal/10 text-brand-teal hover:bg-brand-teal/20"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dossier Footer Attestation */}
          <div className="mt-8 pt-6 border-t-2 border-brand-navy/15 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex items-center gap-3">
              <WaxSealBadge size="md" />
              <div>
                <p className="font-serif text-xs font-bold text-brand-navy">
                  SkillSwipe Digital Dossier Registry
                </p>
                <p className="text-[10px] text-brand-slate">
                  Mutual-consent faculty and corporate collaboration protocol.
                </p>
              </div>
            </div>
            <div className="text-[11px] text-brand-slate/80">
              Registered via SIH206644
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
