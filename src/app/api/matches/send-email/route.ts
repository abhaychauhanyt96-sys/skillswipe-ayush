import { NextResponse } from "next/server";
import { resend, SENDER_EMAIL, generateStudentMatchEmailHtml, generateCompanyMatchEmailHtml } from "@/lib/email/resend";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let {
      matchId,
      studentId,
      studentName,
      studentEmail,
      companyId,
      companyName,
      companyEmail,
      roleTitle,
      studentCollege,
      studentSkills,
    } = body;

    if (!matchId) {
      return NextResponse.json(
        { success: false, error: "Missing matchId in request body" },
        { status: 400 }
      );
    }

    // Auto-fetch missing student details from Firestore if needed
    if (studentId && (!studentEmail || !studentName)) {
      try {
        const studentUserDoc = await getDoc(doc(db, "users", studentId));
        if (studentUserDoc.exists()) {
          const uData = studentUserDoc.data();
          studentEmail = studentEmail || uData.email;
          studentName = studentName || uData.name;
        }
      } catch (lookupErr) {
        console.warn("[Email Dispatch] Student user lookup skipped:", lookupErr);
      }
    }

    // Auto-fetch missing company details from Firestore if needed
    if (companyId && (!companyEmail || !companyName)) {
      try {
        const companyUserDoc = await getDoc(doc(db, "users", companyId));
        if (companyUserDoc.exists()) {
          const cData = companyUserDoc.data();
          companyEmail = companyEmail || cData.email;
          companyName = companyName || cData.name;
        }
        const companyDoc = await getDoc(doc(db, "companies", companyId));
        if (companyDoc.exists()) {
          const compData = companyDoc.data();
          companyName = companyName || compData.basicInfo?.name;
        }
      } catch (lookupErr) {
        console.warn("[Email Dispatch] Company lookup skipped:", lookupErr);
      }
    }

    console.log(`[Email Dispatch] Triggering match notification for matchId: ${matchId}`);
    console.log(`  -> Student: ${studentName || studentId} (${studentEmail || "no-email"})`);
    console.log(`  -> Company: ${companyName || companyId} (${companyEmail || "no-email"})`);

    // Determine the active application base URL
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    const studentProfileUrl = `${baseUrl}/dashboard/student/matches`;
    const companyProfileUrl = `${baseUrl}/dashboard/company/matches`;

    const emailSentAt = new Date().toISOString();
    let resendResults: any[] = [];
    let dispatchWarning: string | null = null;

    if (!resend) {
      console.warn("[Email Dispatch] RESEND_API_KEY is not configured. Skipping live email transmission.");
      dispatchWarning = "RESEND_API_KEY is not configured.";
    } else {
      const emailPromises = [];

      // 1. Email to Student
      if (studentEmail) {
        const studentHtml = generateStudentMatchEmailHtml({
          studentName: studentName || "Student",
          companyName: companyName || "Partner Organization",
          roleTitle,
          profileUrl: studentProfileUrl,
        });

        emailPromises.push(
          resend.emails
            .send({
              from: SENDER_EMAIL,
              to: studentEmail,
              subject: `You've matched with ${companyName || "a new company"}!`,
              html: studentHtml,
            })
            .then((res) => ({ recipient: "student", status: "success", data: res }))
            .catch((err) => {
              console.warn(`[Email Dispatch] Student email notice: ${err.message}`);
              return { recipient: "student", status: "failed", error: err.message };
            })
        );
      }

      // 2. Email to Company
      if (companyEmail) {
        const companyHtml = generateCompanyMatchEmailHtml({
          companyName: companyName || "Partner Organization",
          studentName: studentName || "Candidate",
          studentCollege,
          studentSkills,
          roleTitle,
          profileUrl: companyProfileUrl,
        });

        emailPromises.push(
          resend.emails
            .send({
              from: SENDER_EMAIL,
              to: companyEmail,
              subject: `You've matched with ${studentName || "a new candidate"}!`,
              html: companyHtml,
            })
            .then((res) => ({ recipient: "company", status: "success", data: res }))
            .catch((err) => {
              console.warn(`[Email Dispatch] Company email notice: ${err.message}`);
              return { recipient: "company", status: "failed", error: err.message };
            })
        );
      }

      if (emailPromises.length > 0) {
        resendResults = await Promise.all(emailPromises);
      } else {
        console.warn("[Email Dispatch] No recipient emails found for student or company.");
        dispatchWarning = "No recipient email addresses provided.";
      }
    }

    // Record emailSentAt in Firestore match document
    try {
      if (matchId && db) {
        const matchRef = doc(db, "matches", matchId);
        await updateDoc(matchRef, {
          emailSentAt,
          emailStatus: dispatchWarning ? "simulated" : "dispatched",
        });
        console.log(`[Email Dispatch] Updated match ${matchId} with emailSentAt: ${emailSentAt}`);
      }
    } catch (dbErr: any) {
      console.warn(`[Email Dispatch] Match doc timestamp update deferred: ${dbErr.message}`);
    }

    return NextResponse.json({
      success: true,
      matchId,
      emailSentAt,
      results: resendResults,
      warning: dispatchWarning,
    });
  } catch (err: any) {
    // Graceful error handling — log and return 200 with success: false
    // Never crash or trigger unhandled server rejections
    console.error("[Email Dispatch Error]", err);
    return NextResponse.json({
      success: false,
      error: err.message || "An unexpected error occurred during email dispatch",
    });
  }
}
