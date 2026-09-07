"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { Student, User } from "@/types";
import { WaxSealBadge } from "@/components/discover/WaxSealBadge";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Sparkles,
  ExternalLink,
  MapPin,
  Calendar,
  Award,
  FolderGit2,
  Share2,
  Check,
  Printer,
  Globe,
  FileText,
  Mail,
  ArrowLeft,
  Building2,
  Layers,
} from "lucide-react";
import Link from "next/link";

export default function PublicStudentProfilePage() {
  const params = useParams();
  const studentId = params.studentId as string;

  const [student, setStudent] = useState<Student | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadStudentProfile() {
      if (!studentId) return;
      setLoading(true);

      try {
        const studentRef = doc(db, "students", studentId);
        const studentSnap = await getDoc(studentRef);

        const userRef = doc(db, "users", studentId);
        const userSnap = await getDoc(userRef);

        if (studentSnap.exists()) {
          setStudent(studentSnap.data() as Student);
        }
        if (userSnap.exists()) {
          setUserProfile(userSnap.data() as User);
        }
      } catch (err) {
        console.error("Failed loading student digital portfolio:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStudentProfile();
  }, [studentId]);

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
      <div className="min-h-screen bg-[#0E1528] py-8 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-xl border-3 border-[#101830] bg-[#FDFCF9] shadow-2xl">
          {/* Header Skeleton */}
          <div className="bg-[#101830] px-6 py-8 sm:px-10 border-b-2 border-[#D4A017] space-y-4">
            <div className="h-4 w-44 rounded-full bg-white/10 animate-pulse" />
            <div className="h-8 w-64 rounded bg-white/20 animate-pulse" />
            <div className="h-4 w-52 rounded bg-white/10 animate-pulse" />
          </div>
          {/* Body Skeleton */}
          <div className="p-6 sm:p-10 space-y-8 bg-[#FDFCF9]">
            <div className="h-10 w-full rounded bg-black/5 animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-black/5 animate-pulse" />
              ))}
            </div>
            <div className="space-y-3">
              <div className="h-5 w-40 rounded bg-black/10 animate-pulse" />
              <div className="h-24 rounded-lg bg-black/5 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!student && !userProfile) {
    return (
      <div className="min-h-screen bg-brand-navy flex flex-col items-center justify-center p-4 text-center text-brand-paper">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-brand-gold">
          <GraduationCap className="h-8 w-8" />
        </div>
        <h2 className="mt-4 font-serif text-2xl font-bold">Academic Record Not Found</h2>
        <p className="mt-2 text-sm text-brand-paper/60 max-w-md">
          The requested student credential profile could not be located on the SkillSwipe registry.
        </p>
        <Link href="/" className="mt-6">
          <Button className="bg-brand-gold hover:bg-[#B8870F] text-brand-navy font-semibold">
            Return to SkillSwipe Home
          </Button>
        </Link>
      </div>
    );
  }

  const candidateName = userProfile?.name || "Student Candidate";
  const { basicInfo, skills = [], projects = [], certificates = [], links, interestedIndustries = [] } = student || {
    basicInfo: { college: "", degree: "", year: "", location: "" },
  };

  return (
    <div className="min-h-screen bg-[#0E1528] py-8 px-4 sm:px-6 lg:px-8 text-brand-navy print:bg-white print:p-0">
      {/* Top Bar / Navigation */}
      <div className="mx-auto max-w-4xl mb-6 flex items-center justify-between print:hidden">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-paper/70 hover:text-brand-gold transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>SkillSwipe Registry</span>
        </Link>

        {/* Share & Print Actions */}
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
                <span>Share Portfolio</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Official Folio / Credential Document */}
      <div className="mx-auto max-w-4xl overflow-hidden rounded-xl border-3 border-[#101830] bg-[#FDFCF9] shadow-2xl print:border-none print:shadow-none">
        
        {/* Certificate Watermark Header Bar */}
        <div className="relative bg-[#101830] px-6 py-8 sm:px-10 text-brand-paper border-b-2 border-[#D4A017]">
          {/* Subtle gold corner ornaments */}
          <div className="absolute top-2 left-2 text-[#D4A017]/40 text-xs font-serif select-none">❖</div>
          <div className="absolute top-2 right-2 text-[#D4A017]/40 text-xs font-serif select-none">❖</div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-gold/40 bg-brand-gold/15 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-brand-gold">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Official Verified Academic Folio &bull; SIH206644</span>
              </div>
              <h1 className="mt-3 font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[#F7F5EF]">
                {candidateName}
              </h1>
              <p className="mt-1 text-sm text-slate-300 flex flex-wrap items-center gap-x-2 gap-y-1">
                {basicInfo?.degree && <span className="font-semibold text-white">{basicInfo.degree}</span>}
                {basicInfo?.college && <span>&bull; {basicInfo.college}</span>}
                {basicInfo?.year && <span className="text-brand-gold font-mono">&bull; Class of {basicInfo.year}</span>}
              </p>
            </div>

            {/* Large Wax Seal Medallion */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center justify-center rounded-full bg-gradient-to-br from-[#D4A017] via-[#C28E0D] to-[#9C7004] p-3 shadow-lg border-2 border-[#FFE8A3] ring-4 ring-[#101830]">
                <svg width="40" height="40" viewBox="0 0 36 36" fill="none">
                  <circle cx="18" cy="18" r="15" stroke="#7A5800" strokeWidth="1.5" strokeDasharray="3 3" />
                  <path
                    d="M18 9L20.5 14.5L26.5 15L22 19L23.5 25L18 22L12.5 25L14 19L9.5 15L15.5 14.5L18 9Z"
                    fill="#FFF3D4"
                  />
                </svg>
                <span className="text-[8px] font-black uppercase tracking-tighter text-[#4A3300] mt-0.5">
                  VERIFIED
                </span>
              </div>
            </div>
          </div>

          {/* Location & Contact Bar */}
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/15 pt-4 text-xs text-slate-300">
            {basicInfo?.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-brand-gold" />
                <span>{basicInfo.location}</span>
              </span>
            )}
            {userProfile?.email && (
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-brand-teal" />
                <span>{userProfile.email}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-brand-gold font-mono">
              <Check className="h-3.5 w-3.5" />
              <span>Identity Attested</span>
            </span>
          </div>
        </div>

        {/* Folio Body */}
        <div className="p-6 sm:p-10 space-y-10 bg-[#FDFCF9]">
          
          {/* External Profile Links & Resume Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#101830]/15 pb-6">
            <div className="flex flex-wrap items-center gap-2">
              {links?.linkedin && (
                <a
                  href={links.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded border border-[#101830]/20 bg-white px-3 py-1.5 text-xs font-semibold text-brand-navy hover:border-[#D4A017] hover:bg-[#F7F5EF] transition-all shadow-2xs"
                >
                  <Globe className="h-3.5 w-3.5 text-blue-600" />
                  <span>LinkedIn</span>
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              )}

              {links?.github && (
                <a
                  href={links.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded border border-[#101830]/20 bg-white px-3 py-1.5 text-xs font-semibold text-brand-navy hover:border-[#D4A017] hover:bg-[#F7F5EF] transition-all shadow-2xs"
                >
                  <FolderGit2 className="h-3.5 w-3.5 text-brand-navy" />
                  <span>GitHub</span>
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              )}

              {links?.portfolio && (
                <a
                  href={links.portfolio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded border border-[#101830]/20 bg-white px-3 py-1.5 text-xs font-semibold text-brand-navy hover:border-[#D4A017] hover:bg-[#F7F5EF] transition-all shadow-2xs"
                >
                  <Globe className="h-3.5 w-3.5 text-brand-teal" />
                  <span>Personal Site</span>
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              )}
            </div>

            {student?.resumeUrl && (
              <a
                href={student.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded bg-brand-navy px-3.5 py-1.5 text-xs font-semibold text-brand-paper hover:bg-[#182344] transition-all shadow-xs"
              >
                <FileText className="h-3.5 w-3.5 text-brand-gold" />
                <span>View Full Resume</span>
              </a>
            )}
          </div>

          {/* Section 1: Verified Skills Matrix */}
          <div>
            <div className="flex items-center gap-2 border-b-2 border-[#101830] pb-2">
              <Award className="h-5 w-5 text-brand-gold" />
              <h2 className="font-serif text-xl font-bold tracking-tight text-brand-navy">
                Verified Skill Competencies
              </h2>
            </div>

            {skills.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {skills.map((sk, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border border-[#101830]/20 bg-[#F7F5EF] p-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-2">
                      <WaxSealBadge size="sm" />
                      <div>
                        <p className="font-mono text-xs font-bold text-brand-navy">
                          {sk.name}
                        </p>
                        <p className="text-[10px] font-semibold uppercase text-brand-slate tracking-wide">
                          {sk.level}
                        </p>
                      </div>
                    </div>
                    <span className="rounded bg-[#1F6F5C]/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#1F6F5C]">
                      Attested
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-xs text-brand-slate italic">
                No skill competencies recorded yet.
              </p>
            )}
          </div>

          {/* Section 2: Projects Showcase */}
          <div>
            <div className="flex items-center gap-2 border-b-2 border-[#101830] pb-2">
              <FolderGit2 className="h-5 w-5 text-brand-teal" />
              <h2 className="font-serif text-xl font-bold tracking-tight text-brand-navy">
                Project Dossier
              </h2>
            </div>

            {projects.length > 0 ? (
              <div className="mt-4 space-y-4">
                {projects.map((proj, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-[#101830]/20 bg-[#F7F5EF] p-5 shadow-2xs hover:border-brand-gold transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <h3 className="font-serif text-base font-bold text-brand-navy">
                        {proj.title}
                      </h3>
                      {proj.link && (
                        <a
                          href={proj.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-teal hover:underline"
                        >
                          <span>Repository / Deployment</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>

                    <p className="mt-2 text-xs text-brand-slate leading-relaxed">
                      {proj.description}
                    </p>

                    {proj.techStack && proj.techStack.length > 0 && (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {proj.techStack.map((tech, tIdx) => (
                          <span
                            key={tIdx}
                            className="rounded border border-[#101830]/20 bg-white px-2 py-0.5 text-[10px] font-mono text-brand-navy"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-xs text-brand-slate italic">
                No engineering projects published in portfolio.
              </p>
            )}
          </div>

          {/* Section 3: Official Certifications & Credentials */}
          <div>
            <div className="flex items-center gap-2 border-b-2 border-[#101830] pb-2">
              <Award className="h-5 w-5 text-[#8E6503]" />
              <h2 className="font-serif text-xl font-bold tracking-tight text-brand-navy">
                Certificates & Credentials
              </h2>
            </div>

            {certificates.length > 0 ? (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {certificates.map((cert, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col justify-between rounded-lg border border-[#101830]/20 bg-[#F7F5EF] p-4 shadow-2xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-serif text-sm font-bold text-brand-navy">
                          {cert.name}
                        </h4>
                        <span className="rounded bg-brand-gold/20 px-2 py-0.5 text-[9px] font-bold uppercase text-[#8E6503]">
                          Verified
                        </span>
                      </div>
                      <p className="text-xs text-brand-slate mt-1">
                        Issued by <span className="font-medium text-brand-navy">{cert.issuer}</span> &bull; {cert.date}
                      </p>
                    </div>

                    {cert.fileUrl && (
                      <div className="mt-3 pt-2 border-t border-black/10">
                        <a
                          href={cert.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-teal hover:underline"
                        >
                          <span>View Official Document</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-xs text-brand-slate italic">
                No external certifications listed.
              </p>
            )}
          </div>

          {/* Section 4: Stated Industry Domains */}
          {interestedIndustries && interestedIndustries.length > 0 && (
            <div>
              <div className="flex items-center gap-2 border-b-2 border-[#101830] pb-2">
                <Building2 className="h-5 w-5 text-brand-navy" />
                <h2 className="font-serif text-xl font-bold tracking-tight text-brand-navy">
                  Industry Focus Domains
                </h2>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {interestedIndustries.map((ind, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-full border border-brand-navy/20 bg-white px-3 py-1 text-xs font-semibold text-brand-navy shadow-2xs"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-gold" />
                    <span>{ind}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Folio Bottom Attestation Footer */}
        <div className="bg-[#ECE8DE] px-6 py-6 sm:px-10 border-t-2 border-[#101830] text-center">
          <p className="font-serif text-xs font-bold text-brand-navy uppercase tracking-wider">
            Official SkillSwipe Digital Portfolio Record &bull; SIH206644
          </p>
          <p className="mt-1 text-[11px] text-brand-slate">
            This folio serves as an authenticated skill dossier under the Academia–Industry Collaboration Protocol.
          </p>
        </div>

      </div>
    </div>
  );
}
