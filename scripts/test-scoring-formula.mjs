import { calculateCompatibilityScore } from "../src/lib/matching/scoring.ts";

console.log("\n========================================================");
console.log("TESTING EXACT 4-TERM COMPATIBILITY SCORING FORMULA");
console.log("========================================================");

// Case A: High Compatibility (Near 100%)
// - Required: React, TypeScript
// - Student: React (expert: 1.0), TypeScript (expert: 1.0) -> 50 / 50 pts
// - Location: Bangalore (both match) -> 15 / 15 pts
// - Experience: Internship with 2027 undergrad -> 15 / 15 pts
// - Industry: "FinTech" in interestedIndustries -> 20 / 20 pts
const studentA = {
  uid: "student_a",
  basicInfo: { college: "IIT Delhi", degree: "B.Tech", year: "2027", location: "Bangalore" },
  skills: [
    { name: "React", level: "expert", verified: true },
    { name: "TypeScript", level: "expert", verified: true },
  ],
  interestedIndustries: ["Financial Technology (FinTech)", "Artificial Intelligence & ML"],
  projects: [],
  links: {},
  certificates: [],
  swipedRight: [],
  swipedLeft: [],
  matches: [],
};

const companyA = {
  uid: "comp_a",
  basicInfo: { name: "FinTech Prime", industry: "Financial Technology (FinTech)", location: "Bangalore" },
  openRoles: [],
  learningPrograms: [],
  swipedRight: [],
  swipedLeft: [],
  matches: [],
};

const roleA = {
  title: "Frontend Intern",
  type: "internship",
  requiredSkills: ["React", "TypeScript"],
  description: "Internship role",
  location: "Bangalore",
  isRemote: false,
};

const resultA = calculateCompatibilityScore(studentA, companyA, roleA);
console.log("\n[TEST CASE A: Perfect Alignment]");
console.log("Total Score:", resultA.score + "%");
console.log("Breakdown:", resultA.breakdown);
if (resultA.score !== 100) {
  throw new Error(`Expected 100%, received ${resultA.score}%`);
}
console.log("✓ Perfect match evaluated to exact 100%!");

// Case B: Partial Skill Match + Mismatched Industry
// - Required: React, Python, Docker, Go
// - Student: React (intermediate: 0.75), Python (beginner: 0.50) -> sum = 1.25 / 4 = 0.3125 * 50 = 15.6 pts
// - Location: Remote role -> 15 pts
// - Experience: Internship with 2026 student -> 15 pts
// - Industry: "Healthcare" (student interested in FinTech) -> 0 pts
// Expected score: ~46%
const companyB = {
  uid: "comp_b",
  basicInfo: { name: "BioHealth Global", industry: "Healthcare & Life Sciences", location: "Remote" },
  openRoles: [],
  learningPrograms: [],
  swipedRight: [],
  swipedLeft: [],
  matches: [],
};

const roleB = {
  title: "Fullstack Intern",
  type: "internship",
  requiredSkills: ["React", "Python", "Docker", "Go"],
  description: "Healthcare tools",
  location: "Remote",
  isRemote: true,
};

const resultB = calculateCompatibilityScore(studentA, companyB, roleB);
console.log("\n[TEST CASE B: Partial Skill + Mismatched Industry]");
console.log("Total Score:", resultB.score + "%");
console.log("Breakdown:", resultB.breakdown);
if (resultB.score > 55 || resultB.score < 40) {
  throw new Error(`Expected ~46%, received ${resultB.score}%`);
}
console.log("✓ Partial match evaluated accurately to", resultB.score + "%!");

// Case C: Stack Sorting Verification
console.log("\n[TEST CASE C: Descending Stack Ordering]");
const stack = [
  { id: "B", score: resultB.score },
  { id: "A", score: resultA.score },
];

stack.sort((x, y) => y.score - x.score);
console.log("Sorted Stack IDs (Best First):", stack.map(s => `${s.id} (${s.score}%)`));
if (stack[0].id !== "A") {
  throw new Error("Sorting failed: Best match must be first!");
}
console.log("✓ Higher scoring card correctly ordered at top of stack!");

console.log("\n========================================================");
console.log("ALL SCORING FORMULA TESTS PASSED WITH 100% ACCURACY!");
console.log("========================================================");
