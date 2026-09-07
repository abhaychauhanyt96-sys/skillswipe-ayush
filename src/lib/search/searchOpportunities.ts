import { AcademicOpportunity } from "@/types";

/**
 * Standalone, reusable search filtering function for Academic Opportunities.
 * Matches:
 *  - Title (opp.title)
 *  - Description (opp.description)
 *  - Required Expertise (opp.requiredExpertise[])
 *  - Company Name (opp.companyName)
 * 
 * Case-insensitive substring matching.
 * Returns all opportunities if query is empty or only whitespace.
 * 
 * Designed to be reusable directly by UI components, filter pipelines, and AI/Chatbot features.
 */
export function searchOpportunities(
  opportunities: AcademicOpportunity[],
  query: string
): AcademicOpportunity[] {
  if (!opportunities || !Array.isArray(opportunities)) {
    return [];
  }

  const trimmedQuery = (query || "").trim().toLowerCase();
  if (!trimmedQuery) {
    return opportunities;
  }

  const STOP_WORDS = new Set([
    "or",
    "and",
    "in",
    "for",
    "the",
    "a",
    "an",
    "at",
    "with",
    "opportunity",
    "opportunities",
    "program",
    "programs",
  ]);

  const tokens = trimmedQuery
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9+#]/g, ""))
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));

  const searchTerms = Array.from(new Set([trimmedQuery, ...tokens])).filter(Boolean);

  return opportunities.filter((opp) => {
    if (!opp) return false;

    const title = (opp.title || "").toLowerCase();
    const desc = (opp.description || "").toLowerCase();
    const company = (opp.companyName || "").toLowerCase();
    const expertiseList = (opp.requiredExpertise || []).map((e) => e.toLowerCase());

    return searchTerms.some((term) => {
      if (title.includes(term)) return true;
      if (desc.includes(term)) return true;
      if (company.includes(term)) return true;
      if (expertiseList.some((exp) => exp.includes(term))) return true;
      return false;
    });
  });
}
