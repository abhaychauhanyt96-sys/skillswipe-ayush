"use client";

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { WaxSealBadge } from "@/components/discover/WaxSealBadge";
import {
  MessageSquare,
  Sparkles,
  X,
  Send,
  Loader2,
  Building2,
  GraduationCap,
  ExternalLink,
  MapPin,
  Briefcase,
  Award,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";

interface SearchResultCard {
  type: "company" | "student";
  id: string;
  name?: string;
  industry?: string;
  location?: string;
  logoUrl?: string;
  website?: string;
  roles?: {
    title: string;
    type: string;
    stipend?: string;
    requiredSkills?: string[];
  }[];
  college?: string;
  degree?: string;
  year?: string;
  skills?: string[];
  projectsCount?: number;
}

interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  toolUsed?: string;
  toolResults?: SearchResultCard[];
  timestamp: string;
}

const SUGGESTIONS = [
  "How does mutual-consent matching work?",
  "Find companies hiring for React or Python",
  "How are compatibility scores calculated?",
  "How do I complete my profile?",
];

const INITIAL_WELCOME_MESSAGE: Message = {
  id: "welcome_1",
  role: "model",
  content:
    "Greetings! I am the official **SkillSwipe AI Guide**.\n\nI can explain how our mutual-consent matching protocol works, break down compatibility scores, guide your credential profile setup, or search live company and candidate rosters on your behalf.\n\nHow may I assist you today?",
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
};

const SESSION_STORAGE_KEY = "skillswipe_chat_history_session";

