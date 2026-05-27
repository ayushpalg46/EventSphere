// routes/organiser.js
// Organiser Dashboard, Event Creation, Attendees list CSV export, and Refunds management

const express = require('express');
const router = express.Router();
const { dbQuery } = require('../database/db');
const { isLoggedIn, isOrganiser } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { exportAttendeesToCSV } = require('../utils/csvExporter');

// Apply middleware to organiser routes in this router
router.use('/organiser', isLoggedIn, isOrganiser);

// Organiser Dashboard
router.get('/organiser/dashboard', async (req, res) => {
  const organiserId = req.session.user.id;
  try {
    // Run dashboard queries concurrently to reduce page load latency
    const [events, stats, payouts] = await Promise.all([
      // 1. Get all events created by organiser (excluding huge columns like banner_image/description/agenda/speakers/faq)
      dbQuery.all(
        `SELECT e.id, e.title, e.category, e.venue_name, e.city, e.start_date, e.status, e.created_at, 
         (SELECT SUM(capacity) FROM ticket_types WHERE event_id = e.id) as total_capacity,
         (SELECT SUM(sold) FROM ticket_types WHERE event_id = e.id) as total_sold
         FROM events e WHERE e.organiser_id = ? ORDER BY e.created_at DESC`,
        [organiserId]
      ),
      // 2. Calculate global analytics metrics
      dbQuery.get(
        `SELECT 
         COUNT(DISTINCT e.id) as event_count,
         COALESCE(SUM(t.sold), 0) as total_tickets_sold,
         COALESCE(SUM(b.total_amount), 0) as total_revenue,
         COALESCE(SUM(b.checked_in), 0) as total_checked_in
         FROM events e
         LEFT JOIN ticket_types t ON e.id = t.event_id
         LEFT JOIN bookings b ON e.id = b.event_id AND b.payment_status = 'paid'
         WHERE e.organiser_id = ?`,
        [organiserId]
      ),
      // 3. Payout summary
      dbQuery.all(
        `SELECT p.id, p.amount, p.status, p.payout_date, e.title as event_title 
         FROM payouts p 
         JOIN events e ON p.event_id = e.id
         WHERE p.organiser_id = ? ORDER BY p.payout_date DESC`,
        [organiserId]
      )
    ]);

    res.render('organiser/dashboard', { events, stats, payouts });
  } catch (err) {
    console.error('Error loading organiser dashboard:', err);
    res.status(500).send('Internal Server Error');
  }
});

// GET Create Event Page
router.get('/organiser/create-event', (req, res) => {
  res.render('organiser/create-event', { error: null });
});

