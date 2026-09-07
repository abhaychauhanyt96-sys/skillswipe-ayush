"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { StepIndicator } from "@/components/onboarding/StepIndicator";
import { RoleSkillChipInput } from "@/components/onboarding/RoleSkillChipInput";
import { LogoUploader } from "@/components/onboarding/LogoUploader";
import { Button } from "@/components/ui/button";
import {
  Company,
  CompanyOpenRole,
  CompanyLearningProgram,
  RoleType,
} from "@/types";
import { db } from "@/lib/firebase/config";
import { doc, setDoc } from "firebase/firestore";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  CheckCircle2,
  Building2,
  Briefcase,
  GraduationCap,
  FileCheck,
  AlertCircle,
  Loader2,
  Globe,
  Sparkles,
  ExternalLink,
} from "lucide-react";

const STEP_LABELS = [
  "Company Info",
  "Open Roles",
  "Learning Programs",
  "Review & Submit",
];

const POPULAR_INDUSTRIES = [
  "Information Technology & SaaS",
  "Financial Technology (FinTech)",
  "Artificial Intelligence & ML",
  "Healthcare & Life Sciences",
  "E-Commerce & Retail",
  "Education Technology (EdTech)",
  "Robotics & Manufacturing",
  "Consulting & Professional Services",
];

