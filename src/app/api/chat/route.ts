import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase/config";
import { collection, getDocs } from "firebase/firestore";
import { searchProfiles } from "@/lib/search/searchProfiles";
import { Company, Student } from "@/types";

// ==============================================================================
// CRITICAL SECURITY NOTE:
// process.env.GEMINI_API_KEY is accessed STRICTLY here on the server side.
// It is NEVER imported, passed to, or bundled into any client-side component.
// ==============================================================================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Comprehensive platform system instruction
const SYSTEM_INSTRUCTION = {
  parts: [
    {
      text: `You are the official SkillSwipe AI Assistant for the Academia–Industry Collaboration Platform (SIH206644).
Your primary role is to guide students and company recruiters on using SkillSwipe effectively, exploring AYUSH career pathways, navigating the AYUSH Skills Taxonomy, and finding verified free government and industry courses.

Platform Knowledge & Rules:
1. Mutual-Consent Matching:
   - Matches are NOT cold application spam. A match ONLY happens when BOTH parties swipe right / express mutual interest.
   - When a reciprocal match occurs, a celebratory Wax Seal reveal is displayed and an automated notification email is sent via Resend to both parties.
2. Discover Stack:
   - Presents a card deck of potential matches ordered by a 4-term compatibility scoring formula:
     score = (skillOverlap × 0.5) + (locationOrRemoteMatch × 0.15) + (experienceLevelFit × 0.15) + (industryInterest × 0.2).
   - Drag or use buttons: Left Swipe = Dismiss, Right Swipe = Express Interest.
3. Browse All Directory:
   - A full searchable grid/directory of all companies or students.
   - Allows keyword searching across names, skills, industries, or colleges.
   - Users can directly click "I'm Interested" on any profile in the directory to initiate a mutual match.
4. Profiles & Portfolios:
   - Students have verified academic folios at /profile/[studentId] with attested skills, project dossiers, links, and certificates.
   - Companies have authenticated corporate charters at /company/[companyId] detailing active job/internship openings and learning programs.
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
   - When a user asks to find, search, or recommend companies, roles, or students (e.g. "Find companies hiring for React", "Show me AYUSH startups", "Find QC analyst interns"), you MUST call searchProfiles.

CRITICAL ANTI-HALLUCINATION & SCOPE RULES:
- Never guess or substitute your own general training knowledge about AYUSH careers, syllabus, or online courses. You MUST rely strictly on the data returned by getTrackRequirements and getSkillInfo.
- SCOPE RESTRICTION: You MUST politely decline to answer general knowledge or out-of-scope questions completely unrelated to SkillSwipe, colleges, companies, AYUSH career tracks, skills, courses, or candidate matching (e.g. "what's the weather today?", "What is the capital of France?", "Write a poem about dogs"). Politely explain that you are the SkillSwipe Assistant dedicated exclusively to platform matching, AYUSH career tracks, competencies, and verified course pathways.`,
    },
  ],
};

