// routes/events.js
// Browse, search, filter and detail page of events

const express = require('express');
const router = express.Router();
const { dbQuery } = require('../database/db');

// Browse Events page (filtering & searching)
router.get('/events', async (req, res) => {
  try {
    const { search, category, city, price, date } = req.query;
    
    let sql = 'SELECT id, organiser_id, title, category, banner_image, venue_name, city, is_online, start_date, end_date, status, created_at FROM events WHERE status != \'cancelled\'';
    let params = [];

    // Search query filter
    if (search) {
      sql += ' AND (title LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Category filter
    if (category && category !== '') {
      sql += ' AND category = ?';
      params.push(category);
    }

    // City filter
    if (city && city !== '') {
      sql += ' AND city = ?';
      params.push(city);
    }

    // Price filter (Free vs Paid)
    if (price && price !== '') {
      if (price === 'free') {
        sql += ' AND id IN (SELECT event_id FROM ticket_types WHERE price = 0)';
      } else if (price === 'paid') {
        sql += ' AND id IN (SELECT event_id FROM ticket_types WHERE price > 0)';
      }
    }

    // Date filter
    if (date && date !== '') {
      const now = new Date().toISOString().split('T')[0];
      if (date === 'today') {
        sql += ' AND CAST(start_date AS DATE) = CAST(? AS DATE)';
        params.push(now);
      } else if (date === 'tomorrow') {
        sql += ' AND CAST(start_date AS DATE) = CAST(? AS DATE) + INTERVAL \'1 day\'';
        params.push(now);
      } else if (date === 'weekend') {
        sql += ' AND EXTRACT(DOW FROM start_date) IN (0, 6)';
      } else if (date === 'month') {
        sql += ' AND CAST(start_date AS DATE) >= CAST(? AS DATE) AND CAST(start_date AS DATE) <= CAST(? AS DATE) + INTERVAL \'30 days\'';
        params.push(now, now);
      }
    }

    // Sort by start date (upcoming first)
    sql += ' ORDER BY start_date ASC';

    const events = await dbQuery.all(sql, params);
    
    // Fetch categories and cities for dropdown filters
    const defaultCategories = ['Music', 'Comedy', 'Tech', 'Movies'];
    const categoriesRows = await dbQuery.all('SELECT DISTINCT category FROM events WHERE category IS NOT NULL AND category != \'\'');
    const dbCategories = categoriesRows.map(r => r.category);
    const categories = Array.from(new Set([...defaultCategories, ...dbCategories])).sort();

    const defaultCities = ['Delhi', 'Noida', 'Gurgaon', 'Mumbai', 'Bengaluru', 'Pune', 'Goa', 'Hyderabad', 'Chennai', 'Kolkata'];
    const citiesRows = await dbQuery.all('SELECT DISTINCT city FROM events WHERE city IS NOT NULL AND city != \'\'');
    const dbCities = citiesRows.map(r => r.city);
    const cities = Array.from(new Set([...defaultCities, ...dbCities])).sort();

    // Get ticket pricing range for each event
    for (let event of events) {
      const tickets = await dbQuery.all('SELECT price FROM ticket_types WHERE event_id = ?', [event.id]);
      if (tickets.length > 0) {
        const prices = tickets.map(t => t.price);
        event.minPrice = Math.min(...prices);
        event.maxPrice = Math.max(...prices);
      } else {
        event.minPrice = 0;
        event.maxPrice = 0;
      }
    }

    res.render('events/browse', {
      events,
      categories,
      cities,
      filters: { search, category, city, price, date }
    });

  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).send('Internal Server Error');
  }
});

// Event detail page
router.get('/events/:id', async (req, res) => {
  const eventId = req.params.id;

  try {
    const event = await dbQuery.get('SELECT e.*, u.name as organiser_name FROM events e JOIN users u ON e.organiser_id = u.id WHERE e.id = ?', [eventId]);
    if (!event) {
      return res.status(404).send('Event not found.');
    }

    // Parse JSON lists (EJS requires objects)
    event.agendaList = event.agenda ? JSON.parse(event.agenda) : [];
    event.speakersList = event.speakers ? JSON.parse(event.speakers) : [];
    event.faqList = event.faq ? JSON.parse(event.faq) : [];

    // Fetch ticket types available
    const ticketTypes = await dbQuery.all('SELECT * FROM ticket_types WHERE event_id = ?', [eventId]);

    // Check if user has wishlisted this event (if logged in)
    let isWishlisted = false;
    if (req.session.user) {
      const wish = await dbQuery.get('SELECT * FROM wishlist WHERE user_id = ? AND event_id = ?', [req.session.user.id, eventId]);
      if (wish) isWishlisted = true;
    }

    // Fetch event reviews
    const reviews = await dbQuery.all(
      `SELECT r.*, u.name as user_name FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.event_id = ? ORDER BY r.created_at DESC`,
      [eventId]
    );

    // Calculate average rating
    let avgRating = 0;
    if (reviews.length > 0) {
      const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
      avgRating = (sum / reviews.length).toFixed(1);
    }

    // Attendee networking: users who opt-in to share LinkedIn
    const networkingUsers = await dbQuery.all(
      `SELECT DISTINCT u.name, u.linkedin_url FROM bookings b
       JOIN users u ON b.user_id = u.id
       WHERE b.event_id = ? AND u.share_linkedin = 1 AND u.linkedin_url IS NOT NULL AND u.linkedin_url != \'\'`,
      [eventId]
    );

    res.render('events/detail', {
      event,
      ticketTypes,
      isWishlisted,
      reviews,
      avgRating,
      networkingUsers
    });

  } catch (err) {
    console.error('Error fetching event detail:', err);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
