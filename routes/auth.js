// routes/auth.js
// Login, Registration, Logout routes
// Created by Ayush

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { dbQuery } = require('../database/db');

// Registration Page GET
router.get('/register', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('auth/register', { error: null, success: null });
});

// Registration POST
router.post('/register', async (req, res) => {
  const { name, email, password, confirmPassword, role, phone, city } = req.body;

  // Basic validation
  if (!name || !email || !password || !role) {
    return res.render('auth/register', { error: 'Please fill in all required fields.', success: null });
  }

  if (password !== confirmPassword) {
    return res.render('auth/register', { error: 'Passwords do not match.', success: null });
  }

  try {
    // Check if user already exists
    const existingUser = await dbQuery.get('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.render('auth/register', { error: 'Email already registered. Please login.', success: null });
    }

    // Hash password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    // Save to database
    await dbQuery.run(
      `INSERT INTO users (name, email, password, role, phone, city, visit_count)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [name, email, hashedPassword, role, phone || '', city || '']
    );

    res.render('auth/register', { error: null, success: 'Registration successful! You can now login.' });
  } catch (err) {
    console.error('Registration Error:', err);
    res.render('auth/register', { error: 'Database error. Please try again.', success: null });
  }
});

// Login Page GET
router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('auth/login', { error: null });
});

// Login POST
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render('auth/login', { error: 'Please enter email and password.' });
  }

  try {
    const user = await dbQuery.get('SELECT * FROM users WHERE email = ?', [email]);

    if (!user) {
      return res.render('auth/login', { error: 'Invalid email or password.' });
    }

    // Check password
    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.render('auth/login', { error: 'Invalid email or password.' });
    }

    // Update visit count for tracking session across devices
    const newVisitCount = (user.visit_count || 0) + 1;
    await dbQuery.run('UPDATE users SET visit_count = ? WHERE id = ?', [newVisitCount, user.id]);

    // Store user session (except password for security)
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
      city: user.city,
      linkedin_url: user.linkedin_url,
      share_linkedin: user.share_linkedin,
      visit_count: newVisitCount
    };

    console.log(`[Auth] User ${user.name} logged in. Total visits: ${newVisitCount}`);

    // Redirect to saved path or dashboard based on role, avoiding role-mismatch 403 locks
    let redirectUrl = req.session.redirectTo;
    delete req.session.redirectTo;

    if (redirectUrl) {
      if (redirectUrl.includes('/organiser/') && user.role !== 'organiser') {
        redirectUrl = '/';
      } else if (redirectUrl.includes('/user/') && user.role !== 'attendee') {
        redirectUrl = '/organiser/dashboard';
      }
    } else {
      redirectUrl = user.role === 'organiser' ? '/organiser/dashboard' : '/';
    }

    res.redirect(redirectUrl);

  } catch (err) {
    console.error('Login Error:', err);
    res.render('auth/login', { error: 'An error occurred. Please try again.' });
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log('Error destroying session:', err);
    }
    res.redirect('/');
  });
});

module.exports = router;
