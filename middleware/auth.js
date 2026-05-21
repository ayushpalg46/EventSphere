// middleware/auth.js
// Authentication middleware created by Ayush
// 2nd Year project code

function isLoggedIn(req, res, next) {
  // Debug note: console.log("Checking if user is logged in... Session:", req.session);
  if (req.session && req.session.user) {
    return next();
  }
  // User is not logged in, redirect them to login page
  req.session.redirectTo = req.originalUrl; // Save where they wanted to go!
  res.redirect('/login');
}

function isOrganiser(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'organiser') {
    return next();
  }
  // Access denied! Render beautiful error page
  res.status(403).render('pages/error', {
    title: 'Organiser Access Required',
    message: 'Only registered event organisers can access this panel. If you are logged in as an attendee, please logout and switch accounts.'
  });
}

function isAttendee(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'attendee') {
    return next();
  }
  // Access denied! Render beautiful error page
  res.status(403).render('pages/error', {
    title: 'Attendee Access Required',
    message: 'This section is reserved for event attendees. Organisers cannot book tickets.'
  });
}

// Automatically pass session user to all views so we don't have to pass it manually in every res.render!
function injectUser(req, res, next) {
  res.locals.req = req; // Expose req to all EJS views automatically
  if (req.session && req.session.user) {
    res.locals.user = req.session.user;
  } else {
    res.locals.user = null;
  }
  next();
}

module.exports = {
  isLoggedIn,
  isOrganiser,
  isAttendee,
  injectUser
};
