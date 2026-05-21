-- database/schema.sql
-- Database schema for EventSphere.
-- Rebuilding the whole DB from scratch!

-- Table for users (Attendees & Organisers)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  role TEXT DEFAULT 'attendee', -- 'attendee' or 'organiser'
  linkedin_url TEXT,
  share_linkedin INTEGER DEFAULT 0, -- 0 for no, 1 for yes
  profile_pic TEXT,
  visit_count INTEGER DEFAULT 1, -- track number of visits / logins
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for events
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  organiser_id INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT, -- Music, Comedy, Tech, Sports, Movies
  banner_image TEXT,
  venue_name TEXT,
  venue_address TEXT,
  city TEXT,
  is_online INTEGER DEFAULT 0, -- 0 for physical, 1 for online
  online_link TEXT,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  agenda TEXT, -- stored as JSON string of sessions
  speakers TEXT, -- stored as JSON string of speakers
  faq TEXT, -- stored as JSON string of Q&A
  status TEXT DEFAULT 'upcoming', -- upcoming, live, ended, cancelled
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organiser_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Table for ticket types/tiers
CREATE TABLE IF NOT EXISTS ticket_types (
  id SERIAL PRIMARY KEY,
  event_id INTEGER,
  name TEXT NOT NULL, -- VIP, General, Early Bird
  price REAL NOT NULL,
  capacity INTEGER NOT NULL,
  sold INTEGER DEFAULT 0,
  discount_code TEXT,
  discount_percent INTEGER DEFAULT 0,
  early_bird_price REAL,
  early_bird_expiry TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Table for bookings / tickets purchased
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  event_id INTEGER,
  ticket_type_id INTEGER,
  quantity INTEGER DEFAULT 1,
  total_amount REAL NOT NULL,
  payment_id TEXT, -- dummy razorpay payment id
  payment_status TEXT DEFAULT 'pending', -- pending, paid, failed, refunded
  qr_code TEXT, -- unique booking token for QR code
  checked_in INTEGER DEFAULT 0, -- 0 for no, 1 for yes
  checkin_time TIMESTAMP,
  feedback_sent INTEGER DEFAULT 0, -- 0 for no, 1 for yes (requested after event ends)
  refund_status TEXT DEFAULT 'none', -- none, requested, approved, rejected
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id)
);

-- Table for Wishlist items
CREATE TABLE IF NOT EXISTS wishlist (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  event_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, event_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Table for Public Event Reviews/Ratings
CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  event_id INTEGER,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Table for Post-Event Feedback forms (auto-submitted or manual after event)
CREATE TABLE IF NOT EXISTS feedback (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  event_id INTEGER,
  rating INTEGER,
  satisfaction_score INTEGER,
  would_recommend INTEGER,
  comments TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Table for Organiser payout simulations
CREATE TABLE IF NOT EXISTS payouts (
  id SERIAL PRIMARY KEY,
  organiser_id INTEGER,
  event_id INTEGER,
  amount REAL,
  status TEXT DEFAULT 'pending', -- pending, processed
  payout_date TIMESTAMP,
  FOREIGN KEY (organiser_id) REFERENCES users(id),
  FOREIGN KEY (event_id) REFERENCES events(id)
);

-- Table for user notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0, -- 0 for unread, 1 for read
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS session ( sid varchar NOT NULL COLLATE "default", sess json NOT NULL, expire timestamp(6) NOT NULL, PRIMARY KEY (sid) ); CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);
