import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import fs from "fs";
import path from "path";

// Read .env.local
const envContent = fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const clean = line.trim();
  if (clean && !clean.startsWith("#") && clean.includes("=")) {
    const idx = clean.indexOf("=");
    const key = clean.substring(0, idx).trim();
    let val = clean.substring(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[key] = val;
  }
});

const app = initializeApp(
  {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  },
  "onboarding_test_app_" + Date.now()
);

const db = getFirestore(app);

async function runTests() {
  console.log("================================================================");
  console.log("TESTING STUDENT ONBOARDING: CAREER TRACKS & TAXONOMY SELECTION");
  console.log("================================================================");

  // 1. Verify careerTracks in Firestore
  console.log("\n[TEST 1] Fetching careerTracks collection from Firestore...");
  const tracksSnap = await getDocs(collection(db, "careerTracks"));
  console.log(`Found ${tracksSnap.size} career tracks:`);
  tracksSnap.forEach((d) => {
    const data = d.data();
    console.log(`  - [${d.id}] ${data.name} (Roles: ${(data.targetRoles || []).join(", ")})`);
  });
  if (tracksSnap.size !== 4) {
    throw new Error(`Expected 4 career tracks, but found ${tracksSnap.size}`);
  }
  console.log("✓ TEST 1 PASSED: All 4 career tracks available.");

  // 2. Verify skillsTaxonomy filtered by track
  console.log("\n[TEST 2] Querying skillsTaxonomy for 'ayurvedic-pharma-rd-regulatory'...");
  const taxonomyQuery = query(
    collection(db, "skillsTaxonomy"),
    where("tracks", "array-contains", "ayurvedic-pharma-rd-regulatory")
  );
  const taxSnap = await getDocs(taxonomyQuery);
  console.log(`Found ${taxSnap.size} taxonomy skills for track 'ayurvedic-pharma-rd-regulatory':`);
  taxSnap.forEach((d) => {
    const data = d.data();
    console.log(`  - [${d.id}] ${data.name} (micro: ${!!data.isMicroCredential})`);
  });
  if (taxSnap.size === 0) {
    throw new Error("Expected taxonomy skills for ayurvedic-pharma-rd-regulatory, but found 0");
  }
  console.log("✓ TEST 2 PASSED: Taxonomy skills queried successfully.");

  const timestamp = Date.now();
  const testStudentAId = `test_student_track_selected_${timestamp}`;
  const testStudentBId = `test_student_still_exploring_${timestamp}`;

  try {
    // 3. Test Path A: Track Selected (Ayurvedic Pharma track + taxonomy skills + custom skill)
    console.log("\n[TEST 3] Testing Path A: Track Selected Student Profile...");
    const studentAPayload = {
      uid: testStudentAId,
      basicInfo: {
        college: "National Institute of Ayurveda, Jaipur",
        degree: "BAMS (Bachelor of Ayurvedic Medicine & Surgery)",
        year: "2026",
        location: "Jaipur, Rajasthan",
      },
      selectedTrack: "ayurvedic-pharma-rd-regulatory",
      taxonomySkills: [
        { skillId: "herbal-standardization-qc", proficiencyLevel: "expert" },
        { skillId: "regulatory-compliance-fssai-ayush", proficiencyLevel: "intermediate" },
      ],
      skills: [
        { name: "Herbal Standardization & QC", level: "expert", verified: false },
        { name: "Regulatory Compliance (FSSAI/AYUSH)", level: "intermediate", verified: false },
        { name: "Ayurvedic Classical Formulation", level: "intermediate", verified: false },
      ],
      projects: [
        {
          title: "HPTLC Fingerprinting of Triphala Churna Batches",
          description: "Quantified biomarker concentrations across commercial and lab-prepared formulations.",
          techStack: ["HPTLC", "HPLC", "Quality Control"],
        },
      ],
      links: {
        linkedin: "https://linkedin.com/in/test-ayush-scholar",
        github: "",
        portfolio: "",
      },
      certificates: [],
      interestedIndustries: ["Ayurvedic Pharma & Manufacturing"],
      swipedRight: [],
      swipedLeft: [],
      matches: [],
    };

    await setDoc(doc(db, "students", testStudentAId), studentAPayload);
    const snapA = await getDoc(doc(db, "students", testStudentAId));
    if (!snapA.exists()) throw new Error("Student A document not found after save!");
    const dataA = snapA.data();

    if (dataA.selectedTrack !== "ayurvedic-pharma-rd-regulatory") {
      throw new Error(`Expected selectedTrack 'ayurvedic-pharma-rd-regulatory', got '${dataA.selectedTrack}'`);
    }
    if (!Array.isArray(dataA.taxonomySkills) || dataA.taxonomySkills.length !== 2) {
      throw new Error(`Expected 2 taxonomySkills, got ${JSON.stringify(dataA.taxonomySkills)}`);
    }
    if (dataA.taxonomySkills[0].skillId !== "herbal-standardization-qc") {
      throw new Error(`Expected first taxonomy skillId 'herbal-standardization-qc'`);
    }
    if (!Array.isArray(dataA.skills) || dataA.skills.length !== 3) {
      throw new Error(`Expected 3 total skills (2 taxonomy + 1 custom), got ${dataA.skills.length}`);
    }
    console.log("  - Successfully saved Student A with selectedTrack:", dataA.selectedTrack);
    console.log("  - taxonomySkills count:", dataA.taxonomySkills.length);
    console.log("  - Unified skills count:", dataA.skills.length);
    console.log("✓ TEST 3 PASSED: Track Selected profile saved and verified.");

    // 4. Test Path B: Still Exploring Student Profile
    console.log("\n[TEST 4] Testing Path B: 'Still exploring' Student Profile...");
    const studentBPayload = {
      uid: testStudentBId,
      basicInfo: {
        college: "Government Ayurveda College, Thiruvananthapuram",
        degree: "BAMS",
        year: "2027",
        location: "Kollam, Kerala",
      },
      selectedTrack: null, // Still exploring
      taxonomySkills: [],
      skills: [
        { name: "Panchakarma Procedures", level: "intermediate", verified: false },
        { name: "Pulse Diagnosis (Nadi Pariksha)", level: "intermediate", verified: false },
      ],
      projects: [],
      links: {
        linkedin: "",
        github: "",
        portfolio: "",
      },
      certificates: [],
      interestedIndustries: ["Wellness, Spa & Medical Tourism", "Clinical Research (CRO)"],
      swipedRight: [],
      swipedLeft: [],
      matches: [],
    };

    await setDoc(doc(db, "students", testStudentBId), studentBPayload);
    const snapB = await getDoc(doc(db, "students", testStudentBId));
    if (!snapB.exists()) throw new Error("Student B document not found after save!");
    const dataB = snapB.data();

    if (dataB.selectedTrack !== null) {
      throw new Error(`Expected selectedTrack to be null for exploring student, got '${dataB.selectedTrack}'`);
    }
    if (!Array.isArray(dataB.taxonomySkills) || dataB.taxonomySkills.length !== 0) {
      throw new Error(`Expected 0 taxonomySkills, got ${dataB.taxonomySkills.length}`);
    }
    if (!Array.isArray(dataB.skills) || dataB.skills.length !== 2) {
      throw new Error(`Expected 2 free-text skills, got ${dataB.skills.length}`);
    }
    console.log("  - Successfully saved Student B with selectedTrack: null (Still exploring)");
    console.log("  - taxonomySkills count:", dataB.taxonomySkills.length);
    console.log("  - Free-text skills count:", dataB.skills.length);
    console.log("✓ TEST 4 PASSED: Still Exploring profile saved and verified.");

    // 5. Test Matching Score Integration with AYUSH Companies
    console.log("\n[TEST 5] Testing compatibility score calculation for Student A...");
    const companySnap = await getDoc(doc(db, "companies", "ayush-amrutdhara-herbals"));
    if (companySnap.exists()) {
      const companyData = companySnap.data();
      const role = companyData.openRoles[0]; // QC Analyst requiring Herbal Standardization & QC and Regulatory Compliance
      console.log(`  - Matching against company: ${companyData.basicInfo.name}`);
      console.log(`  - Target Role: ${role.title}`);
      console.log(`  - Role Required Skills: ${role.requiredSkills.join(", ")}`);

      // Scoring formula calculation
      const studentSkillsRecord = {};
      dataA.skills.forEach((s) => {
        const weight = s.level === "expert" ? 1.0 : s.level === "intermediate" ? 0.75 : 0.5;
        studentSkillsRecord[s.name.toLowerCase().trim()] = weight;
      });

      let matchedSkillWeightSum = 0;
      const matchedSkills = [];
      role.requiredSkills.forEach((req) => {
        const cleanReq = req.toLowerCase().trim();
        for (const sName of Object.keys(studentSkillsRecord)) {
          if (sName === cleanReq || sName.includes(cleanReq) || cleanReq.includes(sName)) {
            matchedSkillWeightSum += studentSkillsRecord[sName];
            matchedSkills.push(req);
            break;
          }
        }
      });

      const skillOverlapRaw = Math.min(1.0, matchedSkillWeightSum / role.requiredSkills.length);
      const skillOverlapScore = Math.round(skillOverlapRaw * 50 * 10) / 10;
      const industryMatchScore = dataA.interestedIndustries.includes(companyData.basicInfo.industry) ? 20 : 0;
      const totalScore = skillOverlapScore + industryMatchScore; // basic partial score

      console.log(`  - Matched Skills: ${matchedSkills.join(", ")}`);
      console.log(`  - Skill Overlap Score: ${skillOverlapScore} / 50`);
      console.log(`  - Industry Match Score: ${industryMatchScore} / 20`);
      console.log(`  - Estimated Compatibility: ${totalScore}%`);

      if (matchedSkills.length !== 2) {
        throw new Error(`Expected 2 matched skills, but got ${matchedSkills.length}`);
      }
      console.log("✓ TEST 5 PASSED: Synchronized taxonomy skills matched AYUSH company role with 100% precision.");
    } else {
      console.log("  [Notice] Company 'ayush-amrutdhara-herbals' doc not found, skipping matching check.");
    }
  } finally {
    // Clean up test documents
    console.log("\n[CLEANUP] Removing test student documents...");
    await deleteDoc(doc(db, "students", testStudentAId));
    await deleteDoc(doc(db, "students", testStudentBId));
    console.log("✓ Cleanup complete.");
  }

  console.log("\n================================================================");
  console.log("ALL ONBOARDING TRACKS & TAXONOMY TESTS PASSED SUCCESSFULLY! 🎉");
  console.log("================================================================");
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
