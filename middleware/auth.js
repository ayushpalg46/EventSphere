function isLoggedIn(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  req.session.redirectTo = req.originalUrl;
  res.redirect('/login');
}

function isOrganiser(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'organiser') {
    return next();
  }
  res.status(403).render('pages/error', {
    title: 'Organiser Access Required',
    message: 'Only registered event organisers can access this panel. If you are logged in as an attendee, please logout and switch accounts.'
  });
}

function isAttendee(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'attendee') {
    return next();
  }
  res.status(403).render('pages/error', {
    title: 'Attendee Access Required',
    message: 'This section is reserved for event attendees. Organisers cannot book tickets.'
  });
}

function injectUser(req, res, next) {
  res.locals.req = req;
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