// Tool definitions for Gemini
const TOOLS = [
  {
    functionDeclarations: [
      {
        name: "searchProfiles",
        description:
          "Search through real registered companies and students on the SkillSwipe platform by skill, company name, industry, or college.",
        parameters: {
          type: "OBJECT",
          properties: {
            query: {
              type: "STRING",
              description:
                "The search query keywords (e.g. 'React', 'Python', 'AI', 'FinTech', 'IIT Bombay').",
            },
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

interface ChatMessage {
  role: "user" | "model";
  content: string;
}

/**
 * Fetch all profiles from Firestore and run the pure searchProfiles function
 */
async function executeSearchProfilesTool(query: string, userRole?: string) {
  try {
    const isCompanyUser = userRole === "company";

    if (isCompanyUser) {
      // Company looking for students
      const studentsSnap = await getDocs(collection(db, "students"));
      const students: Student[] = [];
      studentsSnap.forEach((d) => students.push(d.data() as Student));
      const results = searchProfiles(students, query);

      // Hydrate display names from users collection in parallel
      const hydratedResults = await Promise.all(
        results.slice(0, 5).map(async (s) => {
          let candidateName = s.basicInfo?.college ? `Candidate from ${s.basicInfo.college}` : "Student Candidate";
          try {
            const uSnap = await getDocs(collection(db, "users"));
            uSnap.forEach((docSnap) => {
              if (docSnap.id === s.uid) {
                const uData = docSnap.data();
                candidateName = uData.name || candidateName;
              }
            });
          } catch (e) {
            // Ignore hydration notice
          }

          return {
            type: "student",
            id: s.uid,
            name: candidateName,
            college: s.basicInfo?.college || "University",
            degree: s.basicInfo?.degree || "Student",
            year: s.basicInfo?.year,
            location: s.basicInfo?.location || "India",
            skills: s.skills?.map((sk) => `${sk.name} (${sk.level})`),
            projectsCount: s.projects?.length || 0,
          };
        })
      );

      return hydratedResults;
    } else {
      // Default: Student looking for companies
      const companiesSnap = await getDocs(collection(db, "companies"));
      const companies: Company[] = [];
      companiesSnap.forEach((d) => companies.push(d.data() as Company));
      const results = searchProfiles(companies, query);
      return results.slice(0, 5).map((c) => ({
        type: "company",
        id: c.uid,
        name: c.basicInfo?.name || "Partner Company",
        industry: c.basicInfo?.industry || "Technology",
        location: c.basicInfo?.location || "Remote",
        logoUrl: c.basicInfo?.logoUrl,
        website: c.basicInfo?.website,
        roles: c.openRoles?.map((r) => ({
          title: r.title,
          type: r.type,
          stipend: r.stipend || "Unspecified",
          requiredSkills: r.requiredSkills || [],
        })) || [],
      }));
    }
  } catch (err) {
    console.error("Failed executing searchProfiles tool:", err);
    return [];
  }
}

/**
 * Retrieves target roles, track details, and all calibrated taxonomy skills (with courses)
 * for an AYUSH career track by trackId, track name, or target role title.
 */
async function executeGetTrackRequirementsTool(trackIdOrRole: string) {
  try {
    const rawInput = (trackIdOrRole || "").trim().toLowerCase();

    // 1. Fetch all careerTracks
    const tracksSnap = await getDocs(collection(db, "careerTracks"));
    let matchedDoc: any = null;
    let matchedId = "";

    // Direct ID match check
    tracksSnap.forEach((d) => {
      if (d.id.toLowerCase() === rawInput) {
        matchedDoc = d.data();
        matchedId = d.id;
      }
    });

    // Name or role match check if not matched by ID
    if (!matchedDoc) {
      tracksSnap.forEach((d) => {
        const data = d.data();
        const nameMatch =
          data.name?.toLowerCase().includes(rawInput) ||
          rawInput.includes(data.name?.toLowerCase() || "");
        const roleMatch = (data.targetRoles || []).some((role: string) => {
          const r = role.toLowerCase();
          return r.includes(rawInput) || rawInput.includes(r);
        });
        if (nameMatch || roleMatch) {
          matchedDoc = data;
          matchedId = d.id;
        }
      });
    }

    // Keyword heuristics fallback
    if (!matchedDoc) {
      const keywordMap: Record<string, string> = {
        panchakarma: "wellness-spa-medical-tourism",
        spa: "wellness-spa-medical-tourism",
        tourism: "wellness-spa-medical-tourism",
        hospitality: "wellness-spa-medical-tourism",
        wellness: "wellness-spa-medical-tourism",
        pharma: "ayurvedic-pharma-rd-regulatory",
        qc: "ayurvedic-pharma-rd-regulatory",
        regulatory: "ayurvedic-pharma-rd-regulatory",
        fssai: "ayurvedic-pharma-rd-regulatory",
        formulation: "ayurvedic-pharma-rd-regulatory",
        clinical: "clinical-research-pharmacovigilance",
        pharmacovigilance: "clinical-research-pharmacovigilance",
        trials: "clinical-research-pharmacovigilance",
        cra: "clinical-research-pharmacovigilance",
        yoga: "yoga-naturopathy-corporate-wellness",
        naturopathy: "yoga-naturopathy-corporate-wellness",
        corporate: "yoga-naturopathy-corporate-wellness",
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
      return {
        found: false,
        message: `No specific track found matching "${trackIdOrRole}". Available AYUSH career tracks are: Ayurvedic Pharma, R&D & Regulatory (ayurvedic-pharma-rd-regulatory), Clinical Research & Pharmacovigilance (clinical-research-pharmacovigilance), Wellness, Spa & Medical Tourism (wellness-spa-medical-tourism), and Yoga, Naturopathy & Corporate Wellness (yoga-naturopathy-corporate-wellness).`,
      };
    }

    // 2. Fetch all taxonomy skills for this track
    const skillsSnap = await getDocs(collection(db, "skillsTaxonomy"));
    const trackSkills: any[] = [];
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
      exampleEmployers: matchedDoc.exampleEmployers || [],
      totalSkillsCount: trackSkills.length,
      skills: trackSkills,
    };
  } catch (err) {
    console.error("Failed executing getTrackRequirements tool:", err);
    return { error: "Failed to retrieve career track requirements from database." };
  }
}

/**
 * Looks up a specific skill in skillsTaxonomy by name (fuzzy/partial match)
 * and returns its description and curated course options (Free/Government and Private/Global).
 */
async function executeGetSkillInfoTool(skillName: string) {
  try {
    const rawInput = (skillName || "").trim().toLowerCase();
    const skillsSnap = await getDocs(collection(db, "skillsTaxonomy"));
    const matchedSkills: any[] = [];

    skillsSnap.forEach((d) => {
      const data = d.data();
      const sId = d.id.toLowerCase();
      const sName = (data.name || "").toLowerCase();

      // Check for exact or substring match
      const exactMatch = sId === rawInput || sName === rawInput;
      const containsMatch =
        sName.includes(rawInput) || rawInput.includes(sName) || sId.includes(rawInput);

      // Check for token overlap (e.g. "pharmacovigilance" in "Pharmacovigilance (PV)")
      const tokens = rawInput.split(/[\s,()/-]+/).filter((t) => t.length > 2);
      const tokenMatch = tokens.some((t) => sName.includes(t) || sId.includes(t));

      if (exactMatch || containsMatch || tokenMatch) {
        matchedSkills.push({
          id: d.id,
          name: data.name,
          description: data.description,
          isMicroCredential: !!data.isMicroCredential,
          tracks: data.tracks || [],
          courses: (data.courses || []).map((c: any) => ({
            name: c.name || c.title || "Certification Course",
            provider: c.provider,
            type: c.type, // "free-govt" | "private-global"
            url: c.url,
            tags: c.tags || [],
          })),
        });
      }
    });

    if (matchedSkills.length === 0) {
      return {
        found: false,
        query: skillName,
        message: `No taxonomy skill found matching "${skillName}". Please verify the skill name or browse available AYUSH tracks.`,
      };
    }

    return {
      found: true,
      query: skillName,
      matchedCount: matchedSkills.length,
      skills: matchedSkills,
    };
  } catch (err) {
    console.error("Failed executing getSkillInfo tool:", err);
    return { error: "Failed to retrieve skill information from database." };
  }
}

/**
 * Helper to call Gemini REST API with single retry on 429 rate limit
 */
async function callGemini(payload: any, attempt = 1): Promise<{ ok: boolean; status: number; data: any }> {
  if (!GEMINI_API_KEY) {
    return {
      ok: false,
      status: 500,
      data: { error: "GEMINI_API_KEY is not configured on the server." },
    };
  }

  const url = `${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  // Rate limit handling (HTTP 429)
  if (res.status === 429 && attempt < 2) {
    console.warn("[Gemini API] 429 Rate limited. Waiting 1.5s before retry attempt 2...");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return callGemini(payload, attempt + 1);
  }

  return { ok: res.ok, status: res.status, data };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history = [], userRole = "student" } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "A message string is required." },
        { status: 400 }
      );
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        {
          response:
            "The SkillSwipe AI Assistant is currently in maintenance mode (GEMINI_API_KEY pending). You can still browse and discover opportunities directly!",
        },
        { status: 200 }
      );
    }

    // Format conversation history for Gemini
    const contents: any[] = [];
    if (Array.isArray(history)) {
      history.slice(-6).forEach((h: ChatMessage) => {
        if (h.role === "user" || h.role === "model") {
          contents.push({
            role: h.role,
            parts: [{ text: h.content }],
          });
        }
      });
    }

    // Append current user message
    contents.push({
      role: "user",
      parts: [{ text: message.trim() }],
    });

    // Turn 1: Initial invocation with system instructions and tools
    const initialPayload = {
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: TOOLS,
      contents,
    };

    const turn1 = await callGemini(initialPayload);

    // If Gemini still returned 429 or quota exceeded
    if (turn1.status === 429) {
      return NextResponse.json(
        {
          response:
            "I'm a bit busy right now with high inquiry traffic. Please give me a moment and try asking again shortly!",
          rateLimited: true,
        },
        { status: 200 }
      );
    }

    if (!turn1.ok) {
      console.error("[Gemini API Error]", turn1.status, turn1.data);
      return NextResponse.json(
        {
          response:
            "I encountered a temporary service hiccup. Please try rephrasing your question or check back in a few seconds.",
        },
        { status: 200 }
      );
    }

    const candidate = turn1.data.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    // Check if the model requested any function call
    const functionCallPart = parts.find((p: any) => p.functionCall);

    if (functionCallPart?.functionCall) {
      const { name, args } = functionCallPart.functionCall;
      let toolResultData: any = null;
      let toolDisplaySummary = "";

      if (name === "getTrackRequirements") {
        const trackId = args?.trackId || message;
        toolResultData = await executeGetTrackRequirementsTool(trackId);
        toolDisplaySummary = `Retrieved track requirements for "${toolResultData?.trackName || trackId}"`;
      } else if (name === "getSkillInfo") {
        const skillName = args?.skillName || message;
        toolResultData = await executeGetSkillInfoTool(skillName);
        toolDisplaySummary = `Retrieved skill details for "${skillName}"`;
      } else if (name === "searchProfiles") {
        const query = args?.query || message;
        toolResultData = await executeSearchProfilesTool(query, userRole);
        toolDisplaySummary = `Found ${Array.isArray(toolResultData) ? toolResultData.length : 0} matching profile(s)`;
      } else {
        toolResultData = { error: `Tool ${name} not recognized.` };
      }

      // Turn 2: Feed function response back to Gemini for grounded conversational synthesis
      const followUpContents = [
        ...contents,
        candidate.content,
        {
          role: "user",
          parts: [
            {
              functionResponse: {
                name: name,
                response: toolResultData,
              },
            },
          ],
        },
      ];

      const turn2 = await callGemini({
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: TOOLS,
        contents: followUpContents,
      });

      if (turn2.ok) {
        const textResponse =
          turn2.data.candidates?.[0]?.content?.parts?.find((p: any) => p.text)
            ?.text ||
          "Here is the verified information from the SkillSwipe database:";

        return NextResponse.json({
          response: textResponse,
          toolUsed: name,
          resultsCount: Array.isArray(toolResultData) ? toolResultData.length : 1,
          toolResults: toolResultData,
        });
      } else {
        // If turn2 encountered rate-limiting, provide friendly response with toolResults intact
        return NextResponse.json({
          response: `I retrieved the verified information from the SkillSwipe AYUSH database (${toolDisplaySummary}).`,
          toolUsed: name,
          resultsCount: Array.isArray(toolResultData) ? toolResultData.length : 1,
          toolResults: toolResultData,
        });
      }
    }

    // Direct text response without tool call
    const textPart = parts.find((p: any) => p.text);
    const finalAnswer =
      textPart?.text ||
      "I'm here to help with SkillSwipe! Ask me about swiping, mutual matches, profile completion, or finding companies and candidates.";

    return NextResponse.json({
      response: finalAnswer,
    });
  } catch (err: any) {
    console.error("Error in /api/chat route:", err);
    return NextResponse.json(
      {
        response:
          "I'm experiencing a brief connection error. Please try again in a moment.",
      },
      { status: 500 }
    );
  }
}
