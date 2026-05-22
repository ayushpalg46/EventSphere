// routes/user.js
// Attendee dashboard, Profile updates, Address, Wishlist toggle, and Notifications panel
// Created by Ayush

const express = require('express');
const router = express.Router();
const { dbQuery } = require('../database/db');
const { isLoggedIn } = require('../middleware/auth');

// Apply auth check to user dashboard/profile paths
router.use('/user', isLoggedIn);

// Attendee Dashboard
router.get('/user/dashboard', async (req, res) => {
  const userId = req.session.user.id;
  try {
    // 1. Get user bookings with QR codes
    const bookings = await dbQuery.all(
      `SELECT b.id as booking_id, b.total_amount, b.quantity, b.payment_id, b.payment_status, b.refund_status, b.checked_in, b.qr_code,
       e.title as event_title, e.start_date, e.venue_name, e.city, e.id as event_id, t.name as ticket_name
       FROM bookings b
       JOIN events e ON b.event_id = e.id
       JOIN ticket_types t ON b.ticket_type_id = t.id
       WHERE b.user_id = ? ORDER BY b.created_at DESC`,
      [userId]
    );

    // 2. Get user wishlist
    const wishlist = await dbQuery.all(
      `SELECT w.id as wishlist_id, e.* 
       FROM wishlist w
       JOIN events e ON w.event_id = e.id
       WHERE w.user_id = ?`,
      [userId]
    );

    // 3. Get recent notifications
    const notifications = await dbQuery.all(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`,
      [userId]
    );

    res.render('user/dashboard', { bookings, wishlist, notifications });
  } catch (err) {
    console.error('Error fetching attendee dashboard:', err);
    res.status(500).send('Internal Server Error');
  }
});

// Profile management page (details + address + LinkedIn)
router.get('/user/profile', async (req, res) => {
  const userId = req.session.user.id;
  try {
    const userDetail = await dbQuery.get('SELECT * FROM users WHERE id = ?', [userId]);
    res.render('user/profile', { userDetail, success: null, error: null });
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).send('Internal Server Error');
  }
});

// Profile update POST
router.post('/user/profile', async (req, res) => {
  const userId = req.session.user.id;
  const { name, phone, address, city, linkedin_url, share_linkedin } = req.body;
  const optIn = share_linkedin ? 1 : 0;

  try {
    await dbQuery.run(
      `UPDATE users 
       SET name = ?, phone = ?, address = ?, city = ?, linkedin_url = ?, share_linkedin = ?
       WHERE id = ?`,
      [name, phone, address, city, linkedin_url, optIn, userId]
    );

    // Update session object
    req.session.user.name = name;
    req.session.user.phone = phone;
    req.session.user.address = address;
    req.session.user.city = city;
    req.session.user.linkedin_url = linkedin_url;
    req.session.user.share_linkedin = optIn;

    const userDetail = await dbQuery.get('SELECT * FROM users WHERE id = ?', [userId]);
    res.render('user/profile', { userDetail, success: 'Profile updated successfully!', error: null });
  } catch (err) {
    console.error('Profile update error:', err);
    res.render('user/profile', { userDetail: req.body, success: null, error: 'Database update failed.' });
  }
});

// Toggle Wishlist item (AJAX / link toggle)
router.post('/user/wishlist/toggle', async (req, res) => {
  const userId = req.session.user.id;
  const { eventId } = req.body;

  if (!eventId) return res.status(400).json({ error: 'Event ID required' });

  try {
    const existing = await dbQuery.get('SELECT * FROM wishlist WHERE user_id = ? AND event_id = ?', [userId, eventId]);
    
    if (existing) {
      // Remove from wishlist
      await dbQuery.run('DELETE FROM wishlist WHERE user_id = ? AND event_id = ?', [userId, eventId]);
      return res.json({ status: 'removed' });
    } else {
      // Add to wishlist
      await dbQuery.run('INSERT INTO wishlist (user_id, event_id) VALUES (?, ?)', [userId, eventId]);
      // Trigger notification reminder simulation!
      await dbQuery.run(
        'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
        [userId, `Added to wishlist! We will remind you before ticket sales end for this event.`]
      );
      return res.json({ status: 'added' });
    }
  } catch (err) {
    console.error('Wishlist toggle error:', err);
    res.status(500).json({ error: 'Database operation failed' });
  }
});

// Request Refund Flow
router.post('/user/bookings/:bookingId/refund', async (req, res) => {
  const bookingId = req.params.bookingId;
  const userId = req.session.user.id;

  try {
    const booking = await dbQuery.get('SELECT * FROM bookings WHERE id = ? AND user_id = ?', [bookingId, userId]);
    if (!booking) {
      return res.status(404).send('Booking not found.');
    }

    if (booking.payment_status !== 'paid' || booking.refund_status !== 'none') {
      return res.status(400).send('Booking is not eligible for refund.');
    }

    // Mark as requested
    await dbQuery.run('UPDATE bookings SET refund_status = \'requested\' WHERE id = ?', [bookingId]);
    res.redirect('/user/dashboard?success=Refund request sent to the organiser.');

  } catch (err) {
    console.error('Refund request error:', err);
    res.status(500).send('Failed to submit refund request.');
  }
});

// Notifications Read POST
router.post('/user/notifications/read', async (req, res) => {
  const userId = req.session.user.id;
  try {
    await dbQuery.run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download ticket page (printable view)
router.get('/user/tickets/:bookingId', async (req, res) => {
  const bookingId = req.params.bookingId;
  const userId = req.session.user.id;

  try {
    const booking = await dbQuery.get(
      `SELECT b.*, t.name as ticket_name, e.title as event_title, e.start_date, e.venue_name, e.city, e.banner_image, u.name as user_name
       FROM bookings b
       JOIN ticket_types t ON b.ticket_type_id = t.id
       JOIN events e ON b.event_id = e.id
       JOIN users u ON b.user_id = u.id
       WHERE b.id = ? AND b.user_id = ?`,
      [bookingId, userId]
    );

    if (!booking) {
      return res.status(404).send('Ticket not found.');
    }

    res.render('user/tickets', { booking });

  } catch (err) {
    console.error('Error fetching ticket download:', err);
    res.status(500).send('Error rendering ticket.');
  }
});

module.exports = router;
