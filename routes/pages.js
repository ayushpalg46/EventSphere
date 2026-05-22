// routes/pages.js — Static informational pages
const express = require('express');
const router  = express.Router();

// Privacy Policy
router.get('/privacy-policy', (req, res) => {
  res.render('pages/privacy-policy', { user: res.locals.user || null });
});

// Documentation
router.get('/docs', (req, res) => {
  res.render('pages/docs', { user: res.locals.user || null });
});

// Contact Developer — GET
router.get('/contact', (req, res) => {
  res.render('pages/contact', { user: res.locals.user || null, success: null });
});

// Contact Developer — POST (log the message; no real mailer needed)
router.post('/contact', (req, res) => {
  const { name, email, type, message } = req.body;
  console.log(`[Contact Form] From: ${name} <${email}> | Type: ${type}\n${message}\n`);
  res.render('pages/contact', {
    user: res.locals.user || null,
    success: `Thanks ${name}! Your message has been received. I'll get back to you at ${email} soon.`
  });
});

module.exports = router;