// POST Create Event - Handles files and multi-tier tickets
router.post('/organiser/create-event', upload.single('banner_image'), async (req, res) => {
  const organiserId = req.session.user.id;
  const body = req.body;
  const { title, description, category, venue_name, venue_address, city, is_online, online_link, start_date, end_date } = body;

  // Support both standard bracketed and non-bracketed field names
  const ticket_names = body.ticket_names || body['ticket_names[]'];
  const ticket_prices = body.ticket_prices || body['ticket_prices[]'];
  const ticket_capacities = body.ticket_capacities || body['ticket_capacities[]'];
  const discount_codes = body.discount_codes || body['discount_codes[]'];
  const discount_percents = body.discount_percents || body['discount_percents[]'];
  const early_bird_prices = body.early_bird_prices || body['early_bird_prices[]'];
  const early_bird_expiries = body.early_bird_expiries || body['early_bird_expiries[]'];

  const agenda_times = body.agenda_times || body['agenda_times[]'];
  const agenda_titles = body.agenda_titles || body['agenda_titles[]'];
  const speaker_names = body.speaker_names || body['speaker_names[]'];
  const speaker_titles = body.speaker_titles || body['speaker_titles[]'];
  const faq_questions = body.faq_questions || body['faq_questions[]'];
  const faq_answers = body.faq_answers || body['faq_answers[]'];

  let banner_image = 'default_event.jpg';
  // Prioritize the highly-compressed client-side image string if present
  if (body.banner_image_base64 && body.banner_image_base64.startsWith('data:image')) {
    banner_image = body.banner_image_base64;
  } else if (req.file) {
    try {
      const base64Data = req.file.buffer.toString('base64');
      banner_image = `data:${req.file.mimetype};base64,${base64Data}`;
    } catch (e) {
      console.error('Error converting image to base64:', e);
    }
  }

  // Preloaded category-specific fallback image selection if no image is uploaded
  if (banner_image === 'default_event.jpg') {
    const defaultImages = {
      'Music': 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800',
      'Comedy': 'https://images.unsplash.com/photo-1585699324551-f6c309eed262?w=800',
      'Tech': 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
      'Movies': 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800',
      'Sports': 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800'
    };
    banner_image = defaultImages[category] || 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800';
  }

  if (!title || !category || !start_date || !end_date) {
    return res.render('organiser/create-event', { error: 'Please fill in all mandatory fields.' });
  }

  try {
    // Parse Agenda JSON safely
    const agenda = [];
    if (agenda_times && agenda_titles) {
      if (Array.isArray(agenda_times)) {
        for (let i = 0; i < agenda_times.length; i++) {
          const t = agenda_times[i];
          const titleVal = Array.isArray(agenda_titles) ? agenda_titles[i] : agenda_titles;
          if (t && titleVal) {
            agenda.push({ time: t, title: titleVal });
          }
        }
      } else {
        agenda.push({ time: agenda_times, title: agenda_titles });
      }
    }

    // Parse Speakers JSON safely
    const speakers = [];
    if (speaker_names && speaker_titles) {
      if (Array.isArray(speaker_names)) {
        for (let i = 0; i < speaker_names.length; i++) {
          const s = speaker_names[i];
          const titleVal = Array.isArray(speaker_titles) ? speaker_titles[i] : speaker_titles;
          if (s && titleVal) {
            speakers.push({ name: s, designation: titleVal });
          }
        }
      } else {
        speakers.push({ name: speaker_names, designation: speaker_titles });
      }
    }

    // Parse FAQs JSON safely
    const faq = [];
    if (faq_questions && faq_answers) {
      if (Array.isArray(faq_questions)) {
        for (let i = 0; i < faq_questions.length; i++) {
          const q = faq_questions[i];
          const answerVal = Array.isArray(faq_answers) ? faq_answers[i] : faq_answers;
          if (q && answerVal) {
            faq.push({ q: q, a: answerVal });
          }
        }
      } else {
        faq.push({ q: faq_questions, a: faq_answers });
      }
    }

    // Insert Event Row
    const result = await dbQuery.run(
      `INSERT INTO events (organiser_id, title, description, category, banner_image, venue_name, venue_address, city, is_online, online_link, start_date, end_date, agenda, speakers, faq, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'upcoming')`,
      [
        organiserId, title, description, category, banner_image,
        venue_name || '', venue_address || '', city || 'Delhi',
        is_online ? 1 : 0, online_link || '', start_date, end_date,
        JSON.stringify(agenda), JSON.stringify(speakers), JSON.stringify(faq)
      ]
    );

    const eventId = result.id;

    // Add Ticket Types Tiers in parallel
    if (ticket_names) {
      if (Array.isArray(ticket_names)) {
        const ticketPromises = [];
        for (let i = 0; i < ticket_names.length; i++) {
          if (!ticket_names[i]) continue;
          ticketPromises.push(
            dbQuery.run(
              `INSERT INTO ticket_types (event_id, name, price, capacity, sold, discount_code, discount_percent, early_bird_price, early_bird_expiry)
               VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)`,
              [
                eventId,
                ticket_names[i],
                ticket_prices && ticket_prices[i] ? parseFloat(ticket_prices[i]) : 0,
                ticket_capacities && ticket_capacities[i] ? parseInt(ticket_capacities[i]) : 100,
                discount_codes && discount_codes[i] ? discount_codes[i].toUpperCase() : null,
                discount_percents && discount_percents[i] ? parseInt(discount_percents[i]) : 0,
                early_bird_prices && early_bird_prices[i] ? parseFloat(early_bird_prices[i]) : null,
                early_bird_expiries && early_bird_expiries[i] && early_bird_expiries[i] !== '' ? early_bird_expiries[i] : null
              ]
            )
          );
        }
        if (ticketPromises.length > 0) {
          await Promise.all(ticketPromises);
        }
      } else {
        await dbQuery.run(
          `INSERT INTO ticket_types (event_id, name, price, capacity, sold, discount_code, discount_percent, early_bird_price, early_bird_expiry)
           VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)`,
          [
            eventId,
            ticket_names,
            parseFloat(ticket_prices) || 0,
            parseInt(ticket_capacities) || 100,
            discount_codes ? discount_codes.toUpperCase() : null,
            parseInt(discount_percents) || 0,
            early_bird_prices ? parseFloat(early_bird_prices) : null,
            early_bird_expiries && early_bird_expiries !== '' ? early_bird_expiries : null
          ]
        );
      }
    }

    res.redirect('/organiser/dashboard');

  } catch (err) {
    console.error('Failed to create event:', err);
    res.render('organiser/create-event', { error: 'Database transaction error. Check fields and dates.' });
  }
});

