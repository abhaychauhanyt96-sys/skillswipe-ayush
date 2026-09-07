// ==========================================
// SkillSwipe Domain & Firestore Schema Types
// ==========================================

export type UserRole = "student" | "company" | "academician";

export interface User {
  uid: string;
  role: UserRole;
  email: string;
  name: string;
  createdAt: string; // ISO string or Firestore Timestamp
}

export type SkillProficiency = "beginner" | "intermediate" | "expert";

export interface StudentSkill {
  name: string;
  level: SkillProficiency;
  verified: boolean;
}

export interface StudentProject {
  title: string;
  description: string;
  link?: string;
  techStack: string[];
}

export interface StudentLinks {
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export interface StudentCertificate {
  name: string;
  issuer: string;
  fileUrl: string;
  date: string;
}

export interface TaxonomySkillSelection {
  skillId: string;
  proficiencyLevel: SkillProficiency;
}

export interface CareerTrack {
  id: string;
  name: string;
  idealFor: string;
  targetRoles: string[];
  exampleEmployers: string[];
}

export interface TaxonomySkillCourse {
  provider: string;
  type: string;
  url: string;
  tags: string[];
}

export interface TaxonomySkill {
  id: string;
  name: string;
  tracks: string[];
  description: string;
  isMicroCredential: boolean;
  courses: TaxonomySkillCourse[];
}

export interface Student {
  uid: string;
  basicInfo: {
    college: string;
    degree: string;
    year: string;
    location: string;
  };
  skills: StudentSkill[];
  selectedTrack?: string | null;
  taxonomySkills?: TaxonomySkillSelection[];
  projects: StudentProject[];
  links: StudentLinks;
  certificates: StudentCertificate[];
  interestedIndustries?: string[]; // Stated industry domains for Layer-1 compatibility scoring
  resumeUrl?: string;
  summary?: string; // Optional Layer-2 Gemini LLM generated one-line summary
  swipedRight: string[]; // company IDs
  swipedLeft: string[];  // company IDs
  matches: string[];     // company IDs
}

export type RoleType = "internship" | "job";

export interface CompanyOpenRole {
  id?: string;
  title: string;
  careerTrack?: string;
  requiredTaxonomySkills?: string[];
  requiredSkills: string[];
  type: RoleType;
  stipend?: string;
  description: string;
  location?: string;
  isRemote?: boolean;
}

export interface CompanyLearningProgram {
  title: string;
  description: string;
  certificationOffered: boolean;
}

export interface Company {
  uid: string;
  basicInfo: {
    name: string;
    industry: string;
    website?: string;
    logoUrl?: string;
    location?: string;
  };
  openRoles: CompanyOpenRole[];
  learningPrograms: CompanyLearningProgram[];
  swipedRight: string[]; // student IDs
  swipedLeft: string[];  // student IDs
  matches: string[];     // student IDs
}

export type MatchStatus = "new" | "contacted" | "in-progress" | "closed";

export interface Match {
  matchId: string;
  studentId: string;
  companyId: string;
  matchedAt: string;
  status: MatchStatus;
  roleTitle?: string;
  emailSentAt?: string | null;
}

export type AcademicianInterest =
  | "FDP"
  | "consultancy"
  | "research"
  | "industrial-training"
  | "guest-lecture";

export interface AcademicianLinks {
  email: string;
  linkedin?: string;
  scholarProfile?: string;
  institutionProfile?: string;
}

export interface Academician {
  uid: string;
  basicInfo: {
    institution: string;
    department: string;
    designation: string;
  };
  interests: AcademicianInterest[];
  expertiseAreas: string[];
  links: AcademicianLinks;
  createdAt?: string;
}

export interface InstitutionAnalytics {
  institutionId: string;
  placementStats: {
    totalStudents: number;
    placedStudents: number;
    averagePackage?: string;
  };
  skillGapReport: {
    topDeficientSkills: string[];
    trendingInDemandSkills: string[];
  };
  internshipParticipation: {
    activeInternships: number;
    topPartnerCompanies: string[];
  };
}

export type AcademicOpportunityType =
  | "FDP"
  | "industrial-training"
  | "consultancy"
  | "research"
  | "guest-lecture";

export type AcademicOpportunityMode = "online" | "offline" | "hybrid";

export interface AcademicOpportunity {
  id: string;
  postedBy: string; // companyId
  type: AcademicOpportunityType;
  title: string;
  description: string;
  requiredExpertise: string[];
  duration: string;
  mode: AcademicOpportunityMode;
  applyBy: string; // date string (YYYY-MM-DD)
  createdAt: string; // ISO string
  companyName?: string;
}

export interface AcademicianInterestRecord {
  id: string;
  academicianId: string;
  opportunityId: string;
  companyId: string;
  expressedAt: string;
  status: "new" | "contacted" | "closed";
  emailSentAt?: string | null;
  opportunityTitle?: string;
  academicianName?: string;
}


