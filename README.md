# Harvest Church Messenger

Node/Express app for Harvest Church staff to target groups from Breeze ChMS, send and track SMS via Twilio, and forward inbound replies to the original sender over email.

## Features
- Google OAuth sign-in before any messaging tools are accessible.
- Tag-based people filtering from Breeze ChMS with nested folders.
- Bulk SMS sending through Twilio with per-recipient status logging.
- SQLite-backed history (`sms_logs.db`) for delivery state, sender, recipient name, and message body.
- Twilio status callbacks update delivery states; inbound replies are forwarded to the original sender via SMTP.
- Minimal theming via `APP_LOGO_URL` and simple logo injection for login/app shells.

## Architecture
- **Server:** Node.js + Express, Passport (Google OAuth), express-session.
- **Data:** better-sqlite3 for synchronous, low-overhead persistence.
- **External services:** Breeze API for people/tags; Twilio for outbound SMS + callbacks; Nodemailer SMTP for reply forwarding.
- **Frontend:** Static HTML/CSS/JS served from `public/`, protected by auth.

## Getting Started
1) Install dependencies:
```bash
npm install
```
2) Copy environment template and fill in values:
```bash
cp .env.example .env
```
   - `GOOGLE_CALLBACK_URL` must match the redirect URI configured in Google Cloud (e.g., `http://localhost:3000/auth/google/callback` in local dev).
   - `SERVER_BASE_URL` must be publicly reachable for Google OAuth and Twilio callbacks (use a tunnel like ngrok when running locally).
   - Configure Twilio webhooks to point to:
     - `POST {SERVER_BASE_URL}/twilio-status-callback`
     - `POST {SERVER_BASE_URL}/twilio-reply-callback`
3) Start the app:
```bash
npm run dev   # auto-reload with nodemon
# or
npm start
```
4) Visit the app at `http://localhost:3000`, sign in with Google, apply tag filters, and send SMS messages.

## Environment Variables
See `.env.example` for the full list. Required highlights:
- **Auth:** `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- **Breeze:** `BREEZE_API_KEY`, `BREEZE_SUBDOMAIN`
- **Twilio:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `SERVER_BASE_URL`
- **Email:** `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `NOREPLY_EMAIL`
- **UI:** `APP_LOGO_URL` (optional logo override)

## Data & Storage
- SQLite database lives at `sms_logs.db` in the project root and is created/migrated automatically.
- SMS history is ordered newest-first and includes delivery status updates from Twilio callbacks.

## Development Notes
- Authentication protects all `/api` routes and the main UI; unauthenticated API calls return `401` JSON.
- Phone numbers are normalized to E.164 to avoid duplicate records and reduce Twilio errors.
- The login and app shells are loaded from cached templates on startup to avoid per-request disk I/O.