// Manage Specific Event page
router.get('/organiser/events/:id', async (req, res) => {
  const eventId = req.params.id;
  const organiserId = req.session.user.id;

  try {
    const event = await dbQuery.get('SELECT * FROM events WHERE id = ? AND organiser_id = ?', [eventId, organiserId]);
    if (!event) {
      return res.status(404).send('Event not found or unauthorized.');
    }

    const ticketTypes = await dbQuery.all('SELECT * FROM ticket_types WHERE event_id = ?', [eventId]);

    // Fetch registered attendees
    const attendees = await dbQuery.all(
      `SELECT b.id as booking_id, u.name, u.email, u.phone, t.name as ticket_type, 
       b.quantity, b.total_amount, b.payment_id, b.payment_status, b.checked_in, b.checkin_time, b.created_at as booked_at
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN ticket_types t ON b.ticket_type_id = t.id
       WHERE b.event_id = ? ORDER BY b.created_at DESC`,
      [eventId]
    );

    // Calculate details
    const totalRevenue = attendees.reduce((acc, curr) => curr.payment_status === 'paid' ? acc + curr.total_amount : acc, 0);
    const totalCheckedIn = attendees.reduce((acc, curr) => curr.checked_in ? acc + curr.quantity : acc, 0);
    const totalBooked = attendees.reduce((acc, curr) => acc + curr.quantity, 0);

    res.render('organiser/event-manage', {
      event,
      ticketTypes,
      attendees,
      analytics: { totalRevenue, totalCheckedIn, totalBooked }
    });

  } catch (err) {
    console.error('Error fetching event manage page:', err);
    res.status(500).send('Internal Server Error');
  }
});

// CSV Export route for specific event
router.get('/organiser/events/:id/export-csv', async (req, res) => {
  const eventId = req.params.id;
  const organiserId = req.session.user.id;

  try {
    const event = await dbQuery.get('SELECT * FROM events WHERE id = ? AND organiser_id = ?', [eventId, organiserId]);
    if (!event) {
      return res.status(403).send('Unauthorized or event doesn\'t exist.');
    }

    const attendees = await dbQuery.all(
      `SELECT b.id as booking_id, u.name, u.email, u.phone, t.name as ticket_type, 
       b.quantity, b.total_amount, b.payment_id, b.payment_status, b.checked_in, b.checkin_time, b.created_at as booked_at
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN ticket_types t ON b.ticket_type_id = t.id
       WHERE b.event_id = ? ORDER BY b.created_at DESC`,
      [eventId]
    );

    const csvContent = exportAttendeesToCSV(attendees);

    // Set Response Headers for direct browser download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=attendees-event-${eventId}.csv`);
    res.status(200).send(csvContent);

  } catch (err) {
    console.error('CSV Export Error:', err);
    res.status(500).send('Error generating export file.');
  }
});

// Simulate Organiser Payout simulation
router.post('/organiser/events/:id/request-payout', async (req, res) => {
  const eventId = req.params.id;
  const organiserId = req.session.user.id;

  try {
    const event = await dbQuery.get('SELECT * FROM events WHERE id = ? AND organiser_id = ?', [eventId, organiserId]);
    if (!event) {
      return res.status(403).send('Unauthorized');
    }

    // Check if payout already requested/processed
    const existingPayout = await dbQuery.get('SELECT * FROM payouts WHERE event_id = ?', [eventId]);
    if (existingPayout) {
      return res.redirect(`/organiser/events/${eventId}?payout_error=Payout already processed or requested.`);
    }

    // Get total tickets revenue
    const revenueRow = await dbQuery.get(
      `SELECT SUM(total_amount) as total FROM bookings WHERE event_id = ? AND payment_status = 'paid'`,
      [eventId]
    );
    const amount = revenueRow.total || 0;

    if (amount <= 0) {
      return res.redirect(`/organiser/events/${eventId}?payout_error=Cannot request payout for Rs. 0.`);
    }

    // Create payout row
    await dbQuery.run(
      `INSERT INTO payouts (organiser_id, event_id, amount, status, payout_date)
       VALUES (?, ?, ?, 'processed', NOW())`, // Sandbox processes instantly!
      [organiserId, eventId, amount]
    );

    res.redirect(`/organiser/events/${eventId}?payout_success=Payout of Rs. ${amount} processed instantly into your mock bank account!`);

  } catch (err) {
    console.error('Payout Request Error:', err);
    res.status(500).send('Payout processing failed.');
  }
});

