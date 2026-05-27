


const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { dbQuery } = require('../database/db');


router.get('/register', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('auth/register', { error: null, success: null });
});


router.post('/register', async (req, res) => {
  const { name, email, password, confirmPassword, role, phone, city } = req.body;

  
  if (!name || !email || !password || !role) {
    return res.render('auth/register', { error: 'Please fill in all required fields.', success: null });
  }

  if (password !== confirmPassword) {
    return res.render('auth/register', { error: 'Passwords do not match.', success: null });
  }

  try {
    
    const existingUser = await dbQuery.get('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.render('auth/register', { error: 'Email already registered. Please login.', success: null });
    }

    
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    
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


router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('auth/login', { error: null });
});


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

    
    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.render('auth/login', { error: 'Invalid email or password.' });
    }

    
    const newVisitCount = (user.visit_count || 0) + 1;
    await dbQuery.run('UPDATE users SET visit_count = ? WHERE id = ?', [newVisitCount, user.id]);

    
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


router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log('Error destroying session:', err);
    }
    res.redirect('/');
  });
});

module.exports = router;
