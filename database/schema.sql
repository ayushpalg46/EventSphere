




CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  role TEXT DEFAULT 'attendee', 
  linkedin_url TEXT,
  share_linkedin INTEGER DEFAULT 0, 
  profile_pic TEXT,
  visit_count INTEGER DEFAULT 1, 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  organiser_id INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT, 
  banner_image TEXT,
  venue_name TEXT,
  venue_address TEXT,
  city TEXT,
  is_online INTEGER DEFAULT 0, 
  online_link TEXT,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  agenda TEXT, 
  speakers TEXT, 
  faq TEXT, 
  status TEXT DEFAULT 'upcoming', 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organiser_id) REFERENCES users(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS ticket_types (
  id SERIAL PRIMARY KEY,
  event_id INTEGER,
  name TEXT NOT NULL, 
  price REAL NOT NULL,
  capacity INTEGER NOT NULL,
  sold INTEGER DEFAULT 0,
  discount_code TEXT,
  discount_percent INTEGER DEFAULT 0,
  early_bird_price REAL,
  early_bird_expiry TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  event_id INTEGER,
  ticket_type_id INTEGER,
  quantity INTEGER DEFAULT 1,
  total_amount REAL NOT NULL,
  payment_id TEXT, 
  payment_status TEXT DEFAULT 'pending', 
  qr_code TEXT, 
  checked_in INTEGER DEFAULT 0, 
  checkin_time TIMESTAMP,
  feedback_sent INTEGER DEFAULT 0, 
  refund_status TEXT DEFAULT 'none', 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id)
);


CREATE TABLE IF NOT EXISTS wishlist (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  event_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, event_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);


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


CREATE TABLE IF NOT EXISTS payouts (
  id SERIAL PRIMARY KEY,
  organiser_id INTEGER,
  event_id INTEGER,
  amount REAL,
  status TEXT DEFAULT 'pending', 
  payout_date TIMESTAMP,
  FOREIGN KEY (organiser_id) REFERENCES users(id),
  FOREIGN KEY (event_id) REFERENCES events(id)
);


CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0, 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS session ( sid varchar NOT NULL COLLATE "default", sess json NOT NULL, expire timestamp(6) NOT NULL, PRIMARY KEY (sid) ); CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);
