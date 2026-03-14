/**
 * Gmail API test — run with:  node test-email.js
 * Tests the OAuth2 Gmail API connection (port 443, works on Render free tier).
 * Delete this file after confirming emails work.
 */
require('dotenv').config();
const { google } = require('googleapis');

const required = ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN', 'EMAIL_USER'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error('❌ Missing env vars:', missing.join(', '));
  console.error('\nFollow setup guide to get these from Google Cloud Console + OAuth Playground.');
  process.exit(1);
}

const auth = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);
auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
const gmail = google.gmail({ version: 'v1', auth });

const FROM = process.env.EMAIL_FROM || `HiTicket <${process.env.EMAIL_USER}>`;
const TO   = process.env.EMAIL_USER;

const buildRaw = (to, subject, html) => {
  const msg = [
    `From: ${FROM}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    html,
  ].join('\r\n');
  return Buffer.from(msg).toString('base64url');
};

(async () => {
  console.log('🔌 Testing Gmail API token…');
  try {
    const tokenInfo = await auth.getAccessToken();
    if (!tokenInfo.token) throw new Error('No access token returned');
    console.log('✅ OAuth2 token OK');
  } catch (err) {
    console.error('❌ Token refresh failed:', err.message);
    console.error('\nCommon fixes:');
    console.error('  • Make sure GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET match your Google Cloud project');
    console.error('  • Re-generate the refresh token at https://developers.google.com/oauthplayground');
    console.error('  • Make sure you added your email as a Test User on the OAuth consent screen');
    process.exit(1);
  }

  console.log(`📤 Sending test email to ${TO}…`);
  try {
    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: buildRaw(
          TO,
          '[HiTicket] ✅ Gmail API test successful',
          `<div style="font-family:sans-serif;padding:24px;background:#18181b;color:#fafafa;border-radius:8px">
            <h2 style="color:#FF634A">HiTicket email is working!</h2>
            <p>Gmail API via OAuth2 is configured correctly. Emails will now be delivered on Render.</p>
            <p style="color:#52525b;font-size:12px">Sent at ${new Date().toISOString()}</p>
          </div>`
        ),
      },
    });
    console.log('✅ Test email sent! Gmail message id:', res.data.id);
    console.log('\n👉 Check your inbox at', TO);
    console.log('\nAdd these env vars to Render:');
    console.log('  GMAIL_CLIENT_ID     =', process.env.GMAIL_CLIENT_ID);
    console.log('  GMAIL_CLIENT_SECRET = (from Google Cloud Console)');
    console.log('  GMAIL_REFRESH_TOKEN = (from OAuth Playground)');
    console.log('  EMAIL_USER          =', process.env.EMAIL_USER);
    console.log('  EMAIL_FROM          =', FROM);
    console.log('  CLIENT_URL          = https://helpdeskai-five.vercel.app');
  } catch (err) {
    console.error('❌ Send failed:', err.message);
    process.exit(1);
  }
})();
