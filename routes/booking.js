// routes/booking.js
// Event ticket booking and payment sandbox routes
// Created by Ayush

const express = require('express');
const router = express.Router();
const { dbQuery } = require('../database/db');
const { isLoggedIn } = require('../middleware/auth');
const { generateQRCode } = require('../utils/qrGenerator');
const { sendEmail } = require('../utils/emailSender');

// GET Checkout Page
router.get('/booking/checkout', isLoggedIn, (req, res) => {
  const order = req.session.checkoutOrder;
  if (!order) {
    return res.redirect('/events');
  }
  res.render('booking/checkout', { order }, (err, html) => {
    if (err) {
      console.error('Error rendering checkout page:', err);
      global.serverErrors = global.serverErrors || [];
      global.serverErrors.push({
        type: 'checkoutGetRenderError',
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        time: new Date().toISOString()
      });
      if (global.serverErrors.length > 50) global.serverErrors.shift();
      return res.status(500).send(`EJS Render Error: ${err.message}<br><pre>${err.stack}</pre>`);
    }
    res.send(html);
  });
});

// POST Pay - Simulate payment gateway completion
router.post('/booking/pay', isLoggedIn, async (req, res) => {
  const order = req.session.checkoutOrder;
  if (!order) {
    return res.status(400).send('Session expired. Go back and select tickets again.');
  }

  // Teammate's note: Razorpay checkout sandbox is simulated here. 
  // We mock a payment ID and set state to Paid. If the user clicks pay, it's successful!
  const paymentId = 'pay_sandbox_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

  try {
    const bookingIds = [];

    for (let item of order.items) {
      // 1. Create a unique QR token
      const qrToken = `TICKET-${order.event_id}-${item.ticket_type_id}-${req.session.user.id}-${Date.now()}`;
      const qrCodeDataUrl = await generateQRCode(qrToken);

      // 2. Insert booking row
      const result = await dbQuery.run(
        `INSERT INTO bookings (user_id, event_id, ticket_type_id, quantity, total_amount, payment_id, payment_status, qr_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.session.user.id,
          order.event_id,
          item.ticket_type_id,
          item.quantity,
          item.total,
          paymentId,
          'paid', // Sandbox payment auto-confirmed
          qrCodeDataUrl // Base64 QR Image stored directly!
        ]
      );
      bookingIds.push(result.id);

      // 3. Update sold ticket capacity
      await dbQuery.run(
        `UPDATE ticket_types SET sold = sold + ? WHERE id = ?`,
        [item.quantity, item.ticket_type_id]
      );
    }

    // 4. Send Confirmation Notification in App
    await dbQuery.run(
      `INSERT INTO notifications (user_id, message)
       VALUES (?, ?)`,
      [
        req.session.user.id,
        `Booking confirmed for "${order.event_title}"! Check your tickets dashboard for QR codes.`
      ]
    );

    // 5. Simulate Email sending
    const attendeeEmail = req.session.user.email;
    const htmlEmail = `
      <div style="font-family: Arial, sans-serif; background-color: #121212; color: #ffffff; padding: 20px; border-radius: 8px;">
        <h2 style="color: #e50914;">Ticket Confirmed! EventSphere</h2>
        <p>Hi ${req.session.user.name},</p>
        <p>Your booking for <strong>${order.event_title}</strong> was successful!</p>
        <p><strong>Payment ID:</strong> ${paymentId}</p>
        <p><strong>Total Amount:</strong> Rs. ${order.total_amount}</p>
        <hr style="border: 0.5px solid #333;" />
        <p>Please log in to EventSphere to view and download your tickets containing the entry QR codes.</p>
        <p>Thank you for choosing EventSphere!</p>
      </div>
    `;
    // Send email confirmation in the background (non-blocking) to prevent SMTP delay hangs
    sendEmail({
      to: attendeeEmail,
      subject: `Ticket Confirmed: ${order.event_title}`,
      htmlBody: htmlEmail
    }).catch(err => {
      console.error('[Background Email Error]', err);
    });

    // Clear session checkout order
    delete req.session.checkoutOrder;

    res.redirect(`/booking/confirm?paymentId=${paymentId}`);

  } catch (err) {
    console.error('Error completing payment booking:', err);
    global.serverErrors = global.serverErrors || [];
    global.serverErrors.push({
      type: 'bookingPayPostError',
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      time: new Date().toISOString()
    });
    if (global.serverErrors.length > 50) global.serverErrors.shift();
    res.status(500).send('<script>alert("Payment transaction error. Please try again or contact support."); window.location.href="/";</script>');
  }
});

// GET Booking Confirmation Page
router.get('/booking/confirm', isLoggedIn, async (req, res) => {
  const paymentId = req.query.paymentId;
  if (!paymentId) {
    return res.redirect('/');
  }

  try {
    const bookingsList = await dbQuery.all(
      `SELECT b.*, t.name as ticket_name, e.title as event_title, e.start_date, e.venue_name, e.city
       FROM bookings b
       JOIN ticket_types t ON b.ticket_type_id = t.id
       JOIN events e ON b.event_id = e.id
       WHERE b.payment_id = ? AND b.user_id = ?`,
      [paymentId, req.session.user.id]
    );

    if (bookingsList.length === 0) {
      return res.redirect('/');
    }

    res.render('booking/confirm', { bookingsList, paymentId });
  } catch (err) {
    console.error('Error confirmation view:', err);
    res.redirect('/');
  }
});

// GET Select Tickets Page
router.get('/booking/:eventId', isLoggedIn, async (req, res) => {
  const eventId = req.params.eventId;
  try {
    const event = await dbQuery.get('SELECT * FROM events WHERE id = ?', [eventId]);
    if (!event) {
      return res.status(404).send('Event not found.');
    }

    const ticketTypes = await dbQuery.all('SELECT * FROM ticket_types WHERE event_id = ?', [eventId]);
    
    // Process early bird availability for pricing view
    const now = new Date();
    ticketTypes.forEach(ticket => {
      ticket.isEarlyBirdActive = false;
      if (ticket.early_bird_price && ticket.early_bird_expiry) {
        const expiry = new Date(ticket.early_bird_expiry);
        if (now < expiry) {
          ticket.isEarlyBirdActive = true;
        }
      }
    });

    res.render('booking/select', { event, ticketTypes, error: null });
  } catch (err) {
    console.error('Error rendering booking page:', err);
    global.serverErrors = global.serverErrors || [];
    global.serverErrors.push({
      type: 'selectTicketsGetError',
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      time: new Date().toISOString()
    });
    if (global.serverErrors.length > 50) global.serverErrors.shift();
    res.status(500).send(`Internal Server Error: ${err.message}<br><pre>${err.stack}</pre>`);
  }
});

// POST Select Tickets - Calculates price and redirects to Checkout
router.post('/booking/:eventId', isLoggedIn, async (req, res) => {
  const eventId = req.params.eventId;
  const discountCode = req.body.discount_code ? req.body.discount_code.trim().toUpperCase() : '';

  try {
    const event = await dbQuery.get('SELECT * FROM events WHERE id = ?', [eventId]);
    if (!event) {
      return res.status(404).send('Event not found');
    }

    const ticketTypes = await dbQuery.all('SELECT * FROM ticket_types WHERE event_id = ?', [eventId]);
    
    let items = [];
    let subtotal = 0;
    let totalDiscount = 0;
    let hasTickets = false;

    const now = new Date();

    for (let ticket of ticketTypes) {
      const qty = parseInt(req.body[`quantity_${ticket.id}`]) || 0;
      if (qty <= 0) continue;

      hasTickets = true;

      // Check capacity
      if (ticket.sold + qty > ticket.capacity) {
        return res.render('booking/select', {
          event,
          ticketTypes,
          error: `Sorry! Not enough capacity for ${ticket.name}. Only ${ticket.capacity - ticket.sold} left.`
        });
      }

      // Check early bird pricing
      let pricePerTicket = ticket.price;
      let usingEarlyBird = false;
      if (ticket.early_bird_price && ticket.early_bird_expiry) {
        const expiry = new Date(ticket.early_bird_expiry);
        if (now < expiry) {
          pricePerTicket = ticket.early_bird_price;
          usingEarlyBird = true;
        }
      }

      const itemTotal = pricePerTicket * qty;
      subtotal += itemTotal;

      // Check if ticket-specific code is applied
      let discountApplied = 0;
      if (discountCode && ticket.discount_code && ticket.discount_code.toUpperCase() === discountCode) {
        discountApplied = (itemTotal * ticket.discount_percent) / 100;
        totalDiscount += discountApplied;
      }

      items.push({
        ticket_type_id: ticket.id,
        name: ticket.name,
        price: pricePerTicket,
        quantity: qty,
        is_early_bird: usingEarlyBird,
        discount_applied: discountApplied,
        total: itemTotal - discountApplied
      });
    }

    if (!hasTickets) {
      return res.render('booking/select', {
        event,
        ticketTypes,
        error: 'Please select at least 1 ticket to book.'
      });
    }

    // Save transaction summary to session
    req.session.checkoutOrder = {
      event_id: eventId,
      event_title: event.title,
      event_city: event.city,
      items,
      subtotal,
      discount_applied: totalDiscount,
      total_amount: subtotal - totalDiscount,
      discount_code: discountCode
    };

    res.redirect('/booking/checkout');

  } catch (err) {
    console.error('Error calculating ticket prices:', err);
    global.serverErrors = global.serverErrors || [];
    global.serverErrors.push({
      type: 'selectTicketsPostError',
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      time: new Date().toISOString()
    });
    if (global.serverErrors.length > 50) global.serverErrors.shift();
    res.status(500).send(`Error calculating ticket prices: ${err.message}<br><pre>${err.stack}</pre>`);
  }
});

module.exports = router;
