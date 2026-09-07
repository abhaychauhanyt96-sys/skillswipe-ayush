"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  AcademicOpportunity,
  AcademicOpportunityType,
  AcademicOpportunityMode,
} from "@/types";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  BookOpen,
  Briefcase,
  HelpCircle,
} from "lucide-react";

interface Props {
  companyName?: string;
}

const TYPE_OPTIONS: { id: AcademicOpportunityType; label: string; badgeColor: string }[] = [
  { id: "FDP", label: "Faculty Development Program (FDP)", badgeColor: "bg-amber-100 text-amber-800 border-amber-300" },
  { id: "industrial-training", label: "Industrial Training", badgeColor: "bg-blue-100 text-blue-800 border-blue-300" },
  { id: "consultancy", label: "Consultancy & Advisory", badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  { id: "research", label: "Collaborative Research", badgeColor: "bg-purple-100 text-purple-800 border-purple-300" },
  { id: "guest-lecture", label: "Guest Lecture / Workshop", badgeColor: "bg-orange-100 text-orange-800 border-orange-300" },
];

const MODE_OPTIONS: { id: AcademicOpportunityMode; label: string }[] = [
  { id: "online", label: "Online" },
  { id: "offline", label: "In-Person (Offline)" },
  { id: "hybrid", label: "Hybrid" },
];

const EXPERTISE_SUGGESTIONS = [
  "Machine Learning",
  "Embedded Systems",
  "VLSI Design",
  "Cybersecurity",
  "Cloud Computing",
  "Data Science",
  "Robotics & Control",
  "IoT",
  "Natural Language Processing",
  "Power Systems",
];

export function AcademicOpportunitiesSection({ companyName }: Props) {
  const { user } = useAuth();

  // List of opportunities
  const [opportunities, setOpportunities] = useState<AcademicOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState<AcademicOpportunityType>("FDP");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requiredExpertise, setRequiredExpertise] = useState<string[]>([]);
  const [newExpertiseInput, setNewExpertiseInput] = useState("");
  const [duration, setDuration] = useState("");
  const [mode, setMode] = useState<AcademicOpportunityMode>("hybrid");
  const [applyBy, setApplyBy] = useState("");

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch opportunities posted by this company
  const loadOpportunities = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, "academicOpportunities"),
        where("postedBy", "==", user.uid)
      );
      const snapshot = await getDocs(q);
      const items: AcademicOpportunity[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
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
          companyName: data.companyName,
        });
      });
      // Sort client-side descending by createdAt
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOpportunities(items);
    } catch (err) {
      console.error("Failed to load academic opportunities:", err);
      setStatusMessage({
        type: "error",
        text: "Could not load existing academic opportunities.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOpportunities();
  }, [user]);

  // Handle adding expertise chip
  const handleAddExpertise = (chipValue?: string) => {
    const val = (chipValue || newExpertiseInput).trim();
    if (!val) return;
    if (!requiredExpertise.some((item) => item.toLowerCase() === val.toLowerCase())) {
      setRequiredExpertise((prev) => [...prev, val]);
    }
    setNewExpertiseInput("");
  };

  // Handle removing expertise chip
  const handleRemoveExpertise = (indexToRemove: number) => {
    setRequiredExpertise((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Reset Form
  const resetForm = () => {
    setEditingId(null);
    setType("FDP");
    setTitle("");
    setDescription("");
    setRequiredExpertise([]);
    setNewExpertiseInput("");
    setDuration("");
    setMode("hybrid");
    setApplyBy("");
  };

  // Populate form for editing
  const handleStartEdit = (opp: AcademicOpportunity) => {
    setEditingId(opp.id);
    setType(opp.type);
    setTitle(opp.title);
    setDescription(opp.description);
    setRequiredExpertise([...opp.requiredExpertise]);
    setDuration(opp.duration);
    setMode(opp.mode);
    setApplyBy(opp.applyBy);
    setStatusMessage(null);

    // Smooth scroll up to form
    const formElement = document.getElementById("academic-opp-form");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Submit Form (Create or Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setStatusMessage({ type: "error", text: "You must be signed in to post." });
      return;
    }

    if (!title.trim()) {
      setStatusMessage({ type: "error", text: "Please enter an opportunity title." });
      return;
    }
    if (!description.trim()) {
      setStatusMessage({ type: "error", text: "Please provide a detailed description." });
      return;
    }
    if (requiredExpertise.length === 0) {
      setStatusMessage({ type: "error", text: "Please add at least one required expertise domain." });
      return;
    }
    if (!duration.trim()) {
      setStatusMessage({ type: "error", text: "Please specify the expected duration." });
      return;
    }
    if (!applyBy.trim()) {
      setStatusMessage({ type: "error", text: "Please select an application deadline date." });
      return;
    }

    setActionLoading(true);
    setStatusMessage(null);

    try {
      if (editingId) {
        // Update existing document
        const oppRef = doc(db, "academicOpportunities", editingId);
        await updateDoc(oppRef, {
          type,
          title: title.trim(),
          description: description.trim(),
          requiredExpertise: requiredExpertise.map((e) => e.trim()),
          duration: duration.trim(),
          mode,
          applyBy: applyBy.trim(),
          companyName: companyName || "Industry Partner",
        });

        setStatusMessage({
          type: "success",
          text: `"${title.trim()}" opportunity updated successfully.`,
        });
      } else {
        // Create new document in academicOpportunities
        await addDoc(collection(db, "academicOpportunities"), {
          postedBy: user.uid,
          type,
          title: title.trim(),
          description: description.trim(),
          requiredExpertise: requiredExpertise.map((e) => e.trim()),
          duration: duration.trim(),
          mode,
          applyBy: applyBy.trim(),
          createdAt: serverTimestamp(),
          companyName: companyName || "Industry Partner",
        });

        setStatusMessage({
          type: "success",
          text: `"${title.trim()}" opportunity posted successfully for academicians.`,
        });
      }

      resetForm();
      await loadOpportunities();
    } catch (err) {
      console.error("Error saving academic opportunity:", err);
      setStatusMessage({
        type: "error",
        text: "Failed to save the academic opportunity. Please try again.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Delete an opportunity
  const handleDelete = async (id: string, oppTitle: string) => {
    setActionLoading(true);
    try {
      await deleteDoc(doc(db, "academicOpportunities", id));
      setStatusMessage({
        type: "success",
        text: `Opportunity "${oppTitle}" deleted successfully.`,
      });
      setDeletingId(null);
      await loadOpportunities();
    } catch (err) {
      console.error("Failed to delete opportunity:", err);
      setStatusMessage({
        type: "error",
        text: "Could not delete this posting. Please try again.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Informational Intro Banner */}
      <div className="rounded-xl border border-brand-gold/30 bg-[#FDFCF9] p-5 shadow-2xs">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-navy text-brand-gold shadow-3xs">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-brand-navy">
              Faculty & Academic Collaborations
            </h2>
            <p className="mt-1 text-xs text-brand-slate leading-relaxed">
              Engage directly with professors, researchers, and university departments. Post Faculty Development Programs (FDPs), industry consulting projects, specialized guest lecture requests, or sponsored collaborative research grants.
            </p>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {statusMessage && (
        <div
          className={`flex items-start justify-between rounded-lg border p-4 text-xs ${
            statusMessage.type === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-rose-300 bg-rose-50 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Form: Post / Edit Opportunity */}
      <div
        id="academic-opp-form"
        className="rounded-2xl border-2 border-brand-navy/15 bg-white p-6 sm:p-8 shadow-xs"
      >
        <div className="border-b border-brand-navy/10 pb-4 mb-6 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-teal/10 px-2.5 py-0.5 text-[11px] font-bold text-brand-teal mb-1">
              <Sparkles className="h-3 w-3" />
              <span>{editingId ? "Edit Collaboration Posting" : "New Academic Initiative"}</span>
            </div>
            <h3 className="font-serif text-xl font-bold text-brand-navy">
              {editingId ? "Update Academic Collaboration" : "Post Opportunity for Academicians"}
            </h3>
          </div>

          {editingId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetForm}
              className="text-xs text-brand-slate hover:text-brand-navy"
            >
              Cancel Edit
            </Button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Row 1: Type & Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Type */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-slate mb-1.5">
                Collaboration Type <span className="text-brand-brick">*</span>
              </label>
              <select
                id="academic-type-select"
                value={type}
                onChange={(e) => setType(e.target.value as AcademicOpportunityType)}
                className="w-full rounded-lg border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2.5 text-sm text-brand-navy focus:border-brand-navy focus:outline-none"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Mode */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-slate mb-1.5">
                Delivery Mode <span className="text-brand-brick">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {MODE_OPTIONS.map((opt) => {
                  const isSelected = mode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setMode(opt.id)}
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold text-center transition-all ${
                        isSelected
                          ? "border-brand-gold bg-brand-gold/15 text-brand-navy shadow-3xs"
                          : "border-brand-navy/20 bg-brand-paper/20 text-brand-slate hover:bg-brand-paper/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-brand-slate mb-1.5">
              Initiative Title <span className="text-brand-brick">*</span>
            </label>
            <input
              id="academic-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 5-Day Faculty Development Program on Generative AI & LLMs"
              className="w-full rounded-lg border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2.5 text-sm text-brand-navy placeholder:text-brand-slate/50 focus:border-brand-navy focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-brand-slate mb-1.5">
              Program Description & Objectives <span className="text-brand-brick">*</span>
            </label>
            <textarea
              id="academic-desc-input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail the curriculum goals, academic background sought, deliverables, honorarium or certification offered..."
              className="w-full rounded-lg border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2.5 text-sm text-brand-navy placeholder:text-brand-slate/50 focus:border-brand-navy focus:outline-none"
            />
          </div>

          {/* Required Expertise (Chip Input) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-brand-slate mb-1">
              Required Expertise / Subject Areas <span className="text-brand-brick">*</span>
            </label>
            <p className="text-[11px] text-brand-slate mb-2">
              Add technical domains or academic subject competencies needed for this collaboration.
            </p>

            <div className="flex gap-2">
              <input
                id="academic-expertise-input"
                type="text"
                value={newExpertiseInput}
                onChange={(e) => setNewExpertiseInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddExpertise();
                  }
                }}
                placeholder="e.g. Machine Learning, Cloud Systems, VLSI"
                className="flex-1 rounded-lg border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2 text-sm text-brand-navy placeholder:text-brand-slate/50 focus:border-brand-navy focus:outline-none"
              />
              <Button
                type="button"
                id="academic-add-expertise-btn"
                onClick={() => handleAddExpertise()}
                className="bg-brand-navy hover:bg-[#182344] text-brand-paper text-xs font-semibold shrink-0"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                <span>Add Skill</span>
              </Button>
            </div>

            {/* Active Chips */}
            {requiredExpertise.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {requiredExpertise.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 rounded-full border border-brand-navy/20 bg-brand-paper px-3 py-1 text-xs font-semibold text-brand-navy shadow-3xs"
                  >
                    <span>{skill}</span>
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

            {/* Quick Suggestions */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-brand-slate mr-1">Suggested:</span>
              {EXPERTISE_SUGGESTIONS.slice(0, 6).map((sug) => {
                const isAdded = requiredExpertise.some(
                  (e) => e.toLowerCase() === sug.toLowerCase()
                );
                if (isAdded) return null;
                return (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => handleAddExpertise(sug)}
                    className="rounded-full border border-brand-navy/15 bg-white px-2.5 py-0.5 text-[11px] font-medium text-brand-slate hover:border-brand-gold hover:text-brand-navy hover:bg-brand-gold/10 transition-colors"
                  >
                    + {sug}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: Duration & Application Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-slate mb-1.5">
                Duration / Commitment <span className="text-brand-brick">*</span>
              </label>
              <input
                id="academic-duration-input"
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 5 Days, 2 Weeks, 1 Semester"
                className="w-full rounded-lg border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2.5 text-sm text-brand-navy placeholder:text-brand-slate/50 focus:border-brand-navy focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-brand-slate mb-1.5">
                Application Deadline (Apply By) <span className="text-brand-brick">*</span>
              </label>
              <input
                id="academic-applyby-input"
                type="date"
                value={applyBy}
                onChange={(e) => setApplyBy(e.target.value)}
                className="w-full rounded-lg border border-brand-navy/20 bg-brand-paper/30 px-3.5 py-2.5 text-sm text-brand-navy focus:border-brand-navy focus:outline-none"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-brand-navy/10 flex items-center justify-end gap-3">
            {editingId && (
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={actionLoading}
                className="text-xs font-semibold"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              id="academic-submit-btn"
              disabled={actionLoading}
              className="bg-brand-navy hover:bg-[#182344] text-brand-paper font-semibold text-xs px-6 py-2.5 shadow-xs"
            >
              {actionLoading ? (
                <span>Saving Posting...</span>
              ) : editingId ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1.5 text-brand-gold" />
                  <span>Update Collaboration</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1.5 text-brand-gold" />
                  <span>Publish Academic Opportunity</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* List: Company's Posted Opportunities */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-xl font-bold text-brand-navy flex items-center gap-2">
              <span>Your Posted Academic Collaborations</span>
              <span className="rounded-full bg-brand-navy/10 px-2 py-0.5 text-xs font-bold text-brand-navy">
                {opportunities.length}
              </span>
            </h3>
            <p className="text-xs text-brand-slate mt-0.5">
              Manage your active academic calls, update requirements, or remove completed initiatives.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-48 rounded-xl bg-black/5 animate-pulse" />
            ))}
          </div>
        ) : opportunities.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-brand-navy/20 bg-brand-paper/30 p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-navy/10 text-brand-navy mb-3">
              <BookOpen className="h-6 w-6" />
            </div>
            <h4 className="font-serif text-base font-bold text-brand-navy">
              No Academic Collaborations Posted Yet
            </h4>
            <p className="mt-1 text-xs text-brand-slate max-w-md mx-auto">
              You have not posted any opportunities for academicians yet. Use the form above to invite faculty for FDPs, consultancies, joint research, or guest lectures.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {opportunities.map((opp) => {
              const typeMeta = TYPE_OPTIONS.find((t) => t.id === opp.type);
              const isConfirmingDelete = deletingId === opp.id;

              return (
                <div
                  key={opp.id}
                  className="flex flex-col justify-between rounded-xl border border-brand-navy/15 bg-white p-5 shadow-xs hover:border-brand-gold transition-all"
                >
                  <div className="space-y-3">
                    {/* Header: Type Badge & Mode */}
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          typeMeta?.badgeColor || "bg-brand-paper text-brand-navy border-brand-navy/20"
                        }`}
                      >
                        {typeMeta?.label || opp.type}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded bg-brand-navy/5 px-2 py-0.5 text-[10px] font-semibold text-brand-slate uppercase">
                        <MapPin className="h-3 w-3 text-brand-teal" />
                        <span>{opp.mode}</span>
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div>
                      <h4 className="font-serif text-base font-bold text-brand-navy leading-snug">
                        {opp.title}
                      </h4>
                      <p className="mt-1.5 text-xs text-brand-slate line-clamp-3 leading-relaxed">
                        {opp.description}
                      </p>
                    </div>

                    {/* Required Expertise Chips */}
                    {opp.requiredExpertise && opp.requiredExpertise.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {opp.requiredExpertise.map((skill, sIdx) => (
                          <span
                            key={sIdx}
                            className="rounded bg-brand-paper px-2 py-0.5 text-[11px] font-medium text-brand-navy border border-brand-navy/10"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Meta: Duration & Deadline */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-brand-slate pt-2 border-t border-brand-navy/10">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-brand-teal" />
                        <span>Duration: {opp.duration}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-brand-gold" />
                        <span>Apply by: {opp.applyBy}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="mt-4 pt-3 border-t border-brand-navy/10 flex items-center justify-end gap-2">
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-2 bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                        <span className="text-[11px] font-semibold text-rose-700">Delete this posting?</span>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(opp.id, opp.title)}
                          disabled={actionLoading}
                          className="h-7 px-2 text-[11px] bg-rose-600 hover:bg-rose-700"
                        >
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeletingId(null)}
                          className="h-7 px-2 text-[11px]"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleStartEdit(opp)}
                          className="h-8 px-3 text-xs font-semibold text-brand-navy hover:border-brand-navy"
                        >
                          <Edit2 className="h-3 w-3 mr-1 text-brand-teal" />
                          <span>Edit</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletingId(opp.id)}
                          className="h-8 px-3 text-xs font-semibold text-brand-brick hover:bg-rose-50 border-rose-200"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          <span>Delete</span>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