export function ChatAssistantModal() {
  const { user, userRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Initialize messages from session storage if present
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        // Fall back to initial
      }
    }
    return [INITIAL_WELCOME_MESSAGE];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Persist conversation to sessionStorage across same-session navigations
  useEffect(() => {
    if (typeof window !== "undefined" && messages.length > 0) {
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(messages));
      } catch (e) {
        // Ignore session quota notice
      }
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Reset conversation session
  const handleResetChat = () => {
    setMessages([INITIAL_WELCOME_MESSAGE]);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Send conversation history to the secure server API route
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          history: historyPayload,
          userRole: userRole || "student",
        }),
      });

      const data = await res.json();

      const assistantMessage: Message = {
        id: `model_${Date.now()}`,
        role: "model",
        content:
          data.response ||
          "I'm here to assist with SkillSwipe. Please ask any questions regarding matching, profiles, or platform navigation.",
        toolUsed: data.toolUsed,
        toolResults: data.toolResults,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Chat client error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "model",
          content:
            "I encountered a temporary connection issue. Please verify your connection and try asking again.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Only show the assistant for logged-in users on logged-in dashboard pages
  if (!user) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 select-none print:hidden">
      {/* Collapsed Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3 rounded-full border-2 border-[#D4A017] bg-[#101830] px-4 py-3 text-brand-paper shadow-2xl hover:scale-105 hover:bg-[#182344] transition-all cursor-pointer ring-4 ring-black/20"
          aria-label="Open SkillSwipe AI Guide"
        >
          <div className="relative">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#D4A017] via-[#C28E0D] to-[#8E6503] shadow-xs border border-[#FFE8A3]">
              <Sparkles className="h-4 w-4 text-[#101830]" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4A017] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#D4A017]"></span>
            </span>
          </div>

          <div className="flex flex-col items-start pr-1 text-left">
            <span className="font-serif text-xs font-bold tracking-tight text-[#F7F5EF] flex items-center gap-1.5">
              <span>SkillSwipe AI Guide</span>
              <span className="rounded bg-brand-gold/25 border border-brand-gold/40 px-1 py-0.2 text-[8px] font-mono text-brand-gold font-bold uppercase">
                Flash
              </span>
            </span>
            <span className="text-[10px] text-brand-paper/70 font-sans">
              Platform guide & live search
            </span>
          </div>
        </button>
      )}

      {/* Expanded Modal Dialog Window */}
      {isOpen && (
        <div className="flex flex-col w-[94vw] sm:w-[440px] h-[580px] max-h-[85vh] rounded-2xl border-3 border-[#101830] bg-[#FDFCF9] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* Header Bar */}
          <div className="relative bg-[#101830] px-4 py-3.5 text-brand-paper border-b-2 border-[#D4A017] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#D4A017] via-[#C28E0D] to-[#8E6503] shadow-xs border border-[#FFE8A3]">
                <Sparkles className="h-4 w-4 text-[#101830]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-serif text-sm font-bold text-[#F7F5EF]">
                    SkillSwipe AI Assistant
                  </h3>
                  <span className="rounded bg-brand-gold/25 border border-brand-gold/40 px-1.5 py-0.2 text-[9px] font-mono font-bold text-brand-gold">
                    Flash
                  </span>
                </div>
                <p className="text-[10px] text-slate-300">
                  Academia–Industry Protocol Navigator
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                title="Reset conversation"
                className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-brand-gold transition-colors"
                aria-label="Reset Conversation"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Close Assistant"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Conversation Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FDFCF9]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${
                  m.role === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[90%] rounded-xl px-4 py-3 text-xs leading-relaxed shadow-2xs ${
                    m.role === "user"
                      ? "bg-[#101830] text-[#F7F5EF] rounded-br-none"
                      : "border border-[#101830]/15 bg-[#F7F5EF] text-brand-navy rounded-bl-none"
                  }`}
                >
                  {/* Model Tag & Tool Call Indicator */}
                  {m.role === "model" && m.toolUsed && (
                    <div className="mb-2 inline-flex items-center gap-1.5 rounded bg-[#1F6F5C]/15 border border-[#1F6F5C]/30 px-2 py-0.5 text-[9px] font-bold text-[#1F6F5C] uppercase tracking-wider">
                      <Sparkles className="h-3 w-3" />
                      <span>
                        {m.toolUsed === "getTrackRequirements"
                          ? "AYUSH Track Requirements Retrieved"
                          : m.toolUsed === "getSkillInfo"
                          ? "AYUSH Skill Taxonomy Retrieved"
                          : "Live Directory Tool Executed"}
                      </span>
                    </div>
                  )}

                  {/* Main Text Content */}
                  <div className="whitespace-pre-line prose prose-xs">
                    {m.content}
                  </div>

                  {/* Render Structured Interactive Profile Cards Inside Chat */}
                  {m.toolUsed === "searchProfiles" && Array.isArray(m.toolResults) && m.toolResults.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-[#101830]/10 space-y-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-brand-slate">
                        Matched Profiles from Directory ({m.toolResults.length}):
                      </p>

                      <div className="space-y-2">
                        {m.toolResults.map((card, cIdx) => (
                          <div
                            key={cIdx}
                            className="rounded-lg border border-[#101830]/20 bg-white p-3 shadow-2xs hover:border-brand-gold transition-all text-brand-navy"
                          >
                            {/* Card Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#101830]/15 bg-brand-paper/50">
                                  {card.type === "company" ? (
                                    <Building2 className="h-4 w-4 text-brand-teal" />
                                  ) : (
                                    <GraduationCap className="h-4 w-4 text-brand-gold" />
                                  )}
                                </div>
                                <div>
                                  <h4 className="font-serif text-xs font-bold text-brand-navy line-clamp-1">
                                    {card.name}
                                  </h4>
                                  <p className="text-[10px] text-brand-slate line-clamp-1">
                                    {card.type === "company"
                                      ? `${card.industry || "Industry Partner"} • ${card.location || "Remote"}`
                                      : `${card.degree || "Student"} • ${card.college || "University"}`}
                                  </p>
                                </div>
                              </div>

                              <span className="rounded bg-brand-gold/15 px-1.5 py-0.5 text-[9px] font-mono font-bold text-[#8E6503] uppercase shrink-0">
                                {card.type}
                              </span>
                            </div>

                            {/* Open Roles or Skills Chips */}
                            {card.type === "company" && card.roles && card.roles.length > 0 && (
                              <div className="mt-2 text-[10px] border-t border-black/5 pt-1.5">
                                <span className="font-semibold text-brand-navy">
                                  {card.roles[0].title}
                                </span>
                                {card.roles[0].stipend && (
                                  <span className="text-brand-gold font-mono ml-1 font-bold">
                                    ({card.roles[0].stipend})
                                  </span>
                                )}
                              </div>
                            )}

                            {card.type === "student" && card.skills && card.skills.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1 border-t border-black/5 pt-1.5">
                                {card.skills.slice(0, 3).map((sk, skIdx) => (
                                  <span
                                    key={skIdx}
                                    className="rounded bg-[#F7F5EF] border border-black/10 px-1.5 py-0.2 text-[9px] font-mono text-brand-navy"
                                  >
                                    {sk}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Clickable Action Link */}
                            <div className="mt-2.5 pt-2 border-t border-black/5 flex items-center justify-end">
                              <Link
                                href={
                                  card.type === "company"
                                    ? `/company/${card.id}`
                                    : `/profile/${card.id}`
                                }
                                onClick={() => setIsOpen(false)}
                                className="inline-flex items-center gap-1 rounded bg-[#101830] px-2.5 py-1 text-[10px] font-bold text-brand-gold hover:bg-[#182344] transition-colors shadow-3xs"
                              >
                                <span>
                                  {card.type === "company"
                                    ? "View Company Charter"
                                    : "View Digital Portfolio"}
                                </span>
                                <ArrowRight className="h-3 w-3" />
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <span className="mt-1 px-1 text-[9px] text-brand-slate font-mono">
                  {m.timestamp}
                </span>
              </div>
            ))}

            {/* Typing / Loading Indicator */}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-brand-slate py-2 pl-2">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-[#D4A017] animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="h-2 w-2 rounded-full bg-[#D4A017] animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="h-2 w-2 rounded-full bg-[#D4A017] animate-bounce"></span>
                </div>
                <span className="font-mono text-[11px] text-brand-navy/70 animate-pulse ml-1">
                  SkillSwipe AI is consulting platform records...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Inquiries (shown when fewer messages) */}
          {messages.length <= 3 && !loading && (
            <div className="px-3 pb-2 pt-1 border-t border-black/5 bg-[#FDFCF9]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-slate/80 mb-1.5">
                Suggested Questions:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(s)}
                    className="rounded-full border border-[#101830]/20 bg-white px-2.5 py-1 text-[10px] font-medium text-brand-navy hover:border-[#D4A017] hover:bg-[#F7F5EF] transition-all text-left truncate max-w-full cursor-pointer shadow-3xs"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3 border-t-2 border-[#101830]/10 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about matching, profiles, or search roles..."
                disabled={loading}
                className="flex-1 rounded-xl border border-[#101830]/20 bg-[#FDFCF9] px-3.5 py-2 text-xs font-medium text-brand-navy placeholder:text-brand-slate/60 focus:border-brand-gold focus:outline-none disabled:opacity-50"
              />
              <Button
                type="submit"
                disabled={!input.trim() || loading}
                size="sm"
                className="bg-[#101830] hover:bg-[#182344] text-brand-gold font-bold px-3 py-2 shrink-0 shadow-xs cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
            <p className="mt-1.5 text-center text-[9px] text-brand-slate/70">
              Powered by Google Gemini Flash &bull; Server-verified security
            </p>
          </div>

        </div>
      )}
    </div>
  );
}
