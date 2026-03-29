export interface EmailTemplateProps {
    title: string;
    messageHtml: string;
    buttonText?: string;
    buttonUrl?: string;
    footerText?: string;
}

/**
 * Generates a highly branded, fully inline-styled HTML email.
 * This template is designed to be easily customized for individual clients (white-labeling)
 * by simply modifying the branding constants at the top.
 */
export function buildEmailTemplate({ 
    title, 
    messageHtml, 
    buttonText, 
    buttonUrl,
    footerText = "This is an automated message. Please do not reply directly to this email."
}: EmailTemplateProps) {
    
    // --- BRANDING CONFIGURATION (Change these for different clients) ---
    const brand = {
        name: "SOP-Guard Pro",
        primaryColor: "#0f766e", // Tailwind teal-700
        backgroundColor: "#f8fafc", // Tailwind slate-50
        cardBg: "#ffffff",
        textColor: "#334155", // Tailwind slate-700
        headingColor: "#0f172a", // Tailwind slate-900
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        logoUrl: "https://via.placeholder.com/150x40/0f172a/ffffff?text=SOP-GUARD+PRO" // Replace with actual hosted logo
    };

    return `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<title>${title}</title>
<style>
  /* Base reset for email clients */
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
</style>
</head>
<body style="background-color: ${brand.backgroundColor}; margin: 0; padding: 0; font-family: ${brand.fontFamily}; -webkit-font-smoothing: antialiased; line-height: 1.6;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${brand.backgroundColor}; padding: 40px 0;">
        <tr>
            <td align="center">
                <!-- Main Card -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" max-width="600" style="max-width: 600px; background-color: ${brand.cardBg}; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                    
                    <!-- Header Strip -->
                    <tr>
                        <td style="background-color: ${brand.primaryColor}; height: 6px; width: 100%;"></td>
                    </tr>
                    
                    <!-- Logo Area -->
                    <tr>
                        <td align="center" style="padding: 40px 40px 20px 40px;">
                            <img src="${brand.logoUrl}" alt="${brand.name} Logo" width="150" style="display: block; max-width: 150px; height: auto;" />
                        </td>
                    </tr>
                    
                    <!-- Content Area -->
                    <tr>
                        <td style="padding: 20px 40px 40px 40px;">
                            <h1 style="margin: 0 0 24px 0; font-size: 24px; font-weight: 700; color: ${brand.headingColor}; text-align: center;">
                                ${title}
                            </h1>
                            
                            <div style="font-size: 16px; color: ${brand.textColor}; text-align: left; margin-bottom: 32px;">
                                ${messageHtml}
                            </div>
                            
                            ${buttonText && buttonUrl ? `
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <table border="0" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td align="center" style="border-radius: 6px;" bgcolor="${brand.primaryColor}">
                                                    <a href="${buttonUrl}" target="_blank" style="font-size: 16px; font-family: ${brand.fontFamily}; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px; padding: 14px 28px; border: 1px solid ${brand.primaryColor}; display: inline-block;">
                                                        ${buttonText}
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            ` : ''}
                        </td>
                    </tr>
                </table>
                
                <!-- Footer Area -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" max-width="600" style="max-width: 600px;">
                    <tr>
                        <td align="center" style="padding: 32px 20px; font-size: 13px; color: #64748b; font-family: ${brand.fontFamily}; text-align: center;">
                            <p style="margin: 0; line-height: 1.5;">${footerText}</p>
                            <p style="margin: 8px 0 0 0; line-height: 1.5;">&copy; ${new Date().getFullYear()} ${brand.name}. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
                
            </td>
        </tr>
    </table>
</body>
</html>
    `;
}
