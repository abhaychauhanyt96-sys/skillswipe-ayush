"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { StepIndicator } from "@/components/onboarding/StepIndicator";
import { CareerTrackSelector } from "@/components/onboarding/CareerTrackSelector";
import { TaxonomySkillsChecklist } from "@/components/onboarding/TaxonomySkillsChecklist";
import { SkillChipInput } from "@/components/onboarding/SkillChipInput";
import { CertificateUploader } from "@/components/onboarding/CertificateUploader";
import { Button } from "@/components/ui/button";
import {
  Student,
  StudentSkill,
  StudentProject,
  StudentLinks,
  StudentCertificate,
  CareerTrack,
  TaxonomySkill,
  TaxonomySkillSelection,
} from "@/types";
import { db } from "@/lib/firebase/config";
import { doc, setDoc } from "firebase/firestore";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  School,
  Compass,
  Code2,
  FolderGit2,
  Link2,
  FileCheck,
  AlertCircle,
  HelpCircle,
  Loader2,
} from "lucide-react";

const STEP_LABELS = [
  "Academic Info",
  "Career Track",
  "Skills",
  "Projects",
  "Links & Certs",
  "Review & Submit",
];

export default function StudentOnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 1: Basic Information
  const [college, setCollege] = useState("");
  const [degree, setDegree] = useState("");
  const [year, setYear] = useState("2026");
  const [location, setLocation] = useState("");
  const [interestedIndustries, setInterestedIndustries] = useState<string[]>([
    "Ayurvedic Pharma & Manufacturing",
    "Clinical Research (CRO)",
  ]);

  // Step 2: Career Track
  const [selectedTrack, setSelectedTrack] = useState<string | null | undefined>(undefined);
  const [selectedTrackDetails, setSelectedTrackDetails] = useState<CareerTrack | null>(null);

  // Step 3: Skills (Taxonomy + Free-text)
  const [taxonomySkills, setTaxonomySkills] = useState<TaxonomySkillSelection[]>([]);
  const [taxonomySkillMap, setTaxonomySkillMap] = useState<Record<string, TaxonomySkill>>({});
  const [customSkills, setCustomSkills] = useState<StudentSkill[]>([]);

  // Combined list of taxonomy skills and custom skills
  const unifiedSkills: StudentSkill[] = React.useMemo(() => {
    const list: StudentSkill[] = [];
    const addedNames = new Set<string>();

    taxonomySkills.forEach((ts) => {
      const name = taxonomySkillMap[ts.skillId]?.name || ts.skillId;
      list.push({
        name,
        level: ts.proficiencyLevel,
        verified: false,
      });
      addedNames.add(name.toLowerCase());
    });

    customSkills.forEach((cs) => {
      if (!addedNames.has(cs.name.toLowerCase())) {
        list.push(cs);
        addedNames.add(cs.name.toLowerCase());
      }
    });

    return list;
  }, [taxonomySkills, taxonomySkillMap, customSkills]);

  // Step 3: Projects
  const [projects, setProjects] = useState<StudentProject[]>([
    {
      title: "Campus Collaboration Portal",
      description: "A web platform connecting students with research opportunities and industry challenges.",
      link: "https://github.com",
      techStack: ["React", "Firebase", "Tailwind CSS"],
    },
  ]);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [newProjectStack, setNewProjectStack] = useState("");
  const [newProjectLink, setNewProjectLink] = useState("");
  const [showAddProject, setShowAddProject] = useState(false);

  // Step 4: Links & Certificates
  const [links, setLinks] = useState<StudentLinks>({
    linkedin: "",
    github: "",
    portfolio: "",
  });
  const [certificates, setCertificates] = useState<StudentCertificate[]>([]);

  // Project handlers
  const handleAddProject = () => {
    if (!newProjectTitle.trim() || !newProjectDesc.trim()) return;

    const stackArray = newProjectStack
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const project: StudentProject = {
      title: newProjectTitle.trim(),
      description: newProjectDesc.trim(),
      techStack: stackArray.length ? stackArray : ["General Tech"],
      link: newProjectLink.trim() || undefined,
    };

    setProjects([...projects, project]);
    setNewProjectTitle("");
    setNewProjectDesc("");
    setNewProjectStack("");
    setNewProjectLink("");
    setShowAddProject(false);
  };

  const handleRemoveProject = (index: number) => {
    setProjects(projects.filter((_, idx) => idx !== index));
  };

  // Step validation
  const validateStep = (step: number) => {
    setErrorMessage(null);
    if (step === 1) {
      if (!college.trim() || !degree.trim() || !location.trim()) {
        setErrorMessage("Please complete all required fields (College, Degree, and Location).");
        return false;
      }
    }
    if (step === 2) {
      if (selectedTrack === undefined) {
        setErrorMessage("Please choose a career track or select 'Still exploring / not sure yet' to proceed.");
        return false;
      }
    }
    if (step === 3) {
      if (unifiedSkills.length === 0) {
        setErrorMessage("Please select or add at least one skill to continue.");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 6));
    }
  };

  const handleBack = () => {
    setErrorMessage(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Step 6: Final Submission to Firestore
  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const studentPayload: Student = {
        uid: user.uid,
        basicInfo: {
          college: college.trim(),
          degree: degree.trim(),
          year: year.trim(),
          location: location.trim(),
        },
        selectedTrack: selectedTrack !== undefined ? selectedTrack : null,
        taxonomySkills: selectedTrack ? taxonomySkills : [],
        skills: unifiedSkills,
        projects,
        links: {
          linkedin: links.linkedin?.trim() || "",
          github: links.github?.trim() || "",
          portfolio: links.portfolio?.trim() || "",
        },
        certificates,
        interestedIndustries,
        swipedRight: [],
        swipedLeft: [],
        matches: [],
      };

      // Write document into Firestore students/{uid} collection
      const studentDocRef = doc(db, "students", user.uid);
      await setDoc(studentDocRef, studentPayload, { merge: true });

      // Redirect to student dashboard
      router.push("/dashboard/student");
    } catch (err: any) {
      console.error("Failed to save student profile:", err);
      setErrorMessage(
        err.message || "Failed to submit student profile to Firestore. Please try again."
      );
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={["student"]}>
      <div className="mx-auto min-h-[calc(100vh-4rem)] max-w-4xl px-4 py-10 sm:px-6">
        {/* Wizard Progress Bar */}
        <StepIndicator
          currentStep={currentStep}
          totalSteps={6}
          stepLabels={STEP_LABELS}
        />

        {errorMessage && (
          <div
            id="onboarding-error-banner"
            className="mb-6 flex items-center gap-2 rounded-md bg-brand-brick/10 border border-brand-brick/30 p-3 text-xs text-brand-brick"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* STEP 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="border-b border-brand-navy/10 pb-4">
              <div className="flex items-center gap-2 text-brand-navy">
                <School className="h-5 w-5 text-brand-gold" />
                <h2 className="font-serif text-2xl font-bold">Academic Background</h2>
              </div>
              <p className="mt-1 text-xs text-brand-slate">
                Tell prospective industry partners where you study and your current academic status.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  htmlFor="college-input"
                  className="block text-xs font-semibold uppercase tracking-wider text-brand-slate"
                >
                  College / University Name *
                </label>
                <input
                  id="college-input"
                  type="text"
                  required
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  placeholder="e.g. Indian Institute of Technology Delhi, Anna University..."
                  className="mt-1.5 block w-full rounded-md border border-brand-navy/20 bg-white px-3.5 py-2.5 text-sm text-brand-navy placeholder:text-brand-slate/50 focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
                />
              </div>

              <div>
                <label
                  htmlFor="degree-input"
                  className="block text-xs font-semibold uppercase tracking-wider text-brand-slate"
                >
                  Degree & Branch *
                </label>
                <input
                  id="degree-input"
                  type="text"
                  required
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  placeholder="e.g. B.Tech Computer Science, MCA, B.Sc Data Science"
                  className="mt-1.5 block w-full rounded-md border border-brand-navy/20 bg-white px-3.5 py-2.5 text-sm text-brand-navy placeholder:text-brand-slate/50 focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
                />
              </div>

              <div>
                <label
                  htmlFor="year-select"
                  className="block text-xs font-semibold uppercase tracking-wider text-brand-slate"
                >
                  Expected Graduation Year *
                </label>
                <select
                  id="year-select"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="mt-1.5 block w-full rounded-md border border-brand-navy/20 bg-white px-3.5 py-2.5 text-sm text-brand-navy focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
                >
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                  <option value="2029">2029</option>
                  <option value="Recent Graduate">Recent Graduate</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="location-input"
                  className="block text-xs font-semibold uppercase tracking-wider text-brand-slate"
                >
                  Current Location / City *
                </label>
                <input
                  id="location-input"
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Bengaluru, New Delhi, Remote / Open to relocate"
                  className="mt-1.5 block w-full rounded-md border border-brand-navy/20 bg-white px-3.5 py-2.5 text-sm text-brand-navy placeholder:text-brand-slate/50 focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
                />
              </div>

              {/* Industries of Interest Multi-select */}
              <div className="sm:col-span-2 border-t border-brand-navy/10 pt-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-brand-slate">
                    Industries I&apos;m Interested In (Used for 20% Matching Fit)
                  </label>
                  <span className="text-[11px] font-mono text-brand-teal">
                    {interestedIndustries.length} Selected
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-brand-slate">
                  Select the sectors you want to target. Matching companies will earn the full 20% industry bonus in your score.
                </p>

                <div className="mt-2.5 flex flex-wrap gap-2">
                  {[
                    "Ayurvedic Pharma & Manufacturing",
                    "Clinical Research (CRO)",
                    "Wellness, Spa & Medical Tourism",
                    "Yoga, Naturopathy & Corporate Wellness",
                    "Digital Health & Telemedicine",
                    "Commercial Pharmacy & Supply Chain",
                    "Healthcare & Life Sciences",
                    "Research & Academia",
                  ].map((ind) => {
                    const isSelected = interestedIndustries.includes(ind);
                    return (
                      <button
                        key={ind}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setInterestedIndustries(interestedIndustries.filter((i) => i !== ind));
                          } else {
                            setInterestedIndustries([...interestedIndustries, ind]);
                          }
                        }}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                          isSelected
                            ? "border-brand-teal bg-brand-teal text-white shadow-xs"
                            : "border-brand-navy/20 bg-white text-brand-navy hover:border-brand-teal/50 hover:bg-brand-paper"
                        }`}
                      >
                        {isSelected ? "✓ " : "+ "}
                        {ind}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Career Track Selection */}
        {currentStep === 2 && (
          <CareerTrackSelector
            selectedTrackId={selectedTrack}
            onSelectTrack={(trackId, trackDetails) => {
              setSelectedTrack(trackId);
              setSelectedTrackDetails(trackDetails);
              // Clear previous track's taxonomy selections if track changes
              setTaxonomySkills([]);
              setErrorMessage(null);
            }}
          />
        )}

        {/* STEP 3: Skills & Proficiency */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="border-b border-brand-navy/10 pb-4">
              <div className="flex items-center gap-2 text-brand-navy">
                <Code2 className="h-5 w-5 text-brand-gold" />
                <h2 className="font-serif text-2xl font-bold">Skills & Proficiencies</h2>
              </div>
              <p className="mt-1 text-xs text-brand-slate">
                {selectedTrack && selectedTrackDetails
                  ? `Calibrate the official competencies for ${selectedTrackDetails.name}, plus any additional custom tools or strengths.`
                  : "Add your technical, clinical, and domain strengths to drive mutual-compatibility scoring with industry partners."}
              </p>
            </div>

            {/* Path A: Track selected -> Curated Taxonomy Checklist + Custom additions */}
            {selectedTrack ? (
              <div className="space-y-8">
                <TaxonomySkillsChecklist
                  selectedTrackId={selectedTrack}
                  selectedTrackName={selectedTrackDetails?.name}
                  value={taxonomySkills}
                  onChange={(selections, map) => {
                    setTaxonomySkills(selections);
                    setTaxonomySkillMap(map);
                    setErrorMessage(null);
                  }}
                />

                <div className="border-t border-brand-navy/15 pt-6">
                  <div className="mb-3">
                    <h3 className="font-serif text-base font-bold text-brand-navy">
                      Additional & Custom Skills (Optional)
                    </h3>
                    <p className="text-xs text-brand-slate">
                      Have unique software skills, specialized lab techniques, or languages outside the standard track? Add them below.
                    </p>
                  </div>
                  <SkillChipInput skills={customSkills} onChange={setCustomSkills} />
                </div>
              </div>
            ) : (
              /* Path B: Still exploring -> Free-text Skill Input */
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-lg border border-brand-gold/30 bg-amber-50/50 p-3 text-xs text-amber-900">
                  <HelpCircle className="h-4 w-4 text-brand-gold shrink-0" />
                  <span>
                    You selected <strong>Still exploring</strong>. Add any clinical, research, technical, or traditional AYUSH skills that showcase your profile.
                  </span>
                </div>
                <SkillChipInput skills={customSkills} onChange={setCustomSkills} />
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Projects */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="border-b border-brand-navy/10 pb-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-brand-navy">
                  <FolderGit2 className="h-5 w-5 text-brand-gold" />
                  <h2 className="font-serif text-2xl font-bold">Notable Projects</h2>
                </div>
                <p className="mt-1 text-xs text-brand-slate">
                  Highlight work you&apos;ve built. This information feeds the card preview and AI summarizer.
                </p>
              </div>

              {!showAddProject && (
                <Button
                  id="open-add-project-btn"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddProject(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  <span>Add Project</span>
                </Button>
              )}
            </div>

            {/* Existing Projects List */}
            <div className="space-y-4">
              {projects.map((proj, idx) => (
                <div
                  key={idx}
                  className="relative rounded-xl border border-brand-navy/15 bg-white p-5 shadow-xs transition-all hover:border-brand-navy/30"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-serif text-base font-bold text-brand-navy">
                        {proj.title}
                      </h3>
                      <p className="mt-1 text-xs text-brand-slate leading-relaxed">
                        {proj.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveProject(idx)}
                      className="text-brand-slate hover:text-brand-brick p-1 rounded transition-colors"
                      title="Delete project"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-brand-navy/10 pt-3">
                    <div className="flex flex-wrap gap-1.5">
                      {proj.techStack.map((tech) => (
                        <span
                          key={tech}
                          className="rounded bg-brand-paper px-2 py-0.5 text-[11px] font-medium text-brand-navy border border-brand-navy/15"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>

                    {proj.link && (
                      <a
                        href={proj.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand-teal hover:underline"
                      >
                        <span>Project Link</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Project Sub-Form */}
            {showAddProject && (
              <div className="rounded-xl border-2 border-brand-gold/40 bg-white p-5 shadow-sm space-y-4">
                <h3 className="font-serif text-sm font-bold text-brand-navy">
                  Add New Project
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="project-title-input"
                      className="block text-xs font-semibold uppercase tracking-wider text-brand-slate"
                    >
                      Project Title *
                    </label>
                    <input
                      id="project-title-input"
                      type="text"
                      value={newProjectTitle}
                      onChange={(e) => setNewProjectTitle(e.target.value)}
                      placeholder="e.g. Traditional Medicine Formulations Tracker"
                      className="mt-1.5 block w-full rounded-md border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2 text-sm text-brand-navy placeholder:text-brand-slate/50 focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="project-desc-input"
                      className="block text-xs font-semibold uppercase tracking-wider text-brand-slate"
                    >
                      Description & Accomplishments *
                    </label>
                    <textarea
                      id="project-desc-input"
                      rows={3}
                      value={newProjectDesc}
                      onChange={(e) => setNewProjectDesc(e.target.value)}
                      placeholder="Summarize the core problem solved, methodology, and outcome..."
                      className="mt-1.5 block w-full rounded-md border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2 text-sm text-brand-navy placeholder:text-brand-slate/50 focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="project-stack-input"
                      className="block text-xs font-semibold uppercase tracking-wider text-brand-slate"
                    >
                      Methods / Tech Stack (comma separated)
                    </label>
                    <input
                      id="project-stack-input"
                      type="text"
                      value={newProjectStack}
                      onChange={(e) => setNewProjectStack(e.target.value)}
                      placeholder="e.g. HPLC, Clinical Data, Python"
                      className="mt-1.5 block w-full rounded-md border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2 text-sm text-brand-navy placeholder:text-brand-slate/50 focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="project-link-input"
                      className="block text-xs font-semibold uppercase tracking-wider text-brand-slate"
                    >
                      Project / Paper Link (optional)
                    </label>
                    <input
                      id="project-link-input"
                      type="url"
                      value={newProjectLink}
                      onChange={(e) => setNewProjectLink(e.target.value)}
                      placeholder="https://..."
                      className="mt-1.5 block w-full rounded-md border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2 text-sm text-brand-navy placeholder:text-brand-slate/50 focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddProject(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    id="save-project-btn"
                    type="button"
                    size="sm"
                    onClick={handleAddProject}
                    disabled={!newProjectTitle.trim() || !newProjectDesc.trim()}
                  >
                    Save Project
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: Links & Certificates */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="border-b border-brand-navy/10 pb-4">
              <div className="flex items-center gap-2 text-brand-navy">
                <Link2 className="h-5 w-5 text-brand-gold" />
                <h2 className="font-serif text-2xl font-bold">Links & Verified Credentials</h2>
              </div>
              <p className="mt-1 text-xs text-brand-slate">
                Share your online profiles and upload certificates to back up your claimed skills.
              </p>
            </div>

            {/* Social & Portfolio Links */}
            <div className="rounded-xl border border-brand-navy/15 bg-white p-5 shadow-sm space-y-4">
              <h3 className="font-serif text-sm font-bold text-brand-navy">
                Professional Presence
              </h3>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="linkedin-input"
                    className="block text-xs font-semibold uppercase tracking-wider text-brand-slate"
                  >
                    LinkedIn Profile URL
                  </label>
                  <input
                    id="linkedin-input"
                    type="url"
                    value={links.linkedin || ""}
                    onChange={(e) =>
                      setLinks({ ...links, linkedin: e.target.value })
                    }
                    placeholder="https://linkedin.com/in/..."
                    className="mt-1.5 block w-full rounded-md border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2 text-sm text-brand-navy placeholder:text-brand-slate/50 focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy"
                  />
                </div>

                <div>
                  <label
                    htmlFor="github-input"
                    className="block text-xs font-semibold uppercase tracking-wider text-brand-slate"
                  >
                    GitHub Profile URL
                  </label>
                  <input
                    id="github-input"
                    type="url"
                    value={links.github || ""}
                    onChange={(e) =>
                      setLinks({ ...links, github: e.target.value })
                    }
                    placeholder="https://github.com/..."
                    className="mt-1.5 block w-full rounded-md border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2 text-sm text-brand-navy placeholder:text-brand-slate/50 focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy"
                  />
                </div>

                <div>
                  <label
                    htmlFor="portfolio-input"
                    className="block text-xs font-semibold uppercase tracking-wider text-brand-slate"
                  >
                    Portfolio / Website
                  </label>
                  <input
                    id="portfolio-input"
                    type="url"
                    value={links.portfolio || ""}
                    onChange={(e) =>
                      setLinks({ ...links, portfolio: e.target.value })
                    }
                    placeholder="https://myportfolio.dev"
                    className="mt-1.5 block w-full rounded-md border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2 text-sm text-brand-navy placeholder:text-brand-slate/50 focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy"
                  />
                </div>
              </div>
            </div>

            {/* Certificate Uploader Component */}
            {user && (
              <CertificateUploader
                userId={user.uid}
                certificates={certificates}
                onChange={setCertificates}
              />
            )}
          </div>
        )}

        {/* STEP 6: Review Dossier */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div className="border-b border-brand-navy/10 pb-4">
              <div className="flex items-center gap-2 text-brand-navy">
                <FileCheck className="h-5 w-5 text-brand-teal" />
                <h2 className="font-serif text-2xl font-bold">Review Your Dossier</h2>
              </div>
              <p className="mt-1 text-xs text-brand-slate">
                Please verify your details before committing your profile to the mutual-matching pool.
              </p>
            </div>

            {/* Academic Credential Card Preview */}
            <div className="rounded-xl border-2 border-brand-navy/20 bg-white p-6 shadow-md relative overflow-hidden">
              {/* Corner watermark badge */}
              <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-brand-gold/10 pointer-events-none" />

              {/* Student Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-brand-navy/10 pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-brand-gold">
                    Official Candidate Dossier
                  </span>
                  <h3 className="font-serif text-2xl font-bold text-brand-navy mt-0.5">
                    {user?.displayName || "Student Candidate"}
                  </h3>
                  <p className="text-xs text-brand-slate mt-0.5">
                    {degree || "Degree"} • {college || "Institution"} • Class of {year}
                  </p>
                  <p className="text-xs text-brand-slate font-medium">
                    📍 {location || "Location not specified"}
                  </p>
                </div>

                <div className="flex flex-col items-end">
                  <span className="rounded-full border border-brand-teal/30 bg-brand-teal/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-teal">
                    Ready for Discovery
                  </span>
                </div>
              </div>

              {/* Career Track Overview */}
              <div className="py-4 border-b border-brand-navy/10">
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-slate">
                  AYUSH Career Pathway
                </span>
                <div className="mt-2">
                  {selectedTrack && selectedTrackDetails ? (
                    <div className="flex items-center gap-2.5 rounded-lg border border-brand-navy/15 bg-brand-paper/80 px-3.5 py-2.5 text-xs text-brand-navy">
                      <Compass className="h-4 w-4 text-brand-gold shrink-0" />
                      <div>
                        <span className="font-bold text-sm block">{selectedTrackDetails.name}</span>
                        {selectedTrackDetails.idealFor && (
                          <span className="text-brand-slate text-[11px]">{selectedTrackDetails.idealFor}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg border border-brand-gold/30 bg-amber-50/50 px-3 py-2 text-xs font-medium text-amber-900">
                      <HelpCircle className="h-4 w-4 text-brand-gold shrink-0" />
                      <span>Still exploring all AYUSH tracks / Interdisciplinary</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Skills Overview */}
              <div className="py-4 border-b border-brand-navy/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-brand-slate">
                    Calibrated Skills ({unifiedSkills.length})
                  </span>
                  {taxonomySkills.length > 0 && (
                    <span className="text-[11px] font-mono text-brand-teal">
                      {taxonomySkills.length} from taxonomy
                    </span>
                  )}
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {unifiedSkills.map((s) => (
                    <span
                      key={s.name}
                      className="inline-flex items-center gap-1.5 rounded-md border border-brand-navy/15 bg-brand-paper px-2.5 py-1 text-xs font-medium text-brand-navy"
                    >
                      <span>{s.name}</span>
                      {s.level && (
                        <span className="text-[10px] font-bold uppercase opacity-60">
                          • {s.level}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {/* Projects Overview */}
              <div className="py-4 border-b border-brand-navy/10">
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-slate">
                  Projects ({projects.length})
                </span>
                <div className="mt-2.5 space-y-2.5">
                  {projects.map((proj, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-brand-navy/10 bg-brand-paper/40 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-serif text-sm font-bold text-brand-navy">
                          {proj.title}
                        </h4>
                        {proj.link && (
                          <a
                            href={proj.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-brand-teal hover:underline flex items-center gap-1"
                          >
                            <span>Link</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-brand-slate">
                        {proj.description}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {proj.techStack.map((tech) => (
                          <span
                            key={tech}
                            className="rounded bg-white px-1.5 py-0.5 text-[10px] text-brand-slate border border-brand-navy/10 font-mono"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Certificates Overview */}
              <div className="pt-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-brand-slate">
                  Verified Certificates & Links
                </span>
                <div className="mt-2 text-xs text-brand-slate space-y-1">
                  {links.linkedin && (
                    <p>
                      <strong>LinkedIn:</strong> {links.linkedin}
                    </p>
                  )}
                  {links.github && (
                    <p>
                      <strong>GitHub:</strong> {links.github}
                    </p>
                  )}
                  {links.portfolio && (
                    <p>
                      <strong>Portfolio:</strong> {links.portfolio}
                    </p>
                  )}
                  {certificates.length > 0 ? (
                    <p className="text-brand-teal font-medium mt-1">
                      ✓ {certificates.length} certificate(s) uploaded to Cloud Storage
                    </p>
                  ) : (
                    <p className="text-brand-slate/70 italic mt-1">
                      No external certificates uploaded
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Navigation Footer */}
        <div className="mt-8 flex items-center justify-between border-t border-brand-navy/15 pt-5">
          {currentStep > 1 ? (
            <Button
              id="wizard-back-btn"
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

          {currentStep < 6 ? (
            <Button
              id="wizard-next-btn"
              type="button"
              onClick={handleNext}
              className="px-6"
            >
              <span>Next</span>
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          ) : (
            <Button
              id="wizard-submit-btn"
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-brand-navy text-brand-gold hover:bg-[#182344] px-8 shadow-md"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span>Committing Profile...</span>
                </>
              ) : (
                <>
                  <span>Complete & Enter Portal</span>
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
