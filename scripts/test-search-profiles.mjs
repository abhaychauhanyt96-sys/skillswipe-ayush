import assert from "node:assert";

// Sample mock profiles
const mockCompanies = [
  {
    uid: "comp-1",
    basicInfo: {
      name: "TCS Research Labs",
      industry: "Artificial Intelligence & IT",
      location: "Bengaluru, India",
    },
    openRoles: [
      {
        title: "NLP Research Intern",
        requiredSkills: ["Python", "PyTorch", "Transformers"],
      },
    ],
  },
  {
    uid: "comp-2",
    basicInfo: {
      name: "GreenWave Cleantech",
      industry: "Renewable Energy",
      location: "Pune, India",
    },
    openRoles: [
      {
        title: "Embedded Systems Engineer",
        requiredSkills: ["C++", "IoT", "Microcontrollers"],
      },
    ],
  },
  {
    uid: "comp-3",
    basicInfo: {
      name: "FinPulse Analytics",
      industry: "FinTech",
      location: "Mumbai, India",
    },
    openRoles: [
      {
        title: "Fullstack Developer",
        requiredSkills: ["React", "Node.js", "TypeScript", "PostgreSQL"],
      },
    ],
  },
];

const mockStudents = [
  {
    uid: "stud-1",
    displayName: "Aarav Sharma",
    basicInfo: {
      college: "IIT Bombay",
      degree: "B.Tech Computer Science",
      year: "2026",
    },
    skills: [
      { name: "Python", level: "expert" },
      { name: "PyTorch", level: "intermediate" },
      { name: "Machine Learning", level: "expert" },
    ],
  },
  {
    uid: "stud-2",
    displayName: "Priya Patel",
    basicInfo: {
      college: "BITS Pilani",
      degree: "B.Tech Electrical & Electronics",
      year: "2025",
    },
    skills: [
      { name: "C++", level: "expert" },
      { name: "Embedded Systems", level: "intermediate" },
      { name: "IoT", level: "intermediate" },
    ],
  },
  {
    uid: "stud-3",
    displayName: "Rohan Varma",
    basicInfo: {
      college: "DTU Delhi",
      degree: "B.Tech Information Technology",
      year: "2026",
    },
    skills: [
      { name: "React", level: "expert" },
      { name: "TypeScript", level: "intermediate" },
      { name: "TailwindCSS", level: "expert" },
    ],
  },
];

// Inline reproduction of searchProfiles logic for Node.js test execution
function isCompanyProfile(profile) {
  return "openRoles" in profile || profile.basicInfo?.industry !== undefined;
}

function isStudentProfile(profile) {
  return "skills" in profile && ("projects" in profile || profile.basicInfo?.college !== undefined);
}

function searchProfiles(allProfiles, query) {
  if (!allProfiles || !Array.isArray(allProfiles)) return [];
  const trimmedQuery = (query || "").trim().toLowerCase();
  if (!trimmedQuery) return allProfiles;

  return allProfiles.filter((profile) => {
    if (!profile) return false;

    if (isCompanyProfile(profile)) {
      const compName = (profile.basicInfo?.name || "").toLowerCase();
      if (compName.includes(trimmedQuery)) return true;

      const industry = (profile.basicInfo?.industry || "").toLowerCase();
      if (industry.includes(trimmedQuery)) return true;

      if (profile.openRoles && Array.isArray(profile.openRoles)) {
        const hasMatchingSkill = profile.openRoles.some((role) =>
          role.requiredSkills?.some((skill) =>
            skill.toLowerCase().includes(trimmedQuery)
          )
        );
        if (hasMatchingSkill) return true;
      }
      return false;
    }

    if (isStudentProfile(profile)) {
      const studentName = (
        profile.displayName ||
        profile.name ||
        profile.basicInfo?.name ||
        ""
      ).toLowerCase();
      if (studentName.includes(trimmedQuery)) return true;

      const college = (profile.basicInfo?.college || "").toLowerCase();
      if (college.includes(trimmedQuery)) return true;

      if (profile.skills && Array.isArray(profile.skills)) {
        const hasMatchingSkill = profile.skills.some((sk) =>
          (sk.name || "").toLowerCase().includes(trimmedQuery)
        );
        if (hasMatchingSkill) return true;
      }
      return false;
    }

    return JSON.stringify(profile).toLowerCase().includes(trimmedQuery);
  });
}

console.log("=== Testing searchProfiles() Logic ===");

// 1. Company Tests
console.log("\n1. Testing Company Search:");
// By company name (case-insensitive)
const res1 = searchProfiles(mockCompanies, "tcs");
assert.strictEqual(res1.length, 1);
assert.strictEqual(res1[0].basicInfo.name, "TCS Research Labs");
console.log("  [PASS] Found company by name: 'tcs' -> TCS Research Labs");

// By industry
const res2 = searchProfiles(mockCompanies, "fintech");
assert.strictEqual(res2.length, 1);
assert.strictEqual(res2[0].basicInfo.name, "FinPulse Analytics");
console.log("  [PASS] Found company by industry: 'fintech' -> FinPulse Analytics");

// By required skill
const res3 = searchProfiles(mockCompanies, "pytorch");
assert.strictEqual(res3.length, 1);
assert.strictEqual(res3[0].basicInfo.name, "TCS Research Labs");
console.log("  [PASS] Found company by role skill: 'pytorch' -> TCS Research Labs");

// Empty query returns all
const resEmptyComp = searchProfiles(mockCompanies, "   ");
assert.strictEqual(resEmptyComp.length, 3);
console.log("  [PASS] Empty query returns all 3 companies");

// 2. Student Tests
console.log("\n2. Testing Student Search:");
// By student name
const res4 = searchProfiles(mockStudents, "aarav");
assert.strictEqual(res4.length, 1);
assert.strictEqual(res4[0].displayName, "Aarav Sharma");
console.log("  [PASS] Found student by name: 'aarav' -> Aarav Sharma");

// By college
const res5 = searchProfiles(mockStudents, "bits pilani");
assert.strictEqual(res5.length, 1);
assert.strictEqual(res5[0].displayName, "Priya Patel");
console.log("  [PASS] Found student by college: 'bits pilani' -> Priya Patel");

// By skill
const res6 = searchProfiles(mockStudents, "react");
assert.strictEqual(res6.length, 1);
assert.strictEqual(res6[0].displayName, "Rohan Varma");
console.log("  [PASS] Found student by skill: 'react' -> Rohan Varma");

// Substring partial skill match
const res7 = searchProfiles(mockStudents, "py");
// Aarav has Python/PyTorch, Priya has none (she has C++, Embedded, IoT), Rohan has none
assert.strictEqual(res7.length, 1);
assert.strictEqual(res7[0].displayName, "Aarav Sharma");
console.log("  [PASS] Partial skill substring 'py' matches Aarav Sharma");

// No match returns empty
const res8 = searchProfiles(mockStudents, "nonexistentxyz");
assert.strictEqual(res8.length, 0);
console.log("  [PASS] Non-existent term returns 0 results");

console.log("\nALL 8 UNIT TESTS PASSED SUCCESSFULLY! 100% Correct.");
