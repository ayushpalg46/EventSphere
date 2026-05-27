// routes/checkin.js
// QR Code Scan & Attendee Check-In system panel

const express = require('express');
const router = express.Router();
const { dbQuery } = require('../database/db');
const { isLoggedIn, isOrganiser } = require('../middleware/auth');

// Apply auth middleware to check-in routes
router.use('/organiser/checkin', isLoggedIn, isOrganiser);

// GET check-in panel for an event
router.get('/organiser/checkin/:eventId', async (req, res) => {
  const eventId = req.params.eventId;
  const organiserId = req.session.user.id;

  try {
    const event = await dbQuery.get('SELECT * FROM events WHERE id = ? AND organiser_id = ?', [eventId, organiserId]);
    if (!event) {
      return res.status(404).send('Event not found or unauthorized.');
    }

    // Get live stats: total registered vs checked in
    const stats = await dbQuery.get(
      `SELECT 
       COALESCE(SUM(quantity), 0) as total_registered,
       COALESCE(SUM(CASE WHEN checked_in = 1 THEN quantity ELSE 0 END), 0) as total_checked_in
       FROM bookings 
       WHERE event_id = ? AND payment_status = 'paid'`,
      [eventId]
    );

    res.render('organiser/checkin', { event, stats, error: null, success: null });
  } catch (err) {
    console.error('Error opening checkin panel:', err);
    res.status(500).send('Internal Server Error');
  }
});

// POST to perform checkin (simulating QR scan by entering booking ID or token)
router.post('/organiser/checkin/:eventId', async (req, res) => {
  const eventId = req.params.eventId;
  const organiserId = req.session.user.id;
  const { qrToken } = req.body; // Can be booking ID or raw QR Token string

  const wantsJson = req.headers['accept'] === 'application/json' || req.headers['content-type'] === 'application/json';

  try {
    const event = await dbQuery.get('SELECT * FROM events WHERE id = ? AND organiser_id = ?', [eventId, organiserId]);
    if (!event) {
      if (wantsJson) return res.status(403).json({ error: 'Unauthorized' });
      return res.status(403).send('Unauthorized');
    }

    // Get stats for rendering the page fallback
    const getStats = async () => {
      return await dbQuery.get(
        `SELECT 
         COALESCE(SUM(quantity), 0) as total_registered,
         COALESCE(SUM(CASE WHEN checked_in = 1 THEN quantity ELSE 0 END), 0) as total_checked_in
         FROM bookings 
         WHERE event_id = ? AND payment_status = 'paid'`,
        [eventId]
      );
    };

    let booking = null;

    // Check if token matches standard qr_code field
    if (isNaN(qrToken)) {
      // Find by matching the generated QR Code string (stored as Base64/token text)
      booking = await dbQuery.get(
        `SELECT b.*, u.name as user_name, u.email as user_email, u.phone as user_phone, u.profile_pic as user_profile_pic, t.name as ticket_name 
         FROM bookings b
         JOIN users u ON b.user_id = u.id
         JOIN ticket_types t ON b.ticket_type_id = t.id
         WHERE b.event_id = ? AND b.qr_code LIKE ?`,
        [eventId, `%${qrToken}%`]
      );
    } else {
      // Find by numeric Booking ID
      booking = await dbQuery.get(
        `SELECT b.*, u.name as user_name, u.email as user_email, u.phone as user_phone, u.profile_pic as user_profile_pic, t.name as ticket_name 
         FROM bookings b
         JOIN users u ON b.user_id = u.id
         JOIN ticket_types t ON b.ticket_type_id = t.id
         WHERE b.event_id = ? AND b.id = ?`,
        [eventId, parseInt(qrToken, 10)]
      );
    }

    if (!booking) {
      const stats = await getStats();
      if (wantsJson) {
        return res.status(404).json({ error: 'Ticket not found! Verify Booking ID or scan token.', stats });
      }
      return res.render('organiser/checkin', { 
        event, 
        stats, 
        error: 'Ticket not found! Verify Booking ID or scan token.', 
        success: null 
      });
    }

    if (booking.payment_status !== 'paid') {
      const stats = await getStats();
      if (wantsJson) {
        return res.status(400).json({ error: `Cannot check in. Ticket status: ${booking.payment_status.toUpperCase()}`, stats });
      }
      return res.render('organiser/checkin', {
        event,
        stats,
        error: `Cannot check in. Ticket status: ${booking.payment_status.toUpperCase()}`,
        success: null
      });
    }

    if (booking.checked_in === 1) {
      const stats = await getStats();
      if (wantsJson) {
        return res.status(400).json({ 
          error: `Already Checked-In! Checked in at ${booking.checkin_time}`, 
          stats,
          booking: {
            id: booking.id,
            userName: booking.user_name,
            userEmail: booking.user_email,
            userPhone: booking.user_phone,
            userProfilePic: booking.user_profile_pic || '/images/default-avatar.png',
            ticketName: booking.ticket_name,
            quantity: booking.quantity,
            totalAmount: booking.total_amount,
            checkinTime: booking.checkin_time,
            qrCode: booking.qr_code
          }
        });
      }
      return res.render('organiser/checkin', {
        event,
        stats,
        error: `Already Checked-In! Checked in at ${booking.checkin_time}`,
        success: null
      });
    }

    // Mark as checked in
    await dbQuery.run(
      `UPDATE bookings 
       SET checked_in = 1, checkin_time = NOW() 
       WHERE id = ?`,
      [booking.id]
    );

    const stats = await getStats();
    if (wantsJson) {
      return res.json({
        success: `Checked In Successfully! Attendee: ${booking.user_name} (${booking.ticket_name} - Qty: ${booking.quantity})`,
        stats,
        booking: {
          id: booking.id,
          userName: booking.user_name,
          userEmail: booking.user_email,
          userPhone: booking.user_phone,
          userProfilePic: booking.user_profile_pic || '/images/default-avatar.png',
          ticketName: booking.ticket_name,
          quantity: booking.quantity,
          totalAmount: booking.total_amount,
          checkinTime: new Date(),
          qrCode: booking.qr_code
        }
      });
    }

    res.render('organiser/checkin', {
      event,
      stats,
      error: null,
      success: `Checked In Successfully! Attendee: ${booking.user_name} (${booking.ticket_name} - Qty: ${booking.quantity})`
    });

  } catch (err) {
    console.error('Check-in processing error:', err);
    if (wantsJson) return res.status(500).json({ error: 'Internal Server Error' });
    res.status(500).send('Internal Server Error');
  }
});

// JSON API for live counter statistics (Frontend can fetch/poll this!)
router.get('/organiser/checkin/:eventId/stats', async (req, res) => {
  const eventId = req.params.eventId;
  const organiserId = req.session.user.id;

  try {
    const event = await dbQuery.get('SELECT id FROM events WHERE id = ? AND organiser_id = ?', [eventId, organiserId]);
    if (!event) return res.status(403).json({ error: 'Unauthorized' });

    const stats = await dbQuery.get(
      `SELECT 
       COALESCE(SUM(quantity), 0) as total_registered,
       COALESCE(SUM(CASE WHEN checked_in = 1 THEN quantity ELSE 0 END), 0) as total_checked_in
       FROM bookings 
       WHERE event_id = ? AND payment_status = 'paid'`,
      [eventId]
    );

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
