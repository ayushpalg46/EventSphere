// routes/community.js
// Community reviews, ratings, and feedback form submissions

const express = require('express');
const router = express.Router();
const { dbQuery } = require('../database/db');
const { isLoggedIn } = require('../middleware/auth');

// POST Public Event Review and Rating
router.post('/events/:eventId/review', isLoggedIn, async (req, res) => {
  const eventId = req.params.eventId;
  const userId = req.session.user.id;
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).send('Invalid rating value. Must be between 1 and 5.');
  }

  try {
    // Check if user has already reviewed this event (prevent spam)
    const existingReview = await dbQuery.get(
      'SELECT * FROM reviews WHERE user_id = ? AND event_id = ?',
      [userId, eventId]
    );

    if (existingReview) {
      // Update review
      await dbQuery.run(
        'UPDATE reviews SET rating = ?, comment = ? WHERE id = ?',
        [rating, comment || '', existingReview.id]
      );
    } else {
      // Create new review
      await dbQuery.run(
        'INSERT INTO reviews (user_id, event_id, rating, comment) VALUES (?, ?, ?, ?)',
        [userId, eventId, rating, comment || '']
      );
    }

    res.redirect(`/events/${eventId}`);

  } catch (err) {
    console.error('Review submit error:', err);
    res.status(500).send('Internal Server Error');
  }
});

// GET Post-Event Feedback page
router.get('/feedback/:eventId', isLoggedIn, async (req, res) => {
  const eventId = req.params.eventId;
  const userId = req.session.user.id;

  try {
    const event = await dbQuery.get('SELECT * FROM events WHERE id = ?', [eventId]);
    if (!event) {
      return res.status(404).send('Event not found.');
    }

    // Verify user actually booked/registered for this event
    const booking = await dbQuery.get(
      'SELECT * FROM bookings WHERE user_id = ? AND event_id = ? AND payment_status = \'paid\'',
      [userId, eventId]
    );

    if (!booking) {
      return res.status(403).send('Forbidden: Only registered attendees can submit feedback.');
    }

    res.render('user/feedback', { event, success: null, error: null });

  } catch (err) {
    console.error('Error fetching feedback page:', err);
    res.status(500).send('Internal Server Error');
  }
});

// POST Post-Event Feedback submit
router.post('/feedback/:eventId', isLoggedIn, async (req, res) => {
  const eventId = req.params.eventId;
  const userId = req.session.user.id;
  const { rating, satisfaction_score, would_recommend, comments } = req.body;

  try {
    const event = await dbQuery.get('SELECT * FROM events WHERE id = ?', [eventId]);
    
    // Check if feedback already submitted
    const existingFeedback = await dbQuery.get(
      'SELECT * FROM feedback WHERE user_id = ? AND event_id = ?',
      [userId, eventId]
    );

    if (existingFeedback) {
      return res.render('user/feedback', { 
        event, 
        success: null, 
        error: 'You have already submitted feedback for this event.' 
      });
    }

    await dbQuery.run(
      `INSERT INTO feedback (user_id, event_id, rating, satisfaction_score, would_recommend, comments)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        eventId,
        parseInt(rating) || 5,
        parseInt(satisfaction_score) || 10,
        would_recommend ? 1 : 0,
        comments || ''
      ]
    );

    // Also add a public review based on feedback comment if they left one!
    if (comments) {
      const publicRating = parseInt(rating) || 5;
      await dbQuery.run(
        `INSERT INTO reviews (user_id, event_id, rating, comment)
         VALUES (?, ?, ?, ?)`,
        [userId, eventId, publicRating, comments]
      );
    }

    res.render('user/feedback', { 
      event, 
      success: 'Thank you! Your feedback has been submitted successfully.', 
      error: null 
    });

  } catch (err) {
    console.error('Feedback submit error:', err);
    res.status(500).send('Error saving feedback.');
  }
});

module.exports = router;
