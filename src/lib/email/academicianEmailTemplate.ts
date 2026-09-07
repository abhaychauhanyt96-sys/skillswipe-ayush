interface AcademicianInterestEmailParams {
  companyName: string;
  academicianName: string;
  academicianDesignation?: string;
  academicianInstitution?: string;
  academicianDepartment?: string;
  academicianExpertise?: string[];
  opportunityTitle: string;
  opportunityType: string;
  profileUrl: string;
}

/**
 * Generates an academic/credential-styled HTML email notifying a company that
 * a verified faculty member or researcher has expressed interest in an opportunity.
 */
export function generateAcademicianInterestEmailHtml({
  companyName,
  academicianName,
  academicianDesignation = "Faculty Member",
  academicianInstitution = "Higher Education Institution",
  academicianDepartment = "Academic Department",
  academicianExpertise = [],
  opportunityTitle,
  opportunityType,
  profileUrl,
}: AcademicianInterestEmailParams): string {
  const expertiseHtml =
    academicianExpertise.length > 0
      ? academicianExpertise
          .map(
            (exp) =>
              `<span style="display: inline-block; background-color: #F4F1EA; border: 1px solid #CBD5E1; color: #101830; padding: 3px 8px; border-radius: 4px; font-size: 11px; margin: 2px 4px 2px 0; font-family: monospace; font-weight: 600;">${exp}</span>`
          )
          .join("")
      : "<em>Specialized academic domain expertise</em>";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Academic Collaboration Interest</title>
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
              <p style="margin: 4px 0 0 0; color: #94A3B8; font-size: 12px; letter-spacing: 0.5px;">Academia–Industry Collaboration Protocol</p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px 24px 32px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="background-color: #1F6F5C; color: #FFFFFF; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 1px;">
                  New Faculty Interest
                </span>
                <h2 style="font-family: Georgia, serif; color: #101830; font-size: 22px; margin: 16px 0 8px 0; font-weight: 700;">
                  A Verified Academician is Interested in Your Call
                </h2>
                <p style="color: #64748B; font-size: 14px; margin: 0; line-height: 1.5;">
                  Hello ${companyName}, a university faculty member has reviewed your <strong>${opportunityType}</strong> call and expressed interest in collaborating with your team.
                </p>
              </div>

              <!-- Opportunity Box -->
              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 14px 18px; margin-bottom: 20px;">
                <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;">Your Posted Call</p>
                <p style="margin: 0; font-size: 15px; color: #101830; font-weight: 700; font-family: Georgia, serif;">${opportunityTitle}</p>
              </div>

              <!-- Academician Dossier Card -->
              <div style="border: 2px solid #E2E8F0; border-radius: 6px; padding: 20px; background-color: #FFFFFF; margin-bottom: 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td>
                      <h3 style="margin: 0 0 4px 0; font-size: 18px; color: #101830; font-family: Georgia, serif; font-weight: 700;">
                        ${academicianName}
                      </h3>
                      <p style="margin: 0 0 6px 0; font-size: 13px; color: #1F6F5C; font-weight: 600;">
                        ${academicianDesignation}
                      </p>
                      <p style="margin: 0 0 12px 0; font-size: 12px; color: #64748B;">
                        ${academicianDepartment} • <strong>${academicianInstitution}</strong>
                      </p>
                      <div style="border-top: 1px dashed #E2E8F0; padding-top: 12px; margin-top: 4px;">
                        <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700;">Subject & Research Expertise:</p>
                        <div>${expertiseHtml}</div>
                      </div>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0 24px 0;">
                <a href="${profileUrl}" style="background-color: #D4A017; color: #101830; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 28px; border-radius: 6px; display: inline-block; box-shadow: 0 2px 4px rgba(212, 160, 23, 0.3);">
                  View Academician Dossier & Profile &rarr;
                </a>
              </div>

              <p style="color: #64748B; font-size: 12px; text-align: center; margin: 0; line-height: 1.5;">
                You can review their publications, institutional links, and initiate direct communication through your dashboard.
              </p>
            </td>
          </tr>

          <!-- Footer / Protocol Stamp -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px 32px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #94A3B8; line-height: 1.5;">
                SkillSwipe Protocol • Verified Academician Outreach<br>
                Empowering India's academia-industry R&D integration under SIH206644.
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
