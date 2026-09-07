import { Resend } from "resend";

// Resend client singleton
const apiKey = process.env.RESEND_API_KEY;
export const resend = apiKey ? new Resend(apiKey) : null;

// Default sender for development / testing
export const SENDER_EMAIL = process.env.EMAIL_FROM || "SkillSwipe <onboarding@resend.dev>";

interface StudentEmailParams {
  studentName: string;
  companyName: string;
  roleTitle?: string;
  profileUrl: string;
}

interface CompanyEmailParams {
  companyName: string;
  studentName: string;
  studentCollege?: string;
  studentSkills?: string[];
  roleTitle?: string;
  profileUrl: string;
}

/**
 * Generate academic-styled HTML email for student when a match occurs
 */
export function generateStudentMatchEmailHtml({
  studentName,
  companyName,
  roleTitle,
  profileUrl,
}: StudentEmailParams): string {
  const roleDisplay = roleTitle ? `for the <strong>${roleTitle}</strong> position` : "";
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mutual Match Notification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F1EA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #101830;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F4F1EA; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Certificate Container -->
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #FDFCF9; border: 3px double #101830; border-radius: 4px; overflow: hidden; box-shadow: 0 4px 12px rgba(16, 24, 48, 0.08);">
          
          <!-- Deep Navy Header with Gold Accent Line -->
          <tr>
            <td style="background-color: #101830; padding: 28px 32px; text-align: center; border-bottom: 2px solid #D4A017;">
              <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #D4A017; font-weight: 700;">Smart India Hackathon • SIH206644</p>
              <h1 style="margin: 6px 0 0 0; color: #F7F5EF; font-size: 26px; font-weight: 700; font-family: Georgia, serif; letter-spacing: -0.5px;">SkillSwipe</h1>
              <p style="margin: 4px 0 0 0; color: #94A3B8; font-size: 12px; letter-spacing: 0.5px;">Official Mutual Consent Registry</p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              <div style="display: inline-block; background-color: #1F6F5C; color: #FFFFFF; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 10px; border-radius: 2px; margin-bottom: 16px;">
                Mutual Consent Established
              </div>
              
              <h2 style="margin: 0 0 16px 0; color: #101830; font-size: 22px; font-family: Georgia, serif; line-height: 1.3;">
                Congratulations, ${studentName}!
              </h2>
              
              <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
                You and <strong>${companyName}</strong> have both opted in to connect on SkillSwipe ${roleDisplay}.
              </p>

              <div style="background-color: #F7F5EF; border: 1px solid #E2D9C8; border-left: 4px solid #D4A017; padding: 18px 20px; margin: 24px 0; border-radius: 2px;">
                <p style="margin: 0; font-size: 13px; color: #64748B; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Next Step</p>
                <p style="margin: 6px 0 0 0; font-size: 14px; color: #101830; font-weight: 500;">
                  Both parties have approved contact. Access ${companyName}'s verified charter, open opportunities, and team contacts below.
                </p>
              </div>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 28px 0 16px 0;">
                <tr>
                  <td align="center">
                    <a href="${profileUrl}" style="display: inline-block; background-color: #101830; color: #F7F5EF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 3px; border: 1px solid #D4A017; letter-spacing: 0.5px;">
                      View ${companyName}'s Profile & Open Roles &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0 0; font-size: 12px; color: #94A3B8; text-align: center;">
                If the button above does not work, visit: <br>
                <a href="${profileUrl}" style="color: #1F6F5C; word-break: break-all;">${profileUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #ECE8DE; padding: 18px 32px; border-top: 1px solid #DCD5C5; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748B;">
                SkillSwipe — Academia–Industry Collaboration Portal &bull; Mutual-Consent Protocol
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate academic-styled HTML email for company when a match occurs
 */
export function generateCompanyMatchEmailHtml({
  companyName,
  studentName,
  studentCollege,
  studentSkills,
  roleTitle,
  profileUrl,
}: CompanyEmailParams): string {
  const roleDisplay = roleTitle ? `for <strong>${roleTitle}</strong>` : "for your talent pool";
  const skillsDisplay = studentSkills && studentSkills.length > 0 
    ? studentSkills.slice(0, 5).map(s => `<span style="display: inline-block; background: #FFFFFF; border: 1px solid #CBD5E1; padding: 2px 8px; font-size: 11px; font-family: monospace; margin: 2px 4px 2px 0; border-radius: 2px;">${s}</span>`).join("")
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Candidate Mutual Match Notification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F1EA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #101830;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F4F1EA; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Certificate Container -->
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #FDFCF9; border: 3px double #101830; border-radius: 4px; overflow: hidden; box-shadow: 0 4px 12px rgba(16, 24, 48, 0.08);">
          
          <!-- Deep Navy Header with Gold Accent Line -->
          <tr>
            <td style="background-color: #101830; padding: 28px 32px; text-align: center; border-bottom: 2px solid #D4A017;">
              <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #D4A017; font-weight: 700;">Smart India Hackathon • SIH206644</p>
              <h1 style="margin: 6px 0 0 0; color: #F7F5EF; font-size: 26px; font-weight: 700; font-family: Georgia, serif; letter-spacing: -0.5px;">SkillSwipe</h1>
              <p style="margin: 4px 0 0 0; color: #94A3B8; font-size: 12px; letter-spacing: 0.5px;">Official Mutual Consent Registry</p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px 28px 32px;">
              <div style="display: inline-block; background-color: #1F6F5C; color: #FFFFFF; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 10px; border-radius: 2px; margin-bottom: 16px;">
                Candidate Mutual Consent Established
              </div>
              
              <h2 style="margin: 0 0 16px 0; color: #101830; font-size: 22px; font-family: Georgia, serif; line-height: 1.3;">
                New Candidate Match for ${companyName}!
              </h2>
              
              <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
                <strong>${studentName}</strong> ${studentCollege ? `from <em>${studentCollege}</em>` : ""} has mutually matched with ${companyName} ${roleDisplay}.
              </p>

              ${skillsDisplay ? `
              <div style="background-color: #F7F5EF; border: 1px solid #E2D9C8; padding: 16px 18px; margin: 20px 0; border-radius: 2px;">
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748B; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Verified Skill Overlap</p>
                <div>${skillsDisplay}</div>
              </div>
              ` : ""}

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 28px 0 16px 0;">
                <tr>
                  <td align="center">
                    <a href="${profileUrl}" style="display: inline-block; background-color: #101830; color: #F7F5EF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 3px; border: 1px solid #D4A017; letter-spacing: 0.5px;">
                      Review Candidate Dossier & Contact &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0 0; font-size: 12px; color: #94A3B8; text-align: center;">
                If the button above does not work, visit: <br>
                <a href="${profileUrl}" style="color: #1F6F5C; word-break: break-all;">${profileUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #ECE8DE; padding: 18px 32px; border-top: 1px solid #DCD5C5; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748B;">
                SkillSwipe — Academia–Industry Collaboration Portal &bull; Mutual-Consent Protocol
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
