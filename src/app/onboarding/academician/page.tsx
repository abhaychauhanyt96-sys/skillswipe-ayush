"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { StepIndicator } from "@/components/onboarding/StepIndicator";
import { Button } from "@/components/ui/button";
import {
  Academician,
  AcademicianInterest,
  AcademicianLinks,
} from "@/types";
import { db } from "@/lib/firebase/config";
import { doc, setDoc } from "firebase/firestore";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  X,
  CheckCircle2,
  Award,
  Building2,
  BookOpen,
  Mail,
  ExternalLink,
  GraduationCap,
  Sparkles,
  Loader2,
  FileCheck,
  Check,
} from "lucide-react";

const STEP_LABELS = [
  "Institution Info",
  "Interests & Expertise",
  "Contact & Profiles",
  "Review & Submit",
];

const COLLABORATION_TYPES: {
  id: AcademicianInterest;
  title: string;
  description: string;
}[] = [
  {
    id: "FDP",
    title: "Faculty Development Programs (FDP)",
    description: "Upskilling seminars, industry certifications, and pedagogy workshops sponsored by enterprise partners.",
  },
  {
    id: "industrial-training",
    title: "Industrial Training",
    description: "Hands-on immersion in industry facilities, lab visits, and executive exposure to modern technology stacks.",
  },
  {
    id: "consultancy",
    title: "Consultancy",
    description: "Technical advisory, problem-solving, architectural reviews, and paid consulting on real industry challenges.",
  },
  {
    id: "research",
    title: "Collaborative Research",
    description: "Joint R&D grants, co-authored academic publications, patented inventions, and applied innovation.",
  },
  {
    id: "guest-lecture",
    title: "Guest Lectures / Workshops",
    description: "Delivering expert lectures, hackathon mentoring, keynote talks, or hosting visiting corporate practitioners.",
  },
];

const DESIGNATION_PRESETS = [
  "Assistant Professor",
  "Associate Professor",
  "Professor",
  "Head of Department (HOD)",
  "Dean of Academic Affairs",
  "Dean of Research & Development",
  "Director / Principal",
  "Research Scientist",
];

const EXPERTISE_SUGGESTIONS = [
  "Machine Learning",
  "Embedded Systems",
  "VLSI Design",
  "Cybersecurity",
  "Cloud Computing",
  "Data Science",
  "Robotics & Control",
  "Natural Language Processing",
  "Power Systems",
  "Bioinformatics",
];

