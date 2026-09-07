"use client";

import React, { useState, useEffect } from "react";
import { CompanyOpenRole, CareerTrack, TaxonomySkill, RoleType } from "@/types";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import {
  X,
  Briefcase,
  Compass,
  CheckSquare2,
  Square,
  Award,
  ShieldCheck,
  Plus,
  Loader2,
  AlertCircle,
  MapPin,
  IndianRupee,
} from "lucide-react";

interface RolePostingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (role: CompanyOpenRole) => Promise<void>;
  initialRole?: CompanyOpenRole | null;
}

export function RolePostingModal({
  isOpen,
  onClose,
  onSave,
  initialRole,
}: RolePostingModalProps) {
  const isEditing = !!initialRole;

  // Form Fields
  const [title, setTitle] = useState("");
  const [type, setType] = useState<RoleType>("internship");
  const [careerTrack, setCareerTrack] = useState<string>("");
  const [selectedTaxonomySkillIds, setSelectedTaxonomySkillIds] = useState<string[]>([]);
  const [customSkills, setCustomSkills] = useState<string[]>([]);
  const [customSkillInput, setCustomSkillInput] = useState("");
  const [stipend, setStipend] = useState("");
  const [location, setLocation] = useState("");
  const [isRemote, setIsRemote] = useState(false);
  const [description, setDescription] = useState("");

  // Firestore Data & States
  const [tracks, setTracks] = useState<CareerTrack[]>([]);
  const [taxonomySkills, setTaxonomySkills] = useState<TaxonomySkill[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Fetch all available Career Tracks from Firestore
  useEffect(() => {
    async function fetchCareerTracks() {
      try {
        setLoadingTracks(true);
        const snap = await getDocs(collection(db, "careerTracks"));
        const loaded: CareerTrack[] = [];
        snap.forEach((d) => {
          const data = d.data();
          loaded.push({
            id: d.id,
            name: data.name || d.id,
            idealFor: data.idealFor || "",
            targetRoles: data.targetRoles || [],
            exampleEmployers: data.exampleEmployers || [],
          });
        });
        setTracks(loaded);
      } catch (err) {
        console.error("Failed to load career tracks:", err);
      } finally {
        setLoadingTracks(false);
      }
    }

    if (isOpen) {
      fetchCareerTracks();
    }
  }, [isOpen]);

  // 2. Pre-fill state when editing or resetting when creating
  useEffect(() => {
    if (!isOpen) return;

    if (initialRole) {
      setTitle(initialRole.title || "");
      setType(initialRole.type || "internship");
      setCareerTrack(initialRole.careerTrack || "");
      setSelectedTaxonomySkillIds(initialRole.requiredTaxonomySkills || []);
      setStipend(initialRole.stipend || "");
      setLocation(initialRole.location || "");
      setIsRemote(!!initialRole.isRemote);
      setDescription(initialRole.description || "");

      // Any skills not in taxonomy skill IDs are treated as custom skills initially
      setCustomSkills(initialRole.requiredSkills || []);
    } else {
      // New Role defaults
      setTitle("");
      setType("internship");
      setCareerTrack("");
      setSelectedTaxonomySkillIds([]);
      setCustomSkills([]);
      setCustomSkillInput("");
      setStipend("");
      setLocation("");
      setIsRemote(false);
      setDescription("");
    }
    setErrorMessage(null);
  }, [isOpen, initialRole]);

  // 3. Fetch skillsTaxonomy when careerTrack changes
  useEffect(() => {
    if (!careerTrack) {
      setTaxonomySkills([]);
      return;
    }

    async function fetchTaxonomySkills() {
      try {
        setLoadingSkills(true);
        const q = query(
          collection(db, "skillsTaxonomy"),
          where("tracks", "array-contains", careerTrack)
        );
        const snap = await getDocs(q);
        const loaded: TaxonomySkill[] = [];
        snap.forEach((d) => {
          const data = d.data();
          loaded.push({
            id: d.id,
            name: data.name || d.id,
            tracks: data.tracks || [],
            description: data.description || "",
            isMicroCredential: !!data.isMicroCredential,
            courses: data.courses || [],
          });
        });

        // Core competencies first, then micro-credentials
        loaded.sort((a, b) => {
          if (a.isMicroCredential === b.isMicroCredential) {
            return a.name.localeCompare(b.name);
          }
          return a.isMicroCredential ? 1 : -1;
        });

        setTaxonomySkills(loaded);

        // If editing an existing role without explicit requiredTaxonomySkills,
        // match existing requiredSkills names to taxonomy items
        if (initialRole && (!initialRole.requiredTaxonomySkills || initialRole.requiredTaxonomySkills.length === 0)) {
          const matchedIds: string[] = [];
          const remainingCustom: string[] = [];

          (initialRole.requiredSkills || []).forEach((reqName) => {
            const cleanReq = reqName.toLowerCase().trim();
            const foundTax = loaded.find((ts) => ts.name.toLowerCase().trim() === cleanReq);
            if (foundTax) {
              matchedIds.push(foundTax.id);
            } else {
              remainingCustom.push(reqName);
            }
          });

          if (matchedIds.length > 0) {
            setSelectedTaxonomySkillIds(matchedIds);
            setCustomSkills(remainingCustom);
          }
        }
      } catch (err) {
        console.error("Failed to load taxonomy skills:", err);
      } finally {
        setLoadingSkills(false);
      }
    }

    fetchTaxonomySkills();
  }, [careerTrack, initialRole]);

  if (!isOpen) return null;

  // Toggle taxonomy skill selection
  const handleToggleTaxonomySkill = (skillId: string) => {
    if (selectedTaxonomySkillIds.includes(skillId)) {
      setSelectedTaxonomySkillIds(selectedTaxonomySkillIds.filter((id) => id !== skillId));
    } else {
      setSelectedTaxonomySkillIds([...selectedTaxonomySkillIds, skillId]);
    }
  };

  // Add custom skill chip
  const handleAddCustomSkill = () => {
    const clean = customSkillInput.trim();
    if (!clean) return;

    if (!customSkills.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      setCustomSkills([...customSkills, clean]);
    }
    setCustomSkillInput("");
  };

  const handleRemoveCustomSkill = (name: string) => {
    setCustomSkills(customSkills.filter((s) => s !== name));
  };

  // Compute unified requiredSkills array
  const computeUnifiedSkills = (): string[] => {
    const list: string[] = [];
    const lowerSet = new Set<string>();

    // 1. Add names of selected taxonomy skills
    selectedTaxonomySkillIds.forEach((id) => {
      const taxItem = taxonomySkills.find((ts) => ts.id === id);
      const name = taxItem ? taxItem.name : id;
      if (!lowerSet.has(name.toLowerCase())) {
        list.push(name);
        lowerSet.add(name.toLowerCase());
      }
    });

    // 2. Add custom skills
    customSkills.forEach((cs) => {
      if (!lowerSet.has(cs.toLowerCase())) {
        list.push(cs);
        lowerSet.add(cs.toLowerCase());
      }
    });

    return list;
  };

  // Submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage("Role title is required.");
      return;
    }
    if (!description.trim()) {
      setErrorMessage("Role description is required.");
      return;
    }

    const unifiedSkills = computeUnifiedSkills();
    if (unifiedSkills.length === 0) {
      setErrorMessage("Please select at least one taxonomy competency or add a custom skill.");
      return;
    }

    const payload: CompanyOpenRole = {
      id: initialRole?.id || `role_${Date.now()}`,
      title: title.trim(),
      type,
      careerTrack: careerTrack || undefined,
      requiredTaxonomySkills: careerTrack ? selectedTaxonomySkillIds : [],
      requiredSkills: unifiedSkills,
      stipend: stipend.trim() || undefined,
      location: location.trim() || undefined,
      isRemote,
      description: description.trim(),
    };

    try {
      setSubmitting(true);
      await onSave(payload);
      onClose();
    } catch (err: any) {
      console.error("Failed to save role:", err);
      setErrorMessage(err.message || "Failed to save role. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-brand-navy/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border-2 border-brand-navy/20 bg-white shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-brand-navy/10 px-6 py-4 bg-brand-paper/50">
          <div className="flex items-center gap-2.5 text-brand-navy">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-teal/10 text-brand-teal border border-brand-teal/20">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold">
                {isEditing ? "Edit Position / Role" : "Post New Student Role"}
              </h2>
              <p className="text-xs text-brand-slate">
                Calibrate role requirements against AYUSH career tracks and competencies.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-brand-slate hover:bg-brand-navy/5 hover:text-brand-navy transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg border border-brand-brick/30 bg-brand-brick/10 p-3 text-xs text-brand-brick">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Row 1: Title and Type */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label
                htmlFor="role-title-input"
                className="block text-xs font-semibold uppercase tracking-wider text-brand-slate"
              >
                Role Title *
              </label>
              <input
                id="role-title-input"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Quality Control Analyst, Formulation R&D Trainee"
                className="mt-1.5 block w-full rounded-md border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2 text-sm text-brand-navy placeholder:text-brand-slate/50 focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy"
              />
            </div>

            <div>
              <label
                htmlFor="role-type-select"
                className="block text-xs font-semibold uppercase tracking-wider text-brand-slate"
              >
                Role Type *
              </label>
              <select
                id="role-type-select"
                value={type}
                onChange={(e) => setType(e.target.value as RoleType)}
                className="mt-1.5 block w-full rounded-md border border-brand-navy/20 bg-brand-paper/30 px-3 py-2 text-sm text-brand-navy focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy"
              >
                <option value="internship">Internship</option>
                <option value="job">Full-time Job</option>
              </select>
            </div>
          </div>

          {/* Row 2: Career Track Dropdown */}
          <div className="rounded-xl border border-brand-navy/15 bg-brand-paper/30 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="role-career-track-select"
                className="text-xs font-semibold uppercase tracking-wider text-brand-slate flex items-center gap-1.5"
              >
                <Compass className="h-4 w-4 text-brand-gold" />
                AYUSH Career Track
              </label>
              {loadingTracks && (
                <span className="text-[11px] text-brand-slate flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading tracks...
                </span>
              )}
            </div>

            <select
              id="role-career-track-select"
              value={careerTrack}
              onChange={(e) => {
                setCareerTrack(e.target.value);
                setSelectedTaxonomySkillIds([]);
              }}
              className="block w-full rounded-md border border-brand-navy/20 bg-white px-3.5 py-2 text-sm text-brand-navy focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
            >
              <option value="">-- Cross-Track / General AYUSH (No specific track) --</option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-brand-slate leading-relaxed">
              Selecting an AYUSH career track unlocks official competencies and targets candidates calibrated in this specific pathway.
            </p>
          </div>

          {/* Row 3: Curated Taxonomy Checklist (Filtered to Track) */}
          {careerTrack && (
            <div className="space-y-3 rounded-xl border border-brand-teal/20 bg-brand-teal/5 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-teal">
                    Curated Track Competencies
                  </span>
                  <p className="text-[11px] text-brand-slate">
                    Check the competencies required for candidates applying to this role.
                  </p>
                </div>
                <span className="rounded-full bg-brand-teal/15 px-2.5 py-0.5 text-xs font-bold text-brand-teal font-mono">
                  {selectedTaxonomySkillIds.length} Selected
                </span>
              </div>

              {loadingSkills && (
                <div className="flex items-center justify-center py-6 text-xs text-brand-slate gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-brand-teal" />
                  <span>Loading track competencies...</span>
                </div>
              )}

              {!loadingSkills && taxonomySkills.length > 0 && (
                <div className="grid gap-2 max-h-52 overflow-y-auto pr-1">
                  {taxonomySkills.map((skill) => {
                    const isChecked = selectedTaxonomySkillIds.includes(skill.id);
                    return (
                      <div
                        key={skill.id}
                        onClick={() => handleToggleTaxonomySkill(skill.id)}
                        className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-xs transition-all cursor-pointer select-none ${
                          isChecked
                            ? "border-brand-teal bg-white shadow-2xs"
                            : "border-brand-navy/10 bg-white/70 hover:border-brand-teal/40 hover:bg-white"
                        }`}
                      >
                        <button
                          type="button"
                          className="mt-0.5 text-brand-teal shrink-0"
                          aria-label={`Toggle ${skill.name}`}
                        >
                          {isChecked ? (
                            <CheckSquare2 className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4 text-brand-slate/40" />
                          )}
                        </button>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-brand-navy">{skill.name}</span>
                            {skill.isMicroCredential ? (
                              <span className="rounded bg-amber-50 px-1.5 py-0.2 text-[9px] font-semibold text-amber-800 border border-amber-200">
                                Micro-Credential
                              </span>
                            ) : (
                              <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[9px] font-semibold text-emerald-800 border border-emerald-200">
                                Core
                              </span>
                            )}
                          </div>
                          {skill.description && (
                            <p className="text-[11px] text-brand-slate leading-snug line-clamp-1">
                              {skill.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Row 4: Custom / Additional Skills */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-brand-slate">
              Additional & Custom Skills (Optional)
            </label>
            <p className="text-[11px] text-brand-slate">
              Add any specialized techniques, instruments, or software outside the standard taxonomy.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={customSkillInput}
                onChange={(e) => setCustomSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomSkill();
                  }
                }}
                placeholder="e.g. HPLC Analysis, Sanskrit Manuscript Translation, Python"
                className="block flex-1 rounded-md border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2 text-sm text-brand-navy placeholder:text-brand-slate/50 focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddCustomSkill}
                disabled={!customSkillInput.trim()}
                className="h-10"
              >
                <Plus className="h-4 w-4 mr-1" />
                <span>Add</span>
              </Button>
            </div>

            {/* Custom Skills Chips */}
            {customSkills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {customSkills.map((sk) => (
                  <span
                    key={sk}
                    className="inline-flex items-center gap-1 rounded-md border border-brand-navy/15 bg-brand-paper px-2.5 py-1 text-xs font-medium text-brand-navy"
                  >
                    <span>{sk}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomSkill(sk)}
                      className="text-brand-slate hover:text-brand-brick p-0.5 rounded"
                      aria-label={`Remove ${sk}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Row 5: Compensation, Location, Remote */}
          <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-brand-navy/10">
            <div>
              <label
                htmlFor="role-stipend-input"
                className="block text-xs font-semibold uppercase tracking-wider text-brand-slate"
              >
                Stipend / CTC *
              </label>
              <div className="relative mt-1.5">
                <input
                  id="role-stipend-input"
                  type="text"
                  value={stipend}
                  onChange={(e) => setStipend(e.target.value)}
                  placeholder="e.g. ₹25,000 / month or ₹5 LPA"
                  className="block w-full rounded-md border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2 text-sm text-brand-navy placeholder:text-brand-slate/50 focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="role-location-input"
                className="block text-xs font-semibold uppercase tracking-wider text-brand-slate"
              >
                Location & Mode
              </label>
              <div className="mt-1.5 space-y-2">
                <input
                  id="role-location-input"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Bengaluru, Pune, Haridwar"
                  className="block w-full rounded-md border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2 text-sm text-brand-navy placeholder:text-brand-slate/50 focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy"
                />
                <label className="inline-flex items-center gap-2 text-xs font-medium text-brand-navy cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isRemote}
                    onChange={(e) => setIsRemote(e.target.checked)}
                    className="rounded border-brand-navy/20 text-brand-teal focus:ring-brand-teal"
                  />
                  <span>Open to Remote candidates</span>
                </label>
              </div>
            </div>
          </div>

          {/* Row 6: Description */}
          <div>
            <label
              htmlFor="role-description-input"
              className="block text-xs font-semibold uppercase tracking-wider text-brand-slate"
            >
              Role Description & Expectations *
            </label>
            <textarea
              id="role-description-input"
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Outline daily duties, batch testing requirements, clinical trial protocols, or mentoring provided..."
              className="mt-1.5 block w-full rounded-md border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2 text-sm text-brand-navy placeholder:text-brand-slate/50 focus:border-brand-navy focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy"
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-brand-navy/10 px-6 py-4 bg-brand-paper/30">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-brand-navy text-brand-gold hover:bg-[#182344] px-6 shadow-sm"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span>Saving...</span>
              </>
            ) : (
              <span>{isEditing ? "Update Role" : "Publish Role"}</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
