// utils/feedbackCron.js
// Automated Background Worker for sending Feedback Request Emails post-event.

const { dbQuery } = require('../database/db');
const { sendEmail } = require('./emailSender');

/**
 * Scans database for attendees of events that ended at least 2 hours ago,
 * dispatches feedback reminder emails, and updates status flags.
 */
async function checkAndSendFeedbackEmails() {
  console.log('[Feedback Cron] Checking for events that ended more than 2 hours ago...');
  try {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    
    // Select paid bookings of events that ended at least 2 hours ago where feedback hasn't been requested
    const pendingBookings = await dbQuery.all(
      `SELECT b.id as booking_id, b.user_id, b.event_id, u.name as user_name, u.email as user_email, e.title as event_title
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN events e ON b.event_id = e.id
       WHERE b.payment_status = 'paid' 
         AND b.feedback_sent = 0 
         AND e.end_date <= NOW() - INTERVAL '2 hours'`
    );

    if (pendingBookings.length === 0) {
      console.log('[Feedback Cron] No pending feedback emails found.');
      return;
    }

    console.log(`[Feedback Cron] Found ${pendingBookings.length} booking(s) pending feedback request emails.`);

    for (const booking of pendingBookings) {
      const feedbackUrl = `${appUrl}/feedback/${booking.event_id}`;
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; background-color: #0f0a1c; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #a855f7; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #a855f7; margin-top: 0; text-align: center;">How was "${booking.event_title}"?</h2>
          <p>Hi ${booking.user_name},</p>
          <p>We hope you had an amazing experience attending <strong>${booking.event_title}</strong>!</p>
          <p>Your feedback is incredibly valuable to help us and the event organisers improve future events. Please take a quick minute to share your thoughts, rating, and suggestions.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${feedbackUrl}" style="background-color: #a855f7; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; display: inline-block; box-shadow: 0 4px 12px rgba(168, 85, 247, 0.3); border: 1px solid rgba(168, 85, 247, 0.5);">
              Share Your Feedback
            </a>
          </div>
          
          <p style="font-size: 0.85rem; color: #9ca3af; text-align: center; border-top: 1px solid #1f1a30; padding-top: 15px; margin-top: 25px;">
            If the button above does not work, copy and paste this link into your browser address bar: <br/>
            <a href="${feedbackUrl}" style="color: #a855f7; text-decoration: underline;">${feedbackUrl}</a>
          </p>
          <p style="font-size: 0.75rem; color: #6b7280; text-align: center; margin-top: 15px;">
            Sent automatically by EventSphere Ticketing Desk.
          </p>
        </div>
      `;

      console.log(`[Feedback Cron] Dispatching feedback email to ${booking.user_email} for event: "${booking.event_title}"...`);
      
      const emailSent = await sendEmail({
        to: booking.user_email,
        subject: `Share your feedback for ${booking.event_title} - EventSphere`,
        htmlBody: emailHtml
      });

      if (emailSent) {
        // Mark feedback_sent = 1 for the booking
        await dbQuery.run(
          'UPDATE bookings SET feedback_sent = 1 WHERE id = ?',
          [booking.booking_id]
        );

        // Add a corresponding in-app notification
        await dbQuery.run(
          `INSERT INTO notifications (user_id, message) 
           VALUES (?, ?)`,
          [
            booking.user_id,
            `We hope you enjoyed "${booking.event_title}"! Please share your feedback: ${feedbackUrl}`
          ]
        );
        console.log(`[Feedback Cron] Feedback email successfully sent & in-app notification added for booking ID: ${booking.booking_id}.`);
      }
    }
  } catch (err) {
    console.error('[Feedback Cron] Error running checkAndSendFeedbackEmails:', err);
  }
}

/**
 * Initializes and starts the background feedback scheduler loop.
 */
function startFeedbackCron() {
  console.log('[Feedback Cron] Initializing background feedback scheduler loop...');
  
  // Run an initial scan immediately on server start to catch any events that ended while the server was offline
  setTimeout(checkAndSendFeedbackEmails, 5000); // 5s delay to ensure DB tables/migrations are fully initialized
  
  // Check every 5 minutes (300,000 milliseconds)
  setInterval(checkAndSendFeedbackEmails, 5 * 60 * 1000);
}

module.exports = {
  checkAndSendFeedbackEmails,
  startFeedbackCron
};