export default function CompanyOnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 1: Basic Information
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("Information Technology & SaaS");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  // Step 2: Open Roles
  const [openRoles, setOpenRoles] = useState<CompanyOpenRole[]>([
    {
      title: "Frontend Engineering Intern",
      type: "internship",
      requiredSkills: ["React", "TypeScript", "Tailwind CSS"],
      stipend: "₹25,000 / month",
      description: "Build clean, responsive mutual-matching interfaces and contribute to production web apps.",
    },
  ]);

  const [newRoleTitle, setNewRoleTitle] = useState("");
  const [newRoleType, setNewRoleType] = useState<RoleType>("internship");
  const [newRoleSkills, setNewRoleSkills] = useState<string[]>([]);
  const [newRoleStipend, setNewRoleStipend] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [showAddRole, setShowAddRole] = useState(false);

  // Step 3: Learning Programs (Optional)
  const [learningPrograms, setLearningPrograms] = useState<CompanyLearningProgram[]>([]);
  const [progTitle, setProgTitle] = useState("");
  const [progDesc, setProgDesc] = useState("");
  const [progCertOffered, setProgCertOffered] = useState(true);
  const [showAddProg, setShowAddProg] = useState(false);

  // Role Handlers
  const handleAddRole = () => {
    if (!newRoleTitle.trim() || !newRoleDesc.trim() || newRoleSkills.length === 0) {
      setErrorMessage("Please provide role title, description, and at least 1 required skill.");
      return;
    }

    const role: CompanyOpenRole = {
      title: newRoleTitle.trim(),
      type: newRoleType,
      requiredSkills: newRoleSkills,
      stipend: newRoleStipend.trim() || undefined,
      description: newRoleDesc.trim(),
    };

    setOpenRoles([...openRoles, role]);
    setNewRoleTitle("");
    setNewRoleSkills([]);
    setNewRoleStipend("");
    setNewRoleDesc("");
    setShowAddRole(false);
    setErrorMessage(null);
  };

  const handleRemoveRole = (index: number) => {
    setOpenRoles(openRoles.filter((_, idx) => idx !== index));
  };

  // Learning Program Handlers
  const handleAddProgram = () => {
    if (!progTitle.trim() || !progDesc.trim()) return;

    const prog: CompanyLearningProgram = {
      title: progTitle.trim(),
      description: progDesc.trim(),
      certificationOffered: progCertOffered,
    };

    setLearningPrograms([...learningPrograms, prog]);
    setProgTitle("");
    setProgDesc("");
    setProgCertOffered(true);
    setShowAddProg(false);
  };

  const handleRemoveProgram = (index: number) => {
    setLearningPrograms(learningPrograms.filter((_, idx) => idx !== index));
  };

  // Validation
  const validateStep = (step: number) => {
    setErrorMessage(null);
    if (step === 1) {
      if (!name.trim()) {
        setErrorMessage("Company name is required.");
        return false;
      }
      if (!industry.trim()) {
        setErrorMessage("Please select or specify your industry.");
        return false;
      }
    }
    if (step === 2) {
      if (openRoles.length === 0) {
        setErrorMessage("Please post at least one open role or internship.");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setErrorMessage(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Step 4: Final Submission to Firestore
  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const companyPayload: Company = {
        uid: user.uid,
        basicInfo: {
          name: name.trim(),
          industry: industry.trim(),
          website: website.trim() || undefined,
          logoUrl: logoUrl.trim() || undefined,
        },
        openRoles,
        learningPrograms,
        swipedRight: [],
        swipedLeft: [],
        matches: [],
      };

      // Write into Firestore companies/{uid}
      const companyDocRef = doc(db, "companies", user.uid);
      await setDoc(companyDocRef, companyPayload, { merge: true });

      // Redirect to company dashboard
      router.push("/dashboard/company");
    } catch (err: any) {
      console.error("Failed to save company profile:", err);
      setErrorMessage(
        err.message || "Failed to commit company profile. Please check permissions."
      );
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["company"]}>
      <div className="mx-auto min-h-[calc(100vh-4rem)] max-w-4xl px-4 py-10 sm:px-6">
        {/* Step Indicator */}
        <StepIndicator
          currentStep={currentStep}
          totalSteps={4}
          stepLabels={STEP_LABELS}
        />

        {errorMessage && (
          <div
            id="company-error-banner"
            className="mb-6 flex items-center gap-2 rounded-md bg-brand-brick/10 border border-brand-brick/30 p-3 text-xs text-brand-brick"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: Basic Company Info */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="border-b border-brand-navy/10 pb-4">
              <div className="flex items-center gap-2 text-brand-navy">
                <Building2 className="h-5 w-5 text-brand-teal" />
                <h2 className="font-serif text-2xl font-bold">Organization Profile</h2>
              </div>
              <p className="mt-1 text-xs text-brand-slate">
                Provide your company or startup identity to appear authoritatively on candidate discovery cards.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  htmlFor="company-name-input"
                  className="block text-xs font-semibold uppercase tracking-wider text-brand-slate"
                >
                  Company / Organization Name *
                </label>
                <input
                  id="company-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Innovations, Tata Consultancy Services, Zomato..."
                  className="mt-1.5 block w-full rounded-md border border-brand-navy/20 bg-white px-3.5 py-2.5 text-sm text-brand-navy placeholder:text-brand-slate/50 focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
                />
              </div>

              <div>
                <label
                  htmlFor="industry-select"
                  className="block text-xs font-semibold uppercase tracking-wider text-brand-slate"
                >
                  Industry Sector *
                </label>
                <select
                  id="industry-select"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="mt-1.5 block w-full rounded-md border border-brand-navy/20 bg-white px-3.5 py-2.5 text-sm text-brand-navy focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
                >
                  {POPULAR_INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                  <option value="Other">Other / Emerging Sector</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="website-input"
                  className="block text-xs font-semibold uppercase tracking-wider text-brand-slate"
                >
                  Official Website
                </label>
                <input
                  id="website-input"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://company.example.com"
                  className="mt-1.5 block w-full rounded-md border border-brand-navy/20 bg-white px-3.5 py-2.5 text-sm text-brand-navy placeholder:text-brand-slate/50 focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
                />
              </div>
            </div>

            {/* Logo Uploader */}
            {user && (
              <LogoUploader
                userId={user.uid}
                logoUrl={logoUrl}
                onChange={setLogoUrl}
              />
            )}
          </div>
        )}

        {/* STEP 2: Open Roles */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="border-b border-brand-navy/10 pb-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-brand-navy">
                  <Briefcase className="h-5 w-5 text-brand-teal" />
                  <h2 className="font-serif text-2xl font-bold">Open Positions & Roles</h2>
                </div>
                <p className="mt-1 text-xs text-brand-slate">
                  Post the roles candidates will swipe on. Required skills directly calibrate mutual compatibility scores.
                </p>
              </div>

              {!showAddRole && (
                <Button
                  id="open-add-role-btn"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddRole(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  <span>Post Another Role</span>
                </Button>
              )}
            </div>

            {/* Existing Posted Roles */}
            <div className="space-y-4">
              {openRoles.map((role, idx) => (
                <div
                  key={idx}
                  className="relative rounded-xl border border-brand-navy/15 bg-white p-5 shadow-xs transition-all hover:border-brand-navy/30"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif text-base font-bold text-brand-navy">
                          {role.title}
                        </h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            role.type === "internship"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {role.type}
                        </span>
                        {role.stipend && (
                          <span className="text-xs font-semibold text-brand-teal">
                            • {role.stipend}
                          </span>
                        )}
                      </div>

                      <p className="mt-1.5 text-xs text-brand-slate leading-relaxed">
                        {role.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveRole(idx)}
                      className="text-brand-slate hover:text-brand-brick p-1 rounded transition-colors"
                      title="Delete role"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 border-t border-brand-navy/10 pt-3">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-brand-slate/70">
                      Required Skills Vector:
                    </span>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {role.requiredSkills.map((sk) => (
                        <span
                          key={sk}
                          className="rounded bg-brand-paper px-2 py-0.5 text-[11px] font-medium text-brand-navy border border-brand-navy/15"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Role Modal / Form */}
            {showAddRole && (
              <div className="rounded-xl border-2 border-brand-teal/40 bg-white p-6 shadow-md space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-base font-bold text-brand-navy">
                    Define New Role
                  </h3>
                  <span className="text-xs text-brand-slate">* All fields required</span>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-brand-slate">
                      Role Title *
                    </label>
                    <input
                      type="text"
                      value={newRoleTitle}
                      onChange={(e) => setNewRoleTitle(e.target.value)}
                      placeholder="e.g. Machine Learning Research Intern, Full Stack Dev"
                      className="mt-1.5 block w-full rounded-md border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2 text-sm text-brand-navy focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-brand-slate">
                      Type *
                    </label>
                    <select
                      value={newRoleType}
                      onChange={(e) => setNewRoleType(e.target.value as RoleType)}
                      className="mt-1.5 block w-full rounded-md border border-brand-navy/20 bg-brand-paper/30 px-3 py-2 text-sm text-brand-navy focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy"
                    >
                      <option value="internship">Internship</option>
                      <option value="job">Full-time Job</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-brand-slate">
                    Stipend / Compensation (Optional)
                  </label>
                  <input
                    type="text"
                    value={newRoleStipend}
                    onChange={(e) => setNewRoleStipend(e.target.value)}
                    placeholder="e.g. ₹20,000 - ₹35,000 / month, Competitive"
                    className="mt-1.5 block w-full rounded-md border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2 text-sm text-brand-navy focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-brand-slate">
                    Role Description *
                  </label>
                  <textarea
                    rows={2}
                    value={newRoleDesc}
                    onChange={(e) => setNewRoleDesc(e.target.value)}
                    placeholder="Describe core responsibilities and deliverables..."
                    className="mt-1.5 block w-full rounded-md border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2 text-sm text-brand-navy focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy"
                  />
                </div>

                {/* Skill Chip Input for Role */}
                <RoleSkillChipInput
                  skills={newRoleSkills}
                  onChange={setNewRoleSkills}
                  label="Required Skills for Compatibility Vector *"
                  placeholder="Type skills that students must possess..."
                />

                <div className="flex justify-end gap-2 pt-2 border-t border-brand-navy/10">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddRole(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    id="save-role-btn"
                    type="button"
                    size="sm"
                    onClick={handleAddRole}
                    disabled={
                      !newRoleTitle.trim() ||
                      !newRoleDesc.trim() ||
                      newRoleSkills.length === 0
                    }
                  >
                    Save Role
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Learning Programs (Optional) */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="border-b border-brand-navy/10 pb-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-brand-navy">
                  <GraduationCap className="h-5 w-5 text-brand-gold" />
                  <h2 className="font-serif text-2xl font-bold">
                    Learning Programs & Certifications
                  </h2>
                </div>
                <p className="mt-1 text-xs text-brand-slate">
                  Optional: Offer structured training, apprenticeships, or sponsored upskilling to candidates.
                </p>
              </div>

              {!showAddProg && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddProg(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  <span>Add Program</span>
                </Button>
              )}
            </div>

            {learningPrograms.length === 0 && !showAddProg && (
              <div className="rounded-xl border border-dashed border-brand-navy/20 bg-white/40 p-8 text-center space-y-3">
                <p className="text-xs text-brand-slate">
                  No learning programs added. This step is optional. You can add programs now or proceed directly to review.
                </p>
                <div className="flex justify-center gap-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddProg(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    <span>Add a Learning Program</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setCurrentStep(4)}
                  >
                    <span>Skip to Review</span>
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Existing Programs */}
            <div className="space-y-3">
              {learningPrograms.map((prog, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between rounded-xl border border-brand-navy/15 bg-white p-4 shadow-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-serif text-sm font-bold text-brand-navy">
                        {prog.title}
                      </h4>
                      {prog.certificationOffered && (
                        <span className="rounded bg-brand-gold/15 border border-brand-gold/30 px-2 py-0.5 text-[10px] font-bold text-[#8f6a00] uppercase">
                          Certificate Included
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-brand-slate">
                      {prog.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveProgram(idx)}
                    className="text-brand-slate hover:text-brand-brick p-1 rounded transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Program Sub-Form */}
            {showAddProg && (
              <div className="rounded-xl border-2 border-brand-gold/40 bg-white p-5 shadow-sm space-y-4">
                <h3 className="font-serif text-sm font-bold text-brand-navy">
                  Add Learning or Training Initiative
                </h3>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-brand-slate">
                    Program Title *
                  </label>
                  <input
                    type="text"
                    value={progTitle}
                    onChange={(e) => setProgTitle(e.target.value)}
                    placeholder="e.g. Full Stack Cloud Bootcamp, AI Co-op Track"
                    className="mt-1.5 block w-full rounded-md border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2 text-sm text-brand-navy focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-brand-slate">
                    Description & Curriculum *
                  </label>
                  <textarea
                    rows={2}
                    value={progDesc}
                    onChange={(e) => setProgDesc(e.target.value)}
                    placeholder="Outline duration, key learning outcomes, mentorship..."
                    className="mt-1.5 block w-full rounded-md border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2 text-sm text-brand-navy focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={progCertOffered}
                    onChange={(e) => setProgCertOffered(e.target.checked)}
                    className="h-4 w-4 rounded border-brand-navy/30 text-brand-navy focus:ring-brand-navy"
                  />
                  <span className="text-xs font-medium text-brand-navy">
                    Formal completion certificate is offered to participants
                  </span>
                </label>

                <div className="flex justify-end gap-2 pt-2 border-t border-brand-navy/10">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddProg(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddProgram}
                    disabled={!progTitle.trim() || !progDesc.trim()}
                  >
                    Save Program
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Review & Submit */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="border-b border-brand-navy/10 pb-4">
              <div className="flex items-center gap-2 text-brand-navy">
                <FileCheck className="h-5 w-5 text-brand-teal" />
                <h2 className="font-serif text-2xl font-bold">Review Company Dossier</h2>
              </div>
              <p className="mt-1 text-xs text-brand-slate">
                Please verify your organization details and open positions before entering the matching portal.
              </p>
            </div>

            {/* Review Dossier Card */}
            <div className="rounded-xl border-2 border-brand-navy/20 bg-white p-6 shadow-md relative overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-brand-navy/10 pb-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-brand-navy/20 bg-brand-paper/50 overflow-hidden">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Logo"
                        className="h-full w-full object-contain p-1"
                      />
                    ) : (
                      <Building2 className="h-7 w-7 text-brand-teal" />
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-brand-teal">
                      Registered Industry Partner
                    </span>
                    <h3 className="font-serif text-2xl font-bold text-brand-navy">
                      {name || "Company Name"}
                    </h3>
                    <p className="text-xs text-brand-slate">
                      {industry} {website ? `• ${website}` : ""}
                    </p>
                  </div>
                </div>

                <span className="rounded-full border border-brand-teal/30 bg-brand-teal/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-teal">
                  Ready to Post
                </span>
              </div>

              {/* Roles Section */}
              <div className="py-4 border-b border-brand-navy/10">
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-slate">
                  Active Open Roles ({openRoles.length})
                </span>
                <div className="mt-3 space-y-3">
                  {openRoles.map((r, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-brand-navy/10 bg-brand-paper/40 p-3.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h4 className="font-serif text-sm font-bold text-brand-navy">
                            {r.title}
                          </h4>
                          <span className="rounded bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-brand-navy border border-brand-navy/15">
                            {r.type}
                          </span>
                        </div>
                        {r.stipend && (
                          <span className="text-xs font-semibold text-brand-teal">
                            {r.stipend}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-brand-slate">
                        {r.description}
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {r.requiredSkills.map((sk) => (
                          <span
                            key={sk}
                            className="rounded bg-white px-1.5 py-0.5 text-[10px] text-brand-slate border border-brand-navy/10 font-mono"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Learning Programs Section */}
              <div className="pt-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-slate">
                  Learning & Training Programs ({learningPrograms.length})
                </span>
                {learningPrograms.length === 0 ? (
                  <p className="mt-2 text-xs italic text-brand-slate/70">
                    No learning programs attached (Direct hiring mode)
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {learningPrograms.map((lp, i) => (
                      <div
                        key={i}
                        className="rounded-md border border-brand-navy/10 bg-brand-paper/20 p-2.5 text-xs text-brand-navy flex justify-between items-center"
                      >
                        <span className="font-semibold">{lp.title}</span>
                        {lp.certificationOffered && (
                          <span className="text-[10px] font-bold text-brand-gold uppercase">
                            ✓ Certificate
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Footer */}
        <div className="mt-8 flex items-center justify-between border-t border-brand-navy/15 pt-5">
          {currentStep > 1 ? (
            <Button
              id="company-back-btn"
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={submitting}
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              <span>Back</span>
            </Button>
          ) : (
            <div />
          )}

          {currentStep < 4 ? (
            <Button
              id="company-next-btn"
              type="button"
              onClick={handleNext}
              className="px-6"
            >
              <span>Next</span>
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          ) : (
            <Button
              id="company-submit-btn"
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-brand-navy text-brand-gold hover:bg-[#182344] px-8 shadow-md"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span>Registering Organization...</span>
                </>
              ) : (
                <>
                  <span>Publish Profile & Roles</span>
                  <CheckCircle2 className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
