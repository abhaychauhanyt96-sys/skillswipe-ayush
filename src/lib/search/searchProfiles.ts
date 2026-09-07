import { Company, Student } from "@/types";

export interface StudentWithDisplayName extends Student {
  displayName?: string;
  name?: string;
  email?: string;
}

export type SearchableProfile = Company | Student | StudentWithDisplayName;

/**
 * Type guard to check if a profile is a Company
 */
export function isCompanyProfile(profile: SearchableProfile): profile is Company {
  return "openRoles" in profile || (profile as unknown as Company).basicInfo?.industry !== undefined;
}

/**
 * Type guard to check if a profile is a Student
 */
export function isStudentProfile(profile: SearchableProfile): profile is (Student | StudentWithDisplayName) {
  return "skills" in profile && ("projects" in profile || (profile as unknown as Student).basicInfo?.college !== undefined);
}

/**
 * Standalone, reusable search filtering function.
 * Matches:
 *  - For Companies: name (basicInfo.name), skills (openRoles[].requiredSkills), and industry (basicInfo.industry).
 *  - For Students: name (displayName / name / basicInfo), skills (skills[].name), and college (basicInfo.college).
 * 
 * Case-insensitive substring matching.
 * Returns all profiles if query is empty or only whitespace.
 *
 * Designed to be reusable directly by both UI components and AI/Chatbot features.
 */
export function searchProfiles<T extends SearchableProfile>(
  allProfiles: T[],
  query: string
): T[] {
  if (!allProfiles || !Array.isArray(allProfiles)) {
    return [];
  }

  const trimmedQuery = (query || "").trim().toLowerCase();
  if (!trimmedQuery) {
    return allProfiles;
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
    "roles",
    "role",
    "developer",
    "internship",
    "intern",
    "job",
    "jobs",
    "company",
    "companies",
    "student",
    "students",
  ]);

  const tokens = trimmedQuery
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9+#]/g, ""))
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));

  // Search against full query and any extracted meaningful keyword tokens
  const searchTerms = Array.from(new Set([trimmedQuery, ...tokens])).filter(Boolean);

  return allProfiles.filter((profile) => {
    if (!profile) return false;

    if (isCompanyProfile(profile)) {
      const compName = (profile.basicInfo?.name || "").toLowerCase();
      const industry = (profile.basicInfo?.industry || "").toLowerCase();
      const roleSkills = (profile.openRoles || []).flatMap((r) =>
        (r.requiredSkills || []).map((s) => s.toLowerCase())
      );
      const roleTitles = (profile.openRoles || []).map((r) =>
        (r.title || "").toLowerCase()
      );

      return searchTerms.some((term) => {
        if (compName.includes(term)) return true;
        if (industry.includes(term)) return true;
        if (roleTitles.some((title) => title.includes(term))) return true;
        if (roleSkills.some((skill) => skill.includes(term))) return true;
        return false;
      });
    }

    if (isStudentProfile(profile)) {
      const student = profile as StudentWithDisplayName;
      const studentName = (
        student.displayName ||
        student.name ||
        (student as any).basicInfo?.name ||
        ""
      ).toLowerCase();
      const college = (student.basicInfo?.college || "").toLowerCase();
      const degree = (student.basicInfo?.degree || "").toLowerCase();
      const skills = (student.skills || []).map((sk) => (sk.name || "").toLowerCase());

      return searchTerms.some((term) => {
        if (studentName.includes(term)) return true;
        if (college.includes(term)) return true;
        if (degree.includes(term)) return true;
        if (skills.some((sk) => sk.includes(term))) return true;
        return false;
      });
    }

    const rawString = JSON.stringify(profile).toLowerCase();
    return searchTerms.some((term) => rawString.includes(term));
  });
}