export default function AcademicianOnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 1: Basic Information
  const [institution, setInstitution] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("Assistant Professor");
  const [customDesignation, setCustomDesignation] = useState("");

  // Step 2: Areas of Interest & Expertise
  const [selectedInterests, setSelectedInterests] = useState<AcademicianInterest[]>([
    "FDP",
    "research",
  ]);
  const [expertiseAreas, setExpertiseAreas] = useState<string[]>([
    "Machine Learning",
    "Embedded Systems",
  ]);
  const [newExpertiseInput, setNewExpertiseInput] = useState("");

  // Step 3: Contact & Links
  const [email, setEmail] = useState(user?.email || "");
  const [linkedin, setLinkedin] = useState("");
  const [scholarProfile, setScholarProfile] = useState("");
  const [institutionProfile, setInstitutionProfile] = useState("");

  // Interest toggle
  const toggleInterest = (id: AcademicianInterest) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Add expertise chip
  const handleAddExpertise = (skillToAdd?: string) => {
    const term = (skillToAdd || newExpertiseInput).trim();
    if (!term) return;
    if (!expertiseAreas.some((e) => e.toLowerCase() === term.toLowerCase())) {
      setExpertiseAreas((prev) => [...prev, term]);
    }
    setNewExpertiseInput("");
  };

  // Remove expertise chip
  const handleRemoveExpertise = (index: number) => {
    setExpertiseAreas((prev) => prev.filter((_, i) => i !== index));
  };

  // Validation
  const validateStep = (step: number): boolean => {
    setErrorMessage(null);

    if (step === 1) {
      if (!institution.trim()) {
        setErrorMessage("Please enter your academic institution name.");
        return false;
      }
      if (!department.trim()) {
        setErrorMessage("Please enter your academic department.");
        return false;
      }
      const finalDesignation = designation === "Other" ? customDesignation : designation;
      if (!finalDesignation.trim()) {
        setErrorMessage("Please specify your academic designation.");
        return false;
      }
      return true;
    }

    if (step === 2) {
      if (selectedInterests.length === 0) {
        setErrorMessage("Please select at least one area of collaboration interest.");
        return false;
      }
      if (expertiseAreas.length === 0) {
        setErrorMessage("Please add at least one subject/expertise domain.");
        return false;
      }
      return true;
    }

    if (step === 3) {
      if (!email.trim() || !email.includes("@")) {
        setErrorMessage("Please provide a valid institutional contact email.");
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    setErrorMessage(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Final Submit
  const handleSubmit = async () => {
    if (!user) {
      setErrorMessage("Authentication error. Please log in again.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const finalDesignation = designation === "Other" ? customDesignation : designation;

    const academicianPayload: Academician = {
      uid: user.uid,
      basicInfo: {
        institution: institution.trim(),
        department: department.trim(),
        designation: finalDesignation.trim(),
      },
      interests: selectedInterests,
      expertiseAreas: expertiseAreas.map((e) => e.trim()),
      links: {
        email: email.trim() || user.email || "",
        linkedin: linkedin.trim() || undefined,
        scholarProfile: scholarProfile.trim() || undefined,
        institutionProfile: institutionProfile.trim() || undefined,
      },
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, "academicians", user.uid), academicianPayload);
      router.push("/dashboard/academician");
    } catch (err: any) {
      console.error("Failed saving academician profile:", err);
      setErrorMessage(
        err.message || "Failed to submit academician record. Please try again."
      );
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["academician"]}>
      <div className="mx-auto min-h-[calc(100vh-4rem)] max-w-3xl px-4 py-8 sm:px-6">
        
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-gold/30 bg-brand-gold/10 px-3.5 py-1 text-xs font-semibold text-[#8f6a00]">
            <Award className="h-3.5 w-3.5" />
            <span>Faculty & Academician Onboarding • SIH206644</span>
          </div>
          <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
            Register Your Academic Dossier
          </h1>
          <p className="mt-2 text-sm text-brand-slate max-w-xl mx-auto">
            Establish your faculty profile to collaborate with industry partners on FDPs, joint research consultancies, and curriculum development.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mt-8">
          <StepIndicator currentStep={currentStep} totalSteps={STEP_LABELS.length} stepLabels={STEP_LABELS} />
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-6 rounded-lg border border-brand-brick/30 bg-brand-brick/10 p-3.5 text-xs text-brand-brick flex items-center gap-2">
            <span className="font-bold">Error:</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Multi-Step Card Form */}
        <div className="mt-8 rounded-2xl border-2 border-brand-navy/15 bg-white p-6 sm:p-8 shadow-sm">
          
          {/* STEP 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="border-b border-brand-navy/10 pb-4">
                <h2 className="font-serif text-xl font-bold text-brand-navy flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-brand-gold" />
                  <span>Step 1: Academic Institution & Designation</span>
                </h2>
                <p className="mt-1 text-xs text-brand-slate">
                  Tell us which university or research institution you represent.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-slate">
                  Institution / University Name <span className="text-brand-brick">*</span>
                </label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. Indian Institute of Technology Delhi, BITS Pilani"
                  className="mt-1.5 w-full rounded-lg border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2 text-sm text-brand-navy focus:border-brand-navy focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-slate">
                  Academic Department <span className="text-brand-brick">*</span>
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Computer Science & Engineering, Electronics, Biotechnology"
                  className="mt-1.5 w-full rounded-lg border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2 text-sm text-brand-navy focus:border-brand-navy focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-slate">
                  Faculty Designation <span className="text-brand-brick">*</span>
                </label>
                <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DESIGNATION_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDesignation(preset)}
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold text-center transition-all cursor-pointer ${
                        designation === preset
                          ? "border-brand-gold bg-brand-gold/15 text-brand-navy font-bold ring-1 ring-brand-gold"
                          : "border-brand-navy/15 bg-brand-paper/20 text-brand-slate hover:border-brand-navy/30 hover:bg-brand-paper/60"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setDesignation("Other")}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold text-center transition-all cursor-pointer ${
                      designation === "Other"
                        ? "border-brand-gold bg-brand-gold/15 text-brand-navy font-bold ring-1 ring-brand-gold"
                        : "border-brand-navy/15 bg-brand-paper/20 text-brand-slate hover:border-brand-navy/30"
                    }`}
                  >
                    Custom / Other
                  </button>
                </div>

                {designation === "Other" && (
                  <input
                    type="text"
                    value={customDesignation}
                    onChange={(e) => setCustomDesignation(e.target.value)}
                    placeholder="Enter your custom designation"
                    className="mt-3 w-full rounded-lg border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2 text-sm text-brand-navy focus:border-brand-navy focus:outline-none"
                  />
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Areas of Interest & Expertise */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="border-b border-brand-navy/10 pb-4">
                <h2 className="font-serif text-xl font-bold text-brand-navy flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-brand-teal" />
                  <span>Step 2: Collaboration Interests & Subject Expertise</span>
                </h2>
                <p className="mt-1 text-xs text-brand-slate">
                  Select the types of academia–industry initiatives you wish to engage in, and list your specialized research/subject topics.
                </p>
              </div>

              {/* Collaboration Type Multi-Select Cards */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-slate mb-2">
                  Collaboration Types (Select all that apply) <span className="text-brand-brick">*</span>
                </label>
                <div className="space-y-2.5">
                  {COLLABORATION_TYPES.map((type) => {
                    const isSelected = selectedInterests.includes(type.id);
                    return (
                      <div
                        key={type.id}
                        onClick={() => toggleInterest(type.id)}
                        className={`flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all ${
                          isSelected
                            ? "border-brand-gold bg-brand-gold/10 shadow-xs"
                            : "border-brand-navy/15 bg-white hover:border-brand-navy/30 hover:bg-brand-paper/30"
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                            isSelected
                              ? "border-brand-gold bg-brand-gold text-brand-navy"
                              : "border-brand-navy/30 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </div>
                        <div>
                          <p className="font-serif text-sm font-bold text-brand-navy">
                            {type.title}
                          </p>
                          <p className="mt-0.5 text-xs text-brand-slate leading-relaxed">
                            {type.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Subject Expertise Chip Input */}
              <div className="border-t border-brand-navy/10 pt-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-slate mb-1">
                  Specific Subject / Expertise Areas <span className="text-brand-brick">*</span>
                </label>
                <p className="text-xs text-brand-slate mb-2">
                  Add key technical topics, research fields, or curriculum subjects.
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newExpertiseInput}
                    onChange={(e) => setNewExpertiseInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddExpertise();
                      }
                    }}
                    placeholder="e.g. Machine Learning, Embedded Systems, VLSI"
                    className="flex-1 rounded-lg border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2 text-sm text-brand-navy focus:border-brand-navy focus:outline-none"
                  />
                  <Button
                    type="button"
                    onClick={() => handleAddExpertise()}
                    className="bg-brand-navy hover:bg-[#182344] text-brand-paper text-xs font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    <span>Add Area</span>
                  </Button>
                </div>

                {/* Selected Chips */}
                {expertiseAreas.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {expertiseAreas.map((area, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 rounded-full border border-brand-navy/20 bg-brand-paper px-3 py-1 text-xs font-semibold text-brand-navy shadow-3xs"
                      >
                        <span>{area}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveExpertise(idx)}
                          className="rounded-full p-0.5 text-brand-slate hover:bg-black/10 hover:text-brand-brick"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Quick Add Suggestions */}
                <div className="mt-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-slate mr-1.5">
                    Suggested:
                  </span>
                  <div className="inline-flex flex-wrap gap-1 mt-1">
                    {EXPERTISE_SUGGESTIONS.map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => handleAddExpertise(sug)}
                        className="rounded border border-black/10 bg-white px-2 py-0.5 text-[10px] text-brand-slate hover:border-brand-gold hover:text-brand-navy transition-colors cursor-pointer"
                      >
                        + {sug}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Contact & Links */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="border-b border-brand-navy/10 pb-4">
                <h2 className="font-serif text-xl font-bold text-brand-navy flex items-center gap-2">
                  <Mail className="h-5 w-5 text-brand-navy" />
                  <span>Step 3: Official Contact & Academic Links</span>
                </h2>
                <p className="mt-1 text-xs text-brand-slate">
                  Provide verified contact information and public research or professional profiles.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-slate">
                  Institutional Email Address <span className="text-brand-brick">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="professor@university.edu"
                  className="mt-1.5 w-full rounded-lg border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2 text-sm text-brand-navy focus:border-brand-navy focus:outline-none font-mono"
                />
                <p className="mt-1 text-[11px] text-brand-slate">
                  Used for verified collaboration invitations and mutual matching notifications.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-slate">
                  LinkedIn Profile URL (Optional)
                </label>
                <input
                  type="url"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/faculty-profile"
                  className="mt-1.5 w-full rounded-lg border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2 text-sm text-brand-navy focus:border-brand-navy focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-slate">
                  Google Scholar / ORCID Profile (Optional)
                </label>
                <input
                  type="url"
                  value={scholarProfile}
                  onChange={(e) => setScholarProfile(e.target.value)}
                  placeholder="https://scholar.google.com/citations?user=..."
                  className="mt-1.5 w-full rounded-lg border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2 text-sm text-brand-navy focus:border-brand-navy focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-slate">
                  Faculty Page / Lab Website URL (Optional)
                </label>
                <input
                  type="url"
                  value={institutionProfile}
                  onChange={(e) => setInstitutionProfile(e.target.value)}
                  placeholder="https://cs.iitd.ac.in/~faculty"
                  className="mt-1.5 w-full rounded-lg border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2 text-sm text-brand-navy focus:border-brand-navy focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* STEP 4: Review and Submit */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="border-b border-brand-navy/10 pb-4">
                <h2 className="font-serif text-xl font-bold text-brand-navy flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-brand-gold" />
                  <span>Step 4: Review & Attest Academic Dossier</span>
                </h2>
                <p className="mt-1 text-xs text-brand-slate">
                  Review your information before saving your authenticated faculty profile to the SkillSwipe registry.
                </p>
              </div>

              {/* Dossier Card Review */}
              <div className="rounded-xl border-2 border-[#101830] bg-[#FDFCF9] p-6 shadow-sm space-y-6">
                
                {/* Academic Header */}
                <div className="border-b border-[#101830]/15 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-gold">
                      Academic Affiliation
                    </span>
                    <h3 className="font-serif text-xl font-bold text-brand-navy">
                      {designation === "Other" ? customDesignation : designation}
                    </h3>
                    <p className="text-xs text-brand-slate mt-0.5">
                      {department} &bull; <span className="font-semibold text-brand-navy">{institution}</span>
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentStep(1)}
                    className="text-xs self-start sm:self-auto"
                  >
                    Edit Info
                  </Button>
                </div>

                {/* Collaboration Types */}
                <div className="border-b border-[#101830]/15 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-brand-slate">
                      Selected Collaboration Tracks:
                    </h4>
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="text-xs text-brand-teal font-semibold hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedInterests.map((interestKey) => {
                      const item = COLLABORATION_TYPES.find((c) => c.id === interestKey);
                      return (
                        <div
                          key={interestKey}
                          className="flex items-center gap-2 rounded-lg border border-[#101830]/15 bg-white p-2.5 text-xs shadow-3xs"
                        >
                          <CheckCircle2 className="h-4 w-4 text-brand-teal shrink-0" />
                          <span className="font-serif font-semibold text-brand-navy">
                            {item?.title || interestKey}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Subject Areas */}
                <div className="border-b border-[#101830]/15 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-brand-slate">
                      Calibrated Expertise Areas:
                    </h4>
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="text-xs text-brand-teal font-semibold hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {expertiseAreas.map((area, idx) => (
                      <span
                        key={idx}
                        className="rounded-full border border-brand-navy/20 bg-brand-paper px-3 py-0.5 text-xs font-mono font-bold text-brand-navy shadow-3xs"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Contact & Links */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-brand-slate">
                      Contact & Public Records:
                    </h4>
                    <button
                      onClick={() => setCurrentStep(3)}
                      className="text-xs text-brand-teal font-semibold hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                  <p className="text-xs text-brand-navy font-mono">
                    <span className="text-brand-slate">Email: </span> {email}
                  </p>
                  {linkedin && (
                    <p className="text-xs text-brand-slate mt-1 truncate">
                      <span className="font-semibold">LinkedIn: </span> {linkedin}
                    </p>
                  )}
                  {scholarProfile && (
                    <p className="text-xs text-brand-slate mt-1 truncate">
                      <span className="font-semibold">Google Scholar: </span> {scholarProfile}
                    </p>
                  )}
                  {institutionProfile && (
                    <p className="text-xs text-brand-slate mt-1 truncate">
                      <span className="font-semibold">Lab/Faculty Page: </span> {institutionProfile}
                    </p>
                  )}
                </div>

              </div>
            </div>
          )}

          {/* Form Actions Footer */}
          <div className="mt-8 flex items-center justify-between border-t border-brand-navy/10 pt-6">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={submitting}
                className="text-xs font-semibold"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                <span>Back</span>
              </Button>
            ) : (
              <div />
            )}

            {currentStep < 4 ? (
              <Button
                type="button"
                onClick={handleNext}
                className="bg-brand-navy hover:bg-[#182344] text-brand-paper text-xs font-semibold shadow-xs"
              >
                <span>Continue</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-brand-gold hover:bg-[#B8870F] text-brand-navy font-bold text-xs shadow-md"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    <span>Registering Academic Dossier...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    <span>Complete Onboarding & Enter Portal</span>
                  </>
                )}
              </Button>
            )}
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
