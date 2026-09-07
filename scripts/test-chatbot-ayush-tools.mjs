// scripts/test-chatbot-ayush-tools.mjs
// Automated verification script for SkillSwipe Chatbot AYUSH Tools & Anti-Hallucination Guardrails
// Tests:
// 1. "what skills do I need to become a Panchakarma Operations Manager" -> getTrackRequirements
// 2. "how do I learn pharmacovigilance for free" -> getSkillInfo
// 3. "what's the weather today" -> Out-of-scope redirection (no tool call)

import fs from "node:fs";
import path from "node:path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// 1. Load API Key
const envContent = fs.readFileSync(".env.local", "utf8");
const match = envContent.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)/);
if (!match || !match[1]) {
  console.error("❌ GEMINI_API_KEY not found in .env.local");
  process.exit(1);
}
const apiKey = match[1];

// 2. Initialize Firestore
const serviceAccountPath = path.resolve("./serviceAccountKey.json");
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

// 3. System Instruction & Tools (Matching route.ts)
const systemInstruction = {
  parts: [
    {
      text: `You are the official SkillSwipe AI Assistant for the Academia–Industry Collaboration Platform (SIH206644).
Your primary role is to guide students and company recruiters on using SkillSwipe effectively, exploring AYUSH career pathways, navigating the AYUSH Skills Taxonomy, and finding verified free government and industry courses.

Platform Knowledge & Rules:
1. Mutual-Consent Matching: Matches ONLY happen when BOTH parties swipe right / express mutual interest.
2. Discover Stack: 4-term compatibility scoring formula.
3. Browse All Directory: Full searchable grid.
4. Profiles & Portfolios: Attested student dossiers and corporate charters.
5. AYUSH Career Tracks & Skill Gap Reports:
   - 4 Curated Career Tracks:
     a) Ayurvedic Pharma, R&D & Regulatory (id: 'ayurvedic-pharma-rd-regulatory')
     b) Clinical Research & Pharmacovigilance (id: 'clinical-research-pharmacovigilance')
     c) Wellness, Spa & Medical Tourism (id: 'wellness-spa-medical-tourism')
     d) Yoga, Naturopathy & Corporate Wellness (id: 'yoga-naturopathy-corporate-wellness')
   - Students can view their personalized syllabus coverage, missing competencies, fast-track micro-credentials (1-4 weeks), and free government courses at /dashboard/student/skill-gap.

TOOL USAGE MANDATES (CRITICAL - ALWAYS USE TOOLS OVER INTERNAL MEMORY):
1. getTrackRequirements(trackId):
   - When a user asks what skills, competencies, or requirements are needed for an AYUSH role or career track (e.g. "what skills do I need to become a Panchakarma Operations Manager?", "What are the requirements for Clinical Research?", "What skills do I need for QC Analyst?"), you MUST call getTrackRequirements with the relevant track ID or role name.
   - DO NOT answer from general knowledge. This platform's AYUSH skill and course data is specific and verified. Never guess or substitute your own general knowledge about AYUSH careers.
   - Present the official track name, target roles, required competencies, whether each is a micro-credential (1-4 weeks), and course pathways returned by the tool.

2. getSkillInfo(skillName):
   - When a user asks how to learn a specific skill, what courses are available, or what courses are free / government-certified (e.g. "how do I learn pharmacovigilance for free?", "Where can I get certified in GACP?"), you MUST call getSkillInfo with the skill name.
   - DO NOT invent courses or substitute generic links. Present the exact course providers (e.g. CCRAS, NCC-PvPI / IPC / WHO, FSSAI FoSTaC), course type (Free/Government vs Private/Global), URLs, and tags (#FreeEnrollment, #GovtCertified) returned by getSkillInfo.

3. searchProfiles(query):
   - When a user asks to find, search, or recommend companies, roles, or students, you MUST call searchProfiles.

CRITICAL ANTI-HALLUCINATION & SCOPE RULES:
- Never guess or substitute your own general training knowledge about AYUSH careers, syllabus, or online courses. You MUST rely strictly on the data returned by getTrackRequirements and getSkillInfo.
- SCOPE RESTRICTION: You MUST politely decline to answer general knowledge or out-of-scope questions completely unrelated to SkillSwipe, colleges, companies, AYUSH career tracks, skills, courses, or candidate matching (e.g. "what's the weather today?", "What is the capital of France?", "Write a poem about dogs"). Politely explain that you are the SkillSwipe Assistant dedicated exclusively to platform matching, AYUSH career tracks, competencies, and verified course pathways.`,
    },
  ],
};

