
const express = require('express');
const router  = express.Router();


router.get('/privacy-policy', (req, res) => {
  res.render('pages/privacy-policy', { user: res.locals.user || null });
});


router.get('/docs', (req, res) => {
  res.render('pages/docs', { user: res.locals.user || null });
});


router.get('/contact', (req, res) => {
  res.render('pages/contact', { user: res.locals.user || null, success: null });
});


router.post('/contact', (req, res) => {
  const { name, email, type, message } = req.body;
  console.log(`[Contact Form] From: ${name} <${email}> | Type: ${type}\n${message}\n`);
  res.render('pages/contact', {
    user: res.locals.user || null,
    success: `Thanks ${name}! Your message has been received. I'll get back to you at ${email} soon.`
  });
});

module.exports = router;
