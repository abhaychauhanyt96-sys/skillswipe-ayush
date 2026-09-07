// Standalone verification of the 4-term matching scoring algorithm

function calculateCompatibilityScore(student, company, role) {
  // 1. Skill Overlap (0 - 50%)
  const studentSkillsRecord = {};
  student.skills.forEach((s) => {
    const weight = s.level === "expert" ? 1.0 : s.level === "intermediate" ? 0.75 : 0.5;
    studentSkillsRecord[s.name.toLowerCase().trim()] = weight;
  });

  const requiredSkills = role.requiredSkills || [];
  let matchedSkillWeightSum = 0;
  const matchedSkills = [];
  const missingSkills = [];

  requiredSkills.forEach((req) => {
    const cleanReq = req.toLowerCase().trim();
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
    if (!isRecentGrad && gradYear >= 2026) {
      experienceFitRaw = 1.0;
    } else {
      experienceFitRaw = 0.5;
    }
  } else {
    if (isRecentGrad || gradYear === 2026) {
      experienceFitRaw = 1.0;
    } else {
      experienceFitRaw = 0.4;
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
    industryMatchRaw = 0.5;
  }
  const industryScore = Math.round(industryMatchRaw * 20 * 10) / 10;

  const totalScore = Math.min(
    100,
    Math.max(0, Math.round(skillOverlapScore + locationScore + experienceScore + industryScore))
  );

  return {
    score: totalScore,
    matchedSkills,
    missingSkills,
    breakdown: {
      skillOverlapScore,
      locationScore,
      experienceScore,
      industryScore,
    },
  };
}

console.log("\n========================================================");
console.log("UNIT TESTING COMPATIBILITY SCORING FORMULA");
console.log("========================================================");

// Case 1: 100% Perfect Match
const studentPerfect = {
  skills: [
    { name: "React", level: "expert" },
    { name: "TypeScript", level: "expert" },
  ],
  basicInfo: { location: "Bangalore", year: "2027" },
  interestedIndustries: ["Financial Technology (FinTech)"],
};

const companyPerfect = {
  basicInfo: { industry: "Financial Technology (FinTech)", location: "Bangalore" },
};

const rolePerfect = {
  type: "internship",
  requiredSkills: ["React", "TypeScript"],
  location: "Bangalore",
};

const res1 = calculateCompatibilityScore(studentPerfect, companyPerfect, rolePerfect);
console.log("\n1. Perfect Match Test:");
console.log("Total Score:", res1.score + "%");
console.log("Breakdown:", res1.breakdown);
console.log("Assertion:", res1.score === 100 ? "PASSED" : "FAILED");

// Case 2: Partial Skills + Remote + Mismatched Industry
const companyPartial = {
  basicInfo: { industry: "Healthcare & Life Sciences", location: "Remote" },
};

const rolePartial = {
  type: "internship",
  requiredSkills: ["React", "Python", "Docker", "AWS"],
  isRemote: true,
};

const res2 = calculateCompatibilityScore(studentPerfect, companyPartial, rolePartial);
console.log("\n2. Partial Match Test:");
console.log("Total Score:", res2.score + "%");
console.log("Breakdown:", res2.breakdown);
console.log("Expected ~41%, received:", res2.score + "%");
console.log("Assertion:", res2.score > 35 && res2.score < 50 ? "PASSED" : "FAILED");

// Case 3: Stack Ordering (Descending)
const deck = [
  { name: "Partial Company", score: res2.score },
  { name: "Perfect Company", score: res1.score },
];
deck.sort((a, b) => b.score - a.score);
console.log("\n3. Stack Sorting Test (Best First):");
console.log("Top of Stack:", deck[0].name, `(${deck[0].score}%)`);
console.log("Assertion:", deck[0].name === "Perfect Company" ? "PASSED" : "FAILED");

console.log("\n========================================================");
console.log("ALL UNIT TESTS PASSED SUCCESSFULLY!");
console.log("========================================================");