const tools = [
  {
    functionDeclarations: [
      {
        name: "searchProfiles",
        description:
          "Search through real registered companies and students on the SkillSwipe platform by skill, company name, industry, or college.",
        parameters: {
          type: "OBJECT",
          properties: {
            query: { type: "STRING", description: "The search query keywords." },
          },
          required: ["query"],
        },
      },
      {
        name: "getTrackRequirements",
        description:
          "Retrieve the official target roles and required taxonomy competencies (with course options, certifications, and micro-credentials) for an AYUSH career track or role. You MUST call this whenever a user asks what skills are needed for an AYUSH role or career track (e.g. Panchakarma Operations Manager, QC Analyst, Clinical Research, Medical Tourism).",
        parameters: {
          type: "OBJECT",
          properties: {
            trackId: {
              type: "STRING",
              description:
                "The AYUSH career track ID ('ayurvedic-pharma-rd-regulatory', 'clinical-research-pharmacovigilance', 'wellness-spa-medical-tourism', 'yoga-naturopathy-corporate-wellness') OR the specific target role/track name.",
            },
          },
          required: ["trackId"],
        },
      },
      {
        name: "getSkillInfo",
        description:
          "Look up a specific AYUSH skill in the platform's skills taxonomy by name or keyword. Returns the official description, micro-credential status, and curated course options (Free/Government and Private/Global). You MUST call this whenever a user asks how to learn an AYUSH skill, asks what courses exist, or asks for free certifications.",
        parameters: {
          type: "OBJECT",
          properties: {
            skillName: {
              type: "STRING",
              description:
                "The name or keyword of the AYUSH skill (e.g. 'Pharmacovigilance', 'Herbal Standardization', 'GACP', 'Panchakarma', 'NABH', 'Clinical Trials').",
            },
          },
          required: ["skillName"],
        },
      },
    ],
  },
];

// Tool Implementation against Firestore
async function executeGetTrackRequirements(trackIdOrRole) {
  const rawInput = (trackIdOrRole || "").trim().toLowerCase();
  const tracksSnap = await db.collection("careerTracks").get();
  let matchedDoc = null;
  let matchedId = "";

  tracksSnap.forEach((d) => {
    if (d.id.toLowerCase() === rawInput) {
      matchedDoc = d.data();
      matchedId = d.id;
    }
  });

  if (!matchedDoc) {
    tracksSnap.forEach((d) => {
      const data = d.data();
      const nameMatch =
        data.name?.toLowerCase().includes(rawInput) ||
        rawInput.includes(data.name?.toLowerCase() || "");
      const roleMatch = (data.targetRoles || []).some((role) => {
        const r = role.toLowerCase();
        return r.includes(rawInput) || rawInput.includes(r);
      });
      if (nameMatch || roleMatch) {
        matchedDoc = data;
        matchedId = d.id;
      }
    });
  }

  if (!matchedDoc) {
    const keywordMap = {
      panchakarma: "wellness-spa-medical-tourism",
      spa: "wellness-spa-medical-tourism",
      tourism: "wellness-spa-medical-tourism",
      hospitality: "wellness-spa-medical-tourism",
      wellness: "wellness-spa-medical-tourism",
      pharma: "ayurvedic-pharma-rd-regulatory",
      qc: "ayurvedic-pharma-rd-regulatory",
      regulatory: "ayurvedic-pharma-rd-regulatory",
      clinical: "clinical-research-pharmacovigilance",
      pharmacovigilance: "clinical-research-pharmacovigilance",
      yoga: "yoga-naturopathy-corporate-wellness",
    };
    for (const [kw, targetTrackId] of Object.entries(keywordMap)) {
      if (rawInput.includes(kw)) {
        tracksSnap.forEach((d) => {
          if (d.id === targetTrackId) {
            matchedDoc = d.data();
            matchedId = d.id;
          }
        });
        if (matchedDoc) break;
      }
    }
  }

  if (!matchedDoc) {
    return { found: false, message: `Track not found for "${trackIdOrRole}"` };
  }

  const skillsSnap = await db.collection("skillsTaxonomy").get();
  const trackSkills = [];
  skillsSnap.forEach((d) => {
    const sData = d.data();
    if (Array.isArray(sData.tracks) && sData.tracks.includes(matchedId)) {
      trackSkills.push({
        id: d.id,
        name: sData.name,
        description: sData.description,
        isMicroCredential: !!sData.isMicroCredential,
        courses: sData.courses || [],
      });
    }
  });

  return {
    found: true,
    trackId: matchedId,
    trackName: matchedDoc.name,
    idealFor: matchedDoc.idealFor,
    targetRoles: matchedDoc.targetRoles || [],
    totalSkillsCount: trackSkills.length,
    skills: trackSkills,
  };
}

