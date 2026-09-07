import fs from "node:fs";

const envContent = fs.readFileSync(".env.local", "utf8");
const match = envContent.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)/);
const apiKey = match[1];

async function testFullToolFlow() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

  const systemInstruction = {
    parts: [
      {
        text: `You are the official SkillSwipe AI Assistant for an Academia–Industry Collaboration Platform.
You help students and companies understand how the platform works:
- Mutual-consent matching: a match ONLY happens when BOTH a student and a company express interest (swipe right).
- Discover Stack: shows ranked opportunity cards using a 4-term compatibility scoring formula.
- Browse Directory: a searchable grid of all registered companies and student talent.
- Profiles & Portfolios: students have verified skill dossiers and portfolios; companies have corporate charters with open roles.

You can call the function searchProfiles(query) when the user wants to find or browse profiles.
When you receive the function response with matching profiles, summarize the results clearly and helpfully to the user with their names, roles, and skills. Do NOT call searchProfiles again once results are provided.

Politely decline to answer questions completely unrelated to SkillSwipe, colleges, companies, careers, or the matching platform.`,
      },
    ],
  };

  const tools = [
    {
      functionDeclarations: [
        {
          name: "searchProfiles",
          description: "Search for companies or students on SkillSwipe by keyword (skill, name, industry, college).",
          parameters: {
            type: "OBJECT",
            properties: {
              query: { type: "STRING", description: "Search query e.g. 'React', 'AI', 'FinTech'" },
            },
            required: ["query"],
          },
        },
      ],
    },
  ];

  // Turn 1: User asks to find companies hiring for React
  const turn1Res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction,
      tools,
      contents: [
        {
          role: "user",
          parts: [{ text: "Find me companies hiring for React roles." }],
        },
      ],
    }),
  });

  const turn1Data = await turn1Res.json();
  const cand = turn1Data.candidates?.[0];
  const functionCall = cand?.content?.parts?.find((p) => p.functionCall)?.functionCall;
  console.log("Model requested function call:", functionCall);

  if (functionCall) {
    // Turn 2: Provide search results back
    const turn2Res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction,
        tools,
        contents: [
          {
            role: "user",
            parts: [{ text: "Find me companies hiring for React roles." }],
          },
          cand.content,
          {
            role: "user",
            parts: [
              {
                functionResponse: {
                  name: functionCall.name,
                  response: {
                    results: [
                      {
                        name: "FinPulse Analytics",
                        industry: "FinTech",
                        location: "Mumbai, India",
                        openRoles: [
                          {
                            title: "Fullstack Developer",
                            type: "internship",
                            stipend: "₹35,000/mo",
                            requiredSkills: ["React", "TypeScript", "Node.js"],
                          },
                        ],
                      },
                    ],
                  },
                },
              },
            ],
          },
        ],
      }),
    });

    const turn2Data = await turn2Res.json();
    const finalAnswer = turn2Data.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text;
    console.log("\nFinal Conversational Answer from Gemini:");
    console.log(finalAnswer);
  }
}

testFullToolFlow();
