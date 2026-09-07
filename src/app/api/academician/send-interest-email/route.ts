import { NextResponse } from "next/server";
import { resend, SENDER_EMAIL } from "@/lib/email/resend";
import { generateAcademicianInterestEmailHtml } from "@/lib/email/academicianEmailTemplate";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { interestId, academicianId, opportunityId, companyId } = body;

    if (!interestId || !academicianId || !opportunityId || !companyId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameters (interestId, academicianId, opportunityId, companyId)",
        },
        { status: 400 }
      );
    }

    // 1. Fetch academician profile & user record
    let academicianName = "Verified Faculty Member";
    let designation = "Faculty Member";
    let institution = "Academic Institution";
    let department = "Department";
    let expertise: string[] = [];

    try {
      const acadDoc = await getDoc(doc(db, "academicians", academicianId));
      if (acadDoc.exists()) {
        const d = acadDoc.data();
        if (d.basicInfo?.designation) designation = d.basicInfo.designation;
        if (d.basicInfo?.institution) institution = d.basicInfo.institution;
        if (d.basicInfo?.department) department = d.basicInfo.department;
        if (d.expertiseAreas) expertise = d.expertiseAreas;
      }
      const userDoc = await getDoc(doc(db, "users", academicianId));
      if (userDoc.exists()) {
        const u = userDoc.data();
        if (u.name) academicianName = u.name;
        else if (u.displayName) academicianName = u.displayName;
      }
    } catch (e: any) {
      console.warn("[Academician Email] Academician lookup warning:", e?.message);
    }

    // 2. Fetch opportunity details
    let opportunityTitle = "Academic Collaboration";
    let opportunityType = "Collaboration";
    try {
      const oppDoc = await getDoc(doc(db, "academicOpportunities", opportunityId));
      if (oppDoc.exists()) {
        const od = oppDoc.data();
        if (od.title) opportunityTitle = od.title;
        if (od.type) opportunityType = od.type;
      }
    } catch (e: any) {
      console.warn("[Academician Email] Opportunity lookup warning:", e?.message);
    }

    // 3. Fetch company recipient email & name
    let companyName = "Industry Partner";
    let companyEmail: string | null = null;
    try {
      const compDoc = await getDoc(doc(db, "companies", companyId));
      if (compDoc.exists()) {
        const cd = compDoc.data();
        if (cd.basicInfo?.name) companyName = cd.basicInfo.name;
      }
      const compUserDoc = await getDoc(doc(db, "users", companyId));
      if (compUserDoc.exists()) {
        const cud = compUserDoc.data();
        if (cud.email) companyEmail = cud.email;
        if (cud.name && companyName === "Industry Partner") companyName = cud.name;
      }
    } catch (e: any) {
      console.warn("[Academician Email] Company lookup warning:", e?.message);
    }

    console.log(`[Academician Email Dispatch] Triggering interest notification for ${interestId}:`);
    console.log(`  -> Academician: ${academicianName} (${designation}, ${institution})`);
    console.log(`  -> Company: ${companyName} (${companyEmail || "no-email"})`);
    console.log(`  -> Opportunity: "${opportunityTitle}"`);

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    const profileUrl = `${baseUrl}/profile/academician/${academicianId}`;
    const emailSentAt = new Date().toISOString();
    let resendResult: any = null;
    let dispatchWarning: string | null = null;

    if (!resend) {
      console.warn("[Academician Email Dispatch] RESEND_API_KEY is not configured. Simulating transmission.");
      dispatchWarning = "RESEND_API_KEY is not configured.";
    } else if (!companyEmail) {
      console.warn("[Academician Email Dispatch] No company recipient email found.");
      dispatchWarning = "Company recipient email not available.";
    } else {
      try {
        const html = generateAcademicianInterestEmailHtml({
          companyName,
          academicianName,
          academicianDesignation: designation,
          academicianInstitution: institution,
          academicianDepartment: department,
          academicianExpertise: expertise,
          opportunityTitle,
          opportunityType,
          profileUrl,
        });

        resendResult = await resend.emails.send({
          from: SENDER_EMAIL,
          to: companyEmail,
          subject: `Academic Collaboration Interest: ${academicianName} (${institution})`,
          html,
        });
        if (resendResult?.error) {
          console.warn("[Academician Email Dispatch] Resend API notice:", resendResult.error.message);
          dispatchWarning = resendResult.error.message;
        } else {
          console.log("[Academician Email Dispatch] Resend send success:", resendResult);
        }
      } catch (sendErr: any) {
        console.warn("[Academician Email Dispatch] Resend error:", sendErr.message);
        dispatchWarning = sendErr.message;
      }
    }

    // 4. Update academicianInterests/{interestId} record
    try {
      const interestRef = doc(db, "academicianInterests", interestId);
      await updateDoc(interestRef, {
        emailSentAt,
        emailStatus: dispatchWarning ? "simulated" : "dispatched",
      });
      console.log(`[Academician Email Dispatch] Updated ${interestId} with emailSentAt: ${emailSentAt}`);
    } catch (dbErr: any) {
      console.warn(`[Academician Email Dispatch] Firestore update deferred: ${dbErr?.message}`);
    }

    return NextResponse.json({
      success: true,
      interestId,
      emailSentAt,
      result: resendResult,
      warning: dispatchWarning,
    });
  } catch (err: any) {
    console.error("[Academician Email Dispatch Error]", err);
    return NextResponse.json({
      success: false,
      error: err.message || "An unexpected error occurred during email dispatch",
    });
  }
}