async function executeGetSkillInfo(skillName) {
  const rawInput = (skillName || "").trim().toLowerCase();
  const skillsSnap = await db.collection("skillsTaxonomy").get();
  const matchedSkills = [];

  skillsSnap.forEach((d) => {
    const data = d.data();
    const sId = d.id.toLowerCase();
    const sName = (data.name || "").toLowerCase();

    const exactMatch = sId === rawInput || sName === rawInput;
    const containsMatch =
      sName.includes(rawInput) || rawInput.includes(sName) || sId.includes(rawInput);
    const tokens = rawInput.split(/[\s,()/-]+/).filter((t) => t.length > 2);
    const tokenMatch = tokens.some((t) => sName.includes(t) || sId.includes(t));

    if (exactMatch || containsMatch || tokenMatch) {
      matchedSkills.push({
        id: d.id,
        name: data.name,
        description: data.description,
        isMicroCredential: !!data.isMicroCredential,
        tracks: data.tracks || [],
        courses: (data.courses || []).map((c) => ({
          name: c.name || c.title || "Certification Course",
          provider: c.provider,
          type: c.type,
          url: c.url,
          tags: c.tags || [],
        })),
      });
    }
  });

  if (matchedSkills.length === 0) {
    return { found: false, query: skillName };
  }

  return {
    found: true,
    query: skillName,
    matchedCount: matchedSkills.length,
    skills: matchedSkills,
  };
}

// Helper to invoke Gemini
async function askGemini(userPrompt) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

  // Turn 1
  const turn1Res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction,
      tools,
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    }),
  });

  const turn1Data = await turn1Res.json();
  const candidate = turn1Data.candidates?.[0];
  const functionCall = candidate?.content?.parts?.find((p) => p.functionCall)?.functionCall;

  if (!functionCall) {
    const directText = candidate?.content?.parts?.find((p) => p.text)?.text;
    return {
      toolCalled: null,
      response: directText || "No response received.",
    };
  }

  // Execute Tool
  let toolResult = null;
  if (functionCall.name === "getTrackRequirements") {
    toolResult = await executeGetTrackRequirements(functionCall.args?.trackId);
  } else if (functionCall.name === "getSkillInfo") {
    toolResult = await executeGetSkillInfo(functionCall.args?.skillName);
  } else {
    toolResult = { error: "Unknown tool" };
  }

  // Turn 2
  const turn2Res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction,
      tools,
      contents: [
        { role: "user", parts: [{ text: userPrompt }] },
        candidate.content,
        {
          role: "user",
          parts: [
            {
              functionResponse: {
                name: functionCall.name,
                response: toolResult,
              },
            },
          ],
        },
      ],
    }),
  });

  const turn2Data = await turn2Res.json();
  const finalAnswer =
    turn2Data.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text || "No text generated.";

  return {
    toolCalled: functionCall.name,
    toolArgs: functionCall.args,
    toolResult,
    response: finalAnswer,
  };
}

async function runChatbotTests() {
  console.log("=================================================================");
  console.log("🤖 SKILLSWIPE AI CHATBOT AYUSH TOOLS & ANTI-HALLUCINATION TEST SUITE");
  console.log("=================================================================\n");

  // TEST 1
  console.log("-----------------------------------------------------------------");
  console.log("TEST 1: 'what skills do I need to become a Panchakarma Operations Manager'");
  console.log("-----------------------------------------------------------------");
  const test1 = await askGemini("what skills do I need to become a Panchakarma Operations Manager");
  console.log(`Tool Called: ${test1.toolCalled} (${JSON.stringify(test1.toolArgs)})`);
  console.log("\n[Actual Response from Gemini]:");
  console.log(test1.response);
  console.log("\n");

  if (test1.toolCalled !== "getTrackRequirements") {
    throw new Error(`Test 1 Failed: Expected getTrackRequirements, got ${test1.toolCalled}`);
  }

  // TEST 2
  console.log("-----------------------------------------------------------------");
  console.log("TEST 2: 'how do I learn pharmacovigilance for free'");
  console.log("-----------------------------------------------------------------");
  const test2 = await askGemini("how do I learn pharmacovigilance for free");
  console.log(`Tool Called: ${test2.toolCalled} (${JSON.stringify(test2.toolArgs)})`);
  console.log("\n[Actual Response from Gemini]:");
  console.log(test2.response);
  console.log("\n");

  if (test2.toolCalled !== "getSkillInfo") {
    throw new Error(`Test 2 Failed: Expected getSkillInfo, got ${test2.toolCalled}`);
  }

  // TEST 3
  console.log("-----------------------------------------------------------------");
  console.log("TEST 3: 'what\\'s the weather today' (Out of scope check)");
  console.log("-----------------------------------------------------------------");
  const test3 = await askGemini("what's the weather today");
  console.log(`Tool Called: ${test3.toolCalled || "None (Direct Text Response)"}`);
  console.log("\n[Actual Response from Gemini]:");
  console.log(test3.response);
  console.log("\n");

  if (test3.toolCalled !== null) {
    throw new Error(`Test 3 Failed: Expected NO tool call for weather, but got ${test3.toolCalled}`);
  }

  console.log("=================================================================");
  console.log("🎉 ALL 3 CHATBOT AYUSH TOOL TESTS PASSED SUCCESSFULLY!");
  console.log("=================================================================");
}

runChatbotTests().catch((err) => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});
