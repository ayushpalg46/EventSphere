# EventSphere — End-to-End Event Management & Ticketing Platform

Welcome to **EventSphere**, a complete full-stack event discovery, booking, and check-in platform. This project was developed as a submission for our college hackathon challenge.

It features a high-contrast dark space design, interactive ticket selector/checkout screens, sandbox payment simulations, and client-side check-in poll trackers.

---

## 🎨 Design System & Aesthetic Reference
This interface is inspired by high-contrast futuristic dark modes, utilizing a quad-color block palette:
- **Primary Void**: Pure Black `#000000` (used for standard backgrounds)
- **High Signal**: High-contrast White `#ffffff` (for readability)
- **Alert Accent**: Vibrant Crimson `#ff0033` (primary CTAs & notifications)
- **Warning Highlight**: Electric Yellow `#ffff00` (hover states & secondary items)
- **Typography**: The geometric sans-serif **Sora** font family is used globally.
- **Strict Sharp Edges**: All border-radii properties on cards, forms, inputs, and buttons are set to `0px` to maintain a monolithic, precise structure.
- **Wireframe Atmosphere**: A slow-moving 3D perspective wireframe grid flows in the background.

---

## 🛠️ Core Features Implemented

### 1. Event Creation & Management (Organiser Side)
- **Dynamic Event Creator**: Support for category filters, physical venues, or virtual/online stream links.
- **Multi-Tier Ticket releases**: Add multiple pricing tiers (General, VIP, Early Bird) with custom capacities, individual coupon codes, and early bird pricing expiry schedules.
- **Organiser Management Portal**: gross ticket revenue analytics, list of registrations, simulated payouts, and attendee list download (CSV format).
- **Refund Requests Flow**: View refund requests, and approve or reject them. Approving automatically restores ticket release capacity.

### 2. Event Discovery & Ticketing (Attendee Side)
- **Browse & Filters**: Browse active events, search keywords, or filter by category, city, price range, and date limits (Today, Tomorrow, Weekend, 30 days).
- **Rich Event details page**: Displays schedule timelines, speaker avatars, FAQs, reviews, and attendee LinkedIn networking cards.
- **Wishlist & Reminders**: Wishlist events directly. Simulates reminders by pushing database notifications.
- **Simulated Payment Gateway**: Seamless integration of a mock **Razorpay Secure Checkout Portal**. Input card/UPI details and experience bank authentication OTP screens with loading spinners.
- **Printable Entry Passes**: Access Base64 QR-code entry tickets, and print/save them directly as PDFs.

### 3. Live Check-In Desk
- Organisers can load the check-in panel on show day.
- Simulates scanning by entering Booking IDs or QR tokens.
- Short-polling AJAX requests keep the live checked-in counter and registration percentages updated in real-time.

### 4. AI-Powered Assistants (Gemini API)
- **AI Event Description**: Organiser enters bullet points $\rightarrow$ calls Gemini API to draft engaging description pages.
- **Smart Schedule Builder**: Reorders session times for optimal audience flow based on speaker names $\rightarrow$ parses JSON responses.
- *Includes pre-configured offline HTML template fallbacks if no Gemini API keys are active.*

---

## 📂 Tech Stack
- **Backend Runtime**: Node.js & Express.js
- **Database Engine**: SQLite (`sqlite3` module wrapping queries with native Promises)
- **Session Manager**: `express-session` backed by a `connect-sqlite3` session store (survives restarts)
- **Asset Uploads**: Multer image filter configurations
- **Ticket Codes**: `qrcode` base64 encoders
- **Template Engine**: EJS (Embedded JavaScript) layouts
- **Theme styles**: Custom Vanilla CSS variables

---

## 🚀 Setting Up Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
Create a `.env` file in the root directory:
```env
PORT=3000
SESSION_SECRET=eventsphere_your_local_secret_key
DB_PATH=./database/eventsphere.db
GEMINI_API_KEY=your_google_gemini_api_key
```

### 3. Seed Database
Initialize tables and sample events:
```bash
node database/seed.js
```

### 4. Start Server
Run in development mode (using nodemon):
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser!

---

## 🔑 Default Test Accounts
- **Organiser Panel Login**: `organiser@eventsphere.com` / `password123`
- **Attendee Booking Login**: `attendee@eventsphere.com` / `password123`
