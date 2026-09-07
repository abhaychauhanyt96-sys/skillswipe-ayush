import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  getDocs,
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
  "company_role_test_app_" + Date.now()
);

const db = getFirestore(app);

async function runTests() {
  console.log("==================================================================");
  console.log("TESTING COMPANY ROLE POSTING: CAREER TRACK & TAXONOMY INTEGRATION");
  console.log("==================================================================");

  const timestamp = Date.now();
  const testCompanyId = `test_company_poster_${timestamp}`;

  try {
    // 1. Verify careerTracks available
    console.log("\n[STEP 1] Fetching career tracks from Firestore...");
    const tracksSnap = await getDocs(collection(db, "careerTracks"));
    console.log(`Found ${tracksSnap.size} career tracks in database.`);
    if (tracksSnap.size === 0) {
      throw new Error("No career tracks found in database!");
    }

    // 2. Query skillsTaxonomy for 'ayurvedic-pharma-rd-regulatory'
    console.log("\n[STEP 2] Fetching taxonomy skills for 'ayurvedic-pharma-rd-regulatory'...");
    const taxQuery = query(
      collection(db, "skillsTaxonomy"),
      where("tracks", "array-contains", "ayurvedic-pharma-rd-regulatory")
    );
    const taxSnap = await getDocs(taxQuery);
    console.log(`Found ${taxSnap.size} competencies for track.`);
    if (taxSnap.size === 0) {
      throw new Error("No taxonomy skills found for ayurvedic-pharma-rd-regulatory!");
    }

    // 3. Create initial company profile
    console.log("\n[STEP 3] Initializing test company document in Firestore...");
    const initialCompany = {
      uid: testCompanyId,
      basicInfo: {
        name: "Test AyurBio Labs",
        industry: "Ayurvedic Pharma & Manufacturing",
        location: "Bengaluru",
        website: "https://example-ayurbio.com",
      },
      careerTrack: "ayurvedic-pharma-rd-regulatory",
      openRoles: [],
      learningPrograms: [],
      swipedRight: [],
      swipedLeft: [],
      matches: [],
    };
    await setDoc(doc(db, "companies", testCompanyId), initialCompany);
    console.log(`✓ Initialized company doc: companies/${testCompanyId}`);

    // 4. Test Creating a New Role with Career Track & Taxonomy Skills
    console.log("\n[STEP 4] Testing Creation of New Role with Career Track & Taxonomy Skills...");
    const newRole = {
      id: `role_${timestamp}_1`,
      title: "Quality Control & Regulatory Analyst",
      type: "job",
      careerTrack: "ayurvedic-pharma-rd-regulatory",
      requiredTaxonomySkills: [
        "herbal-standardization-qc",
        "regulatory-compliance-fssai-ayush",
      ],
      requiredSkills: [
        "Herbal Standardization & QC",
        "Regulatory Compliance (FSSAI/AYUSH)",
        "Classical Rasa Shastra", // Custom skill
      ],
      stipend: "₹4.8 LPA",
      location: "Bengaluru",
      isRemote: false,
      description: "Perform high-precision batch standardization and oversee AYUSH Ahar licensing compliance.",
    };

    const compRef = doc(db, "companies", testCompanyId);
    await updateDoc(compRef, {
      openRoles: [newRole],
    });

    // Verify Firestore persistence
    const snapAfterCreate = await getDoc(compRef);
    if (!snapAfterCreate.exists()) throw new Error("Company document not found after role creation!");
    const createdRoles = snapAfterCreate.data().openRoles || [];

    if (createdRoles.length !== 1) {
      throw new Error(`Expected 1 role, found ${createdRoles.length}`);
    }
    const savedRole1 = createdRoles[0];
    console.log("  - Saved Role Title:", savedRole1.title);
    console.log("  - Saved Career Track:", savedRole1.careerTrack);
    console.log("  - Saved requiredTaxonomySkills:", savedRole1.requiredTaxonomySkills);
    console.log("  - Saved requiredSkills:", savedRole1.requiredSkills);

    if (savedRole1.careerTrack !== "ayurvedic-pharma-rd-regulatory") {
      throw new Error(`Expected careerTrack 'ayurvedic-pharma-rd-regulatory', got '${savedRole1.careerTrack}'`);
    }
    if (
      !Array.isArray(savedRole1.requiredTaxonomySkills) ||
      savedRole1.requiredTaxonomySkills.length !== 2 ||
      !savedRole1.requiredTaxonomySkills.includes("herbal-standardization-qc") ||
      !savedRole1.requiredTaxonomySkills.includes("regulatory-compliance-fssai-ayush")
    ) {
      throw new Error("requiredTaxonomySkills did not match expected taxonomy IDs!");
    }
    if (
      !Array.isArray(savedRole1.requiredSkills) ||
      savedRole1.requiredSkills.length !== 3 ||
      !savedRole1.requiredSkills.includes("Classical Rasa Shastra")
    ) {
      throw new Error("requiredSkills did not properly preserve custom skill alongside taxonomy skills!");
    }
    console.log("✓ STEP 4 PASSED: New role successfully created and verified in Firestore.");

    // 5. Test Editing the Existing Role
    console.log("\n[STEP 5] Testing Editing Existing Role (Updating Track, Taxonomy Skills, and Details)...");
    const updatedRole = {
      ...savedRole1,
      title: "Senior Clinical Trials & Safety Specialist",
      careerTrack: "clinical-research-pharmacovigilance",
      requiredTaxonomySkills: [
        "good-clinical-practice-gcp",
        "pharmacovigilance-pv",
        "biostatistics-data-management",
      ],
      requiredSkills: [
        "Good Clinical Practice (GCP)",
        "Pharmacovigilance (PV)",
        "Biostatistics & Data Management",
        "Clinical EDC Platforms", // Custom skill
      ],
      stipend: "₹6.5 LPA",
      isRemote: true,
      description: "Manage multicentric clinical trials and adverse reaction databases for herbal therapeutics.",
    };

    await updateDoc(compRef, {
      openRoles: [updatedRole],
    });

    // Verify Firestore persistence after update
    const snapAfterEdit = await getDoc(compRef);
    const editedRoles = snapAfterEdit.data().openRoles || [];
    if (editedRoles.length !== 1) {
      throw new Error(`Expected 1 role after edit, found ${editedRoles.length}`);
    }
    const savedRoleEdited = editedRoles[0];
    console.log("  - Updated Role Title:", savedRoleEdited.title);
    console.log("  - Updated Career Track:", savedRoleEdited.careerTrack);
    console.log("  - Updated requiredTaxonomySkills:", savedRoleEdited.requiredTaxonomySkills);
    console.log("  - Updated requiredSkills:", savedRoleEdited.requiredSkills);
    console.log("  - Updated Stipend:", savedRoleEdited.stipend);
    console.log("  - Updated isRemote:", savedRoleEdited.isRemote);

    if (savedRoleEdited.title !== "Senior Clinical Trials & Safety Specialist") {
      throw new Error("Role title was not updated!");
    }
    if (savedRoleEdited.careerTrack !== "clinical-research-pharmacovigilance") {
      throw new Error("Career track was not updated to clinical-research-pharmacovigilance!");
    }
    if (
      !Array.isArray(savedRoleEdited.requiredTaxonomySkills) ||
      savedRoleEdited.requiredTaxonomySkills.length !== 3 ||
      !savedRoleEdited.requiredTaxonomySkills.includes("good-clinical-practice-gcp")
    ) {
      throw new Error("requiredTaxonomySkills was not properly updated!");
    }
    if (
      !Array.isArray(savedRoleEdited.requiredSkills) ||
      savedRoleEdited.requiredSkills.length !== 4 ||
      !savedRoleEdited.requiredSkills.includes("Clinical EDC Platforms")
    ) {
      throw new Error("requiredSkills was not properly updated with custom skill!");
    }
    if (savedRoleEdited.isRemote !== true) {
      throw new Error("isRemote was not updated to true!");
    }
    console.log("✓ STEP 5 PASSED: Existing role successfully edited and verified in Firestore.");
  } finally {
    // 6. Cleanup
    console.log("\n[CLEANUP] Deleting test company document...");
    await deleteDoc(doc(db, "companies", testCompanyId));
    console.log("✓ Cleanup complete.");
  }

  console.log("\n==================================================================");
  console.log("ALL ROLE POSTING & EDITING TESTS PASSED SUCCESSFULLY! 🎉");
  console.log("==================================================================");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
