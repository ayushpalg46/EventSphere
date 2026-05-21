// server.js
// Main entry point for EventSphere Event Management and Ticketing Platform
// Built by Ayush - 2nd Year Computer Science student (Hackathon submission)
// Comments added to help my team members understand the flow!

require('dotenv').config();

// Global Debug Log Arrays
global.serverErrors = [];
global.requestLogs = [];

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  global.serverErrors.push({
    type: 'uncaughtException',
    message: err.message,
    stack: err.stack,
    time: new Date().toISOString()
  });
  if (global.serverErrors.length > 50) global.serverErrors.shift();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
  global.serverErrors.push({
    type: 'unhandledRejection',
    message: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : null,
    time: new Date().toISOString()
  });
  if (global.serverErrors.length > 50) global.serverErrors.shift();
});

const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const path = require('path');
const fs = require('fs');

const { pool, dbQuery } = require('./database/db');
const { injectUser } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup directories
const uploadsDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 1. View Engine Setup (using EJS because React was too complex for a 48h hackathon)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 2. Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 3. Database-backed Session Store (so nodemon restart doesn't log us out!)
// Note: connect-pg-simple uses the 'session' table in PostgreSQL
app.use(
  session({
    store: new pgSession({
      pool: pool,
      tableName: 'session'
    }),
    secret: process.env.SESSION_SECRET || 'eventsphere_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
  })
);

// Inject user session into EJS views automatically
app.use(injectUser);

// Request Logger Middleware for diagnostics
app.use((req, res, next) => {
  const logEntry = {
    time: new Date().toISOString(),
    method: req.method,
    url: req.url,
    body: { ...req.body },
    query: req.query,
    session: req.session ? {
      user: req.session.user,
      checkoutOrder: req.session.checkoutOrder,
      redirectTo: req.session.redirectTo
    } : null
  };
  if (logEntry.body.password) logEntry.body.password = '***';
  
  global.requestLogs.push(logEntry);
  if (global.requestLogs.length > 50) {
    global.requestLogs.shift();
  }
  next();
});

// 4. Import Route files
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const bookingRoutes = require('./routes/booking');
const organiserRoutes = require('./routes/organiser');
const userRoutes = require('./routes/user');
const checkinRoutes = require('./routes/checkin');
const communityRoutes = require('./routes/community');
const aiRoutes = require('./routes/ai');
const pageRoutes = require('./routes/pages');

app.get('/test-version-check', (req, res) => {
  res.send('Version 5 Debug Enabled');
});

app.get('/debug-logs', (req, res) => {
  if (req.query.code !== 'ayush_debug_2026') {
    return res.status(403).send('Forbidden: Invalid debug code.');
  }
  res.json({
    errors: global.serverErrors || [],
    requests: global.requestLogs || []
  });
});

// Register Routes
app.use(authRoutes);
app.use(eventRoutes);
app.use(bookingRoutes);
app.use(organiserRoutes);
app.use(userRoutes);
app.use(checkinRoutes);
app.use(communityRoutes);
app.use(aiRoutes);
app.use(pageRoutes);

// Landing page route
app.get('/', async (req, res) => {
  try {
    // Fetch upcoming events for landing slider / list
    const featuredEvents = await dbQuery.all(
      `SELECT e.id, e.title, e.category, e.banner_image, e.venue_name, e.city, e.start_date, e.end_date, e.status, MIN(t.price) as "minPrice", MAX(t.price) as "maxPrice" 
       FROM events e 
       LEFT JOIN ticket_types t ON e.id = t.event_id 
       WHERE e.status = 'upcoming' 
       GROUP BY e.id 
       ORDER BY e.start_date ASC LIMIT 6`
    );

    // List of cities for search bar
    const defaultCities = ['Delhi', 'Noida', 'Gurgaon', 'Mumbai', 'Bengaluru', 'Pune', 'Goa', 'Hyderabad', 'Chennai', 'Kolkata'];
    const citiesRows = await dbQuery.all('SELECT DISTINCT city FROM events WHERE city != \'\' AND city IS NOT NULL');
    const dbCities = citiesRows.map(r => r.city);
    const cities = Array.from(new Set([...defaultCities, ...dbCities])).sort();

    res.render('index', { featuredEvents, cities });
  } catch (err) {
    console.error('Error on landing page:', err);
    res.status(500).send('Internal Server Error');
  }
});

// Customer Helpline Support Page
app.get('/help', (req, res) => {
  res.render('pages/help', { success: null });
});

// Post Customer Help Form
app.post('/help', (req, res) => {
  const { name, email, query_subject, message } = req.body;
  // A student would save this to a log file or just render success!
  console.log(`[Helpdesk] Query from ${name} (${email}): [${query_subject}] ${message}`);
  res.render('pages/help', { success: 'Your query has been logged. Our customer help team will contact you shortly!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('pages/help', { success: '404 - Page not found. Need support? File a ticket below.' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('GLOBAL ERROR:', err);
  
  global.serverErrors = global.serverErrors || [];
  global.serverErrors.push({
    type: 'globalMiddlewareError',
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    time: new Date().toISOString()
  });
  if (global.serverErrors.length > 50) global.serverErrors.shift();

  res.status(500).send(`<h3>Global Server Error</h3><p><b>${err.message}</b></p><pre>${err.stack}</pre>`);
});

// Listen
const { initDatabase } = require('./database/db');
const { startFeedbackCron } = require('./utils/feedbackCron');

initDatabase().then(() => {
  // Start background feedback cron worker
  startFeedbackCron();

  app.listen(PORT, () => {
    console.log(`EventSphere server is running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser to test.`);
  });
}).catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});

