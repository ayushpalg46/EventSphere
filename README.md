# EventSphere — End-to-End Event Management & Ticketing Platform

EventSphere is a complete full-stack event discovery, booking, and ticket verification platform. Developed as a college hackathon submission (DevFusion 2.0), this application enables seamless event creation, multi-tier ticket management, sandbox checkout payments, automatic QR code ticket generation, and live WebRTC camera-based check-in verification.

🌐 **Live Website**: [https://eventsphere-f6yl.onrender.com](https://eventsphere-f6yl.onrender.com)

---

### 🎨 Design System & Aesthetics
- **Color Palette**: Antigravity-style theme with a Google tricolour (Red/Yellow/Blue/Green) floating blobs background animation, a dot-grid background mesh, and smooth mouse-parallax card-hover effects.
- **Visuals**: Modern, responsive, premium glassmorphic UI components with 3D card tilt effects.
- **Typography**: Clean geometric typography loaded via Google Fonts.

---

### 🛠️ Core Features Built

#### 1. Event Discovery & Ticketing (Attendee Side)
- **Filters & Search**: Browse active events, search keywords, or filter by category, city, price range, and date limits (Today, Tomorrow, Weekend, 30 days).
- **Rich Event Details**: Displays schedules/timelines, speaker designates, FAQs, user reviews, and attendee LinkedIn networking cards.
- **Wishlist & Reminders**: Wishlist events directly with database notifications.
- **Simulated Payment Gateway**: Smooth mock checkout flow generating ticket bookings upon fake payment gateway callbacks.
- **In-App Notifications**: Centralized user notification center for booking confirmations, reminders, and feedback.

#### 2. Event Creation & Management (Organiser Side)
- **Event Creator**: Form support for description details, category, physical address/venues, or virtual/online stream links.
- **Multi-Tier Ticket releases**: Add multiple pricing tiers (General, VIP, Early Bird) with custom capacities, individual coupon codes, and early bird pricing expiry schedules.
- **Organiser Management Portal**: Real-time sales metrics (tickets sold, gross revenue, check-in percentages) built via concurrent SQL queries, registration logs, simulated payouts, and attendee list download (CSV format).
- **Refund Requests Flow**: Manage refund requests, approve/reject refunds, and automatically restore ticket release capacity.

#### 3. Utilities & Background Workers
- **QR Code Generator**: Generates Base64 QR code image tokens on ticket confirmation.
- **CSV Exporter**: Compiles organiser registration logs to standard download formats.
- **WebRTC Camera Scanner**: Direct check-in ticket validation scanner using camera devices with overlay reticle templates and success sound effects.
- **Feedback Cron Scheduler**: Background cron worker scanning for ended events to dispatch post-event feedback request emails.

---

### 🛠️ Tech Stack Used

- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript, EJS Template Engine
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (pg module with client connection pool, auto-initialized schemas)
- **Session Store**: `connect-pg-simple` backed by PostgreSQL database
- **Security**: `bcryptjs` password hashing, `express-session` cookies

---

### 🚀 Running the Project Locally

#### 1. Prerequisites
- Node.js installed (v16+)
- PostgreSQL database instance running locally or hosted online (e.g. Neon, Supabase)

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Configure Environment Variables
Create a `.env` file in the root directory (using [.env.example](file:///c:/EVENTSPHERE/.env.example) as template):
```env
PORT=3000
DATABASE_URL=your_postgresql_connection_string
SESSION_SECRET=your_secret_session_key
# Optional SMTP configuration for email dispatch
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

#### 4. Seed Database (Optional)
Run the seed script to automatically create schemas and populate sample events/users data:
```bash
node database/seed.js
```

#### 5. Start Server
```bash
npm start
```
The server will start running at [http://localhost:3000](http://localhost:3000).

---

### 🔑 Test Credentials & Payment Sandbox

#### Test Accounts
- **Organiser Role**:
  - Email: `organiser@eventsphere.com`
  - Password: `password123`
- **Attendee Role**:
  - Email: `attendee@eventsphere.com`
  - Password: `password123`

#### Sandbox Payment Details
- **Razorpay Test Mode**: Integrated simulator. Clicking "Pay Now" on the checkout page mocks the payment gateway callback, generates the booking, issues a unique QR code, and triggers email confirmation. No real card details are needed.

---

### 📝 Project Details

- **Problem Statement Chose**: Event Management & Ticketing Platform
- **Team Name**: TechDev
- **Team Members & Roles**:
  - **AYUSH.G.PAL** — Backend Engineering, Database Architecture, API Implementation, Security
  - **Tanish Sunil Kotian** — Frontend Design, UI Styling, Aesthetics, WebRTC QR Scanner Integration

---

### ⚠️ Known Bugs & Limitations
- **WebRTC Camera Permissions**: Browser security policies restrict camera access to HTTPS connections in production. If hosted without SSL, the check-in scanner will fall back to manual text code verification.
- **Email Delivery**: SMTP dispatch defaults to console logs if email credentials are not set up in the `.env` file.