// Manage Refund Requests Page
router.get('/organiser/refunds', async (req, res) => {
  const organiserId = req.session.user.id;
  try {
    const refundRequests = await dbQuery.all(
      `SELECT b.id as booking_id, b.total_amount, b.refund_status, u.name as user_name, e.title as event_title, t.name as ticket_name, b.quantity
       FROM bookings b
       JOIN users u ON b.user_id = u.id
       JOIN events e ON b.event_id = e.id
       JOIN ticket_types t ON b.ticket_type_id = t.id
       WHERE e.organiser_id = ? AND b.refund_status = 'requested'`,
      [organiserId]
    );

    res.render('organiser/refunds', { refundRequests });
  } catch (err) {
    console.error('Error fetching refunds list:', err);
    res.status(500).send('Internal Server Error');
  }
});

// POST Approve or Reject Refund
router.post('/organiser/refunds/:bookingId', async (req, res) => {
  const bookingId = req.params.bookingId;
  const { action } = req.body; // 'approve' or 'reject'
  const organiserId = req.session.user.id;

  try {
    // Verify booking belongs to organiser's event
    const booking = await dbQuery.get(
      `SELECT b.*, e.title as event_title, e.organiser_id
       FROM bookings b
       JOIN events e ON b.event_id = e.id
       WHERE b.id = ?`,
      [bookingId]
    );

    if (!booking || booking.organiser_id !== organiserId) {
      return res.status(403).send('Unauthorized.');
    }

    if (action === 'approve') {
      // 1. Update booking payment_status & refund_status
      await dbQuery.run(
        `UPDATE bookings SET payment_status = 'refunded', refund_status = 'approved' WHERE id = ?`,
        [bookingId]
      );
      // 2. Restore ticket capacity
      await dbQuery.run(
        `UPDATE ticket_types SET sold = MAX(0, sold - ?) WHERE id = ?`,
        [booking.quantity, booking.ticket_type_id]
      );
      // 3. Send Notification to User
      await dbQuery.run(
        `INSERT INTO notifications (user_id, message)
         VALUES (?, ?)`,
        [
          booking.user_id,
          `Your refund request for "${booking.event_title}" (Rs. ${booking.total_amount}) has been APPROVED. Refund processed to source account.`
        ]
      );
    } else {
      // Reject
      await dbQuery.run(
        `UPDATE bookings SET refund_status = 'rejected' WHERE id = ?`,
        [bookingId]
      );
      await dbQuery.run(
        `INSERT INTO notifications (user_id, message)
         VALUES (?, ?)`,
        [
          booking.user_id,
          `Your refund request for "${booking.event_title}" has been REJECTED by the organiser.`
        ]
      );
    }

    res.redirect('/organiser/refunds');

  } catch (err) {
    console.error('Refund action error:', err);
    res.status(500).send('Failed to process refund decision.');
  }
});

// POST Delete Event
router.post('/organiser/events/:id/delete', async (req, res) => {
  const eventId = req.params.id;
  const organiserId = req.session.user.id;

  try {
    // Verify event belongs to organiser
    const event = await dbQuery.get('SELECT id FROM events WHERE id = ? AND organiser_id = ?', [eventId, organiserId]);
    if (!event) {
      return res.status(403).send('Unauthorized to delete this event.');
    }

    // Delete associated entries manually to prevent foreign key constraint violations
    await dbQuery.run('DELETE FROM payouts WHERE event_id = ?', [eventId]);
    await dbQuery.run('DELETE FROM bookings WHERE event_id = ?', [eventId]);
    await dbQuery.run('DELETE FROM events WHERE id = ? AND organiser_id = ?', [eventId, organiserId]);

    res.redirect('/organiser/dashboard');
  } catch (err) {
    console.error('Error deleting event:', err);
    res.status(500).send('Internal Server Error: Failed to delete event.');
  }
});

module.exports = router;
