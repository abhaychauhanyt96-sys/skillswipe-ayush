import type { Student, CompanyOpenRole, Company } from "@/types";

export interface ScoreBreakdown {
  skillOverlapRaw: number;      // 0.0 - 1.0
  skillOverlapScore: number;    // 0 - 50 points
  locationMatchRaw: number;     // 0 or 1
  locationScore: number;        // 0 or 15 points
  experienceFitRaw: number;     // 0.0 - 1.0
  experienceScore: number;      // 0 - 15 points
  industryMatchRaw: number;     // 0 or 1
  industryScore: number;        // 0 - 20 points
}

export interface CompatibilityResult {
  score: number; // 0 - 100
  matchedSkills: string[];
  missingSkills: string[];
  breakdown: ScoreBreakdown;
}

/**
 * Calculates the exact Layer-1 compatibility score:
 * score = (skillOverlap * 0.5)
 *       + (locationOrRemoteMatch * 0.15)
 *       + (experienceLevelFit * 0.15)
 *       + (studentStatedInterestInIndustry * 0.2)
 */
export function calculateCompatibilityScore(
  student: Student,
  company: Company,
  role: CompanyOpenRole
): CompatibilityResult {
  // 1. Skill Overlap (0 - 50%)
  const studentSkillsRecord: Record<string, number> = {};
  student.skills.forEach((s) => {
    // Advanced/Expert = 1.0, Intermediate = 0.75, Beginner = 0.5
    const weight = s.level === "expert" ? 1.0 : s.level === "intermediate" ? 0.75 : 0.5;
    studentSkillsRecord[s.name.toLowerCase().trim()] = weight;
  });

  const requiredSkills = role.requiredSkills || [];
  let matchedSkillWeightSum = 0;
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  requiredSkills.forEach((req) => {
    const cleanReq = req.toLowerCase().trim();
    // Check direct or substring match
    let found = false;
    for (const sName of Object.keys(studentSkillsRecord)) {
      const w = studentSkillsRecord[sName];
      if (sName === cleanReq || sName.includes(cleanReq) || cleanReq.includes(sName)) {
        matchedSkillWeightSum += w;
        matchedSkills.push(req);
        found = true;
        break;
      }
    }
    if (!found) {
      missingSkills.push(req);
    }
  });

  const skillOverlapRaw =
    requiredSkills.length > 0
      ? Math.min(1.0, matchedSkillWeightSum / requiredSkills.length)
      : 0.5;
  const skillOverlapScore = Math.round(skillOverlapRaw * 50 * 10) / 10;

  // 2. Location or Remote Match (0 or 15%)
  const isRemote =
    role.isRemote ||
    (role.location && role.location.toLowerCase().includes("remote")) ||
    (role.description && role.description.toLowerCase().includes("remote"));

  const studentLocation = (student.basicInfo?.location || "").toLowerCase().trim();
  const companyLocation = (company.basicInfo?.location || "").toLowerCase().trim();
  const roleLocation = (role.location || "").toLowerCase().trim();

  let locationMatchRaw = 0;
  if (isRemote || studentLocation.includes("remote")) {
    locationMatchRaw = 1;
  } else if (
    studentLocation &&
    (companyLocation.includes(studentLocation) ||
      studentLocation.includes(companyLocation) ||
      (roleLocation && roleLocation.includes(studentLocation)))
  ) {
    locationMatchRaw = 1;
  }
  const locationScore = locationMatchRaw * 15;

  // 3. Experience Level Fit (0 - 15%)
  const gradYear = parseInt(student.basicInfo?.year || "2026", 10);
  const isRecentGrad = student.basicInfo?.year === "Recent Graduate" || gradYear <= 2025;

  let experienceFitRaw = 0.5;
  if (role.type === "internship") {
    // Internships prefer current undergraduates (2026, 2027, 2028, 2029)
    if (!isRecentGrad && gradYear >= 2026) {
      experienceFitRaw = 1.0;
    } else {
      experienceFitRaw = 0.5; // Recent grads looking for internship
    }
  } else {
    // Full-time jobs prefer recent graduates or graduating seniors
    if (isRecentGrad || gradYear === 2026) {
      experienceFitRaw = 1.0;
    } else {
      experienceFitRaw = 0.4; // 2nd/3rd year looking for full-time job early
    }
  }
  const experienceScore = Math.round(experienceFitRaw * 15 * 10) / 10;

  // 4. Student Stated Interest in Industry (0 or 20%)
  const companyIndustry = (company.basicInfo?.industry || "").toLowerCase().trim();
  const studentIndustries = (student.interestedIndustries || []).map((i) => i.toLowerCase().trim());

  let industryMatchRaw = 0;
  if (studentIndustries.length > 0) {
    const matched = studentIndustries.some(
      (ind) =>
        ind === companyIndustry ||
        ind.includes(companyIndustry) ||
        companyIndustry.includes(ind)
    );
    if (matched) industryMatchRaw = 1;
  } else {
    // If student hasn't selected industries yet, assign partial 0.5 neutral credit (10 pts)
    industryMatchRaw = 0.5;
  }
  const industryScore = Math.round(industryMatchRaw * 20 * 10) / 10;

  // Final Total Score (0 - 100)
  const totalScore = Math.min(
    100,
    Math.max(0, Math.round(skillOverlapScore + locationScore + experienceScore + industryScore))
  );

  return {
    score: totalScore,
    matchedSkills,
    missingSkills,
    breakdown: {
      skillOverlapRaw: Math.round(skillOverlapRaw * 100) / 100,
      skillOverlapScore,
      locationMatchRaw,
      locationScore,
      experienceFitRaw: Math.round(experienceFitRaw * 100) / 100,
      experienceScore,
      industryMatchRaw,
      industryScore,
    },
  };
}
