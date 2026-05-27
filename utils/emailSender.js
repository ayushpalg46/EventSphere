// utils/emailSender.js
// Email Notification Service with sandbox fallback.

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Ensure folder for simulated emails exists so we can inspect them during testing
const mailBoxDir = path.join(__dirname, '../scratch/simulated_emails');
if (!fs.existsSync(mailBoxDir)) {
  fs.mkdirSync(mailBoxDir, { recursive: true });
}

/**
 * Sends booking confirmation email or simulates it in development mode
 * @param {string} to Email address of recipient
 * @param {string} subject Email subject
 * @param {string} htmlBody HTML email contents
 */
async function sendEmail({ to, subject, htmlBody }) {
  console.log(`[Email Service] Attempting to send email to ${to} with subject: "${subject}"`);

  // Check if SMTP details are provided in environment
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT, 10) || 587;
  const secure = process.env.EMAIL_SECURE === 'true'; // true for port 465, false for 587
  const from = process.env.EMAIL_FROM || `"EventSphere Support" <${user}>`;

  if (user && pass && user !== 'your_gmail@gmail.com' && user !== '') {
    try {
      let transporterOpts = {};

      if (host) {
        // Custom SMTP Configuration (SendGrid, Mailgun, custom server)
        transporterOpts = {
          host: host,
          port: port,
          secure: secure,
          auth: {
            user: user,
            pass: pass
          }
        };
      } else {
        // Fallback to Gmail default service
        transporterOpts = {
          service: 'gmail',
          auth: {
            user: user,
            pass: pass
          }
        };
      }

      const transporter = nodemailer.createTransport(transporterOpts);

      const mailOptions = {
        from: from,
        to: to,
        subject: subject,
        html: htmlBody
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`[Email Service] Real email sent successfully! MessageID: ${info.messageId}`);
      return true;
    } catch (err) {
      console.error('[Email Service] Real SMTP failed, falling back to simulation. Error:', err.message);
    }
  }

  // Fallback: Simulator mode. Save the email as a file and print log.
  try {
    const filename = `email-${Date.now()}-${to.replace(/[@.]/g, '_')}.html`;
    const filepath = path.join(mailBoxDir, filename);
    fs.writeFileSync(filepath, htmlBody);
    console.log(`[Email Service] SIMULATED EMAIL WRITTEN TO DISK: ${filepath}`);
    console.log(`-----------------------------------------------------`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Link: file:///${filepath.replace(/\\/g, '/')}`);
    console.log(`-----------------------------------------------------`);
    return true;
  } catch (err) {
    console.error('[Email Service] Simulation fallback write failed:', err);
    return false;
  }
}

module.exports = {
  sendEmail
};
