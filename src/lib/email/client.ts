export interface MatchNotificationPayload {
  matchId: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  companyId: string;
  companyName?: string;
  companyEmail?: string;
  roleTitle?: string;
  studentCollege?: string;
  studentSkills?: string[];
}

/**
 * Non-blocking client dispatcher for match email notifications
 * Fires asynchronously and guarantees the swipe card UI / celebratory modal
 * will never hang, block, or throw errors even if the network or mail provider hiccups.
 */
export async function triggerMatchEmail(payload: MatchNotificationPayload): Promise<{ success: boolean; emailSentAt?: string }> {
  try {
    console.log(`[Client Email Trigger] Dispatched match email for match ${payload.matchId}`);
    const res = await fetch("/api/matches/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });

    if (!res.ok) {
      console.warn(`[Client Email Trigger] Server returned status ${res.status}`);
      return { success: false };
    }

    const data = await res.json();
    console.log(`[Client Email Trigger] Response received:`, data);
    return data;
  } catch (err: any) {
    console.warn(`[Client Email Trigger] Non-blocking dispatch notice: ${err?.message || err}`);
    return { success: false };
  }
}

export interface AcademicianInterestPayload {
  interestId: string;
  academicianId: string;
  opportunityId: string;
  companyId: string;
}

/**
 * Non-blocking client dispatcher for academician express interest email notifications
 */
export async function triggerAcademicianInterestEmail(
  payload: AcademicianInterestPayload
): Promise<{ success: boolean; emailSentAt?: string }> {
  try {
    console.log(`[Client Email Trigger] Dispatched interest email for ${payload.interestId}`);
    const res = await fetch("/api/academician/send-interest-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });

    if (!res.ok) {
      console.warn(`[Client Email Trigger] Server returned status ${res.status}`);
      return { success: false };
    }

    const data = await res.json();
    console.log(`[Client Email Trigger] Response received:`, data);
    return data;
  } catch (err: any) {
    console.warn(`[Client Email Trigger] Non-blocking dispatch notice: ${err?.message || err}`);
    return { success: false };
  }
}

