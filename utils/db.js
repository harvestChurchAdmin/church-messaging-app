// utils/db.js

const sqlite3 = require('better-sqlite3');
const path = require('path');

// Define the database file path
const dbPath = path.join(__dirname, '..', 'sms_logs.db');
let db;

/**
 * Normalizes a phone number to E.164 format (e.g., +12501234567).
 * Assumes North American numbers if no country code is present.
 * This function is duplicated here for immediate fix; ideally, this would be in a shared utility.
 * @param {string} phoneNumber - The phone number to normalize.
 * @returns {string} The normalized E.164 phone number.
 */
function normalizePhoneNumber(phoneNumber) {
    if (!phoneNumber) return '';
    let cleaned = phoneNumber.replace(/\D/g, ''); // Remove all non-digit characters

    // Basic North American assumption: if 10 digits and no leading '1', prepend '1'.
    // Then ensure it starts with a '+'
    if (cleaned.length === 10 && !cleaned.startsWith('1')) {
        cleaned = '1' + cleaned;
    }
    if (!cleaned.startsWith('+')) {
        cleaned = '+' + cleaned;
    }
    console.log(`[normalizePhoneNumber] Input: "${phoneNumber}", Output: "${cleaned}"`);
    return cleaned;
}

/**
 * Initializes the database connection and creates necessary tables if they don't exist.
 */
function initializeDb() {
    try {
        db = sqlite3(dbPath); // Open the database file
        console.log(`SQLite database connected at ${dbPath}`);

        // Create sms_records table if it doesn't exist
        const createSmsRecordsTableSql = `
            CREATE TABLE IF NOT EXISTS sms_records (
                sid TEXT PRIMARY KEY,       -- Twilio Message SID (unique identifier)
                toPhoneNumber TEXT NOT NULL, -- Recipient's phone number
                messageBody TEXT NOT NULL,   -- Content of the SMS message
                senderUserId TEXT NOT NULL,  -- ID of the user who sent the SMS
                status TEXT NOT NULL,        -- Current status of the SMS (e.g., 'queued', 'sent', 'delivered', 'failed')
                createdAt INTEGER NOT NULL,  -- Timestamp when the SMS record was created (Unix epoch milliseconds)
                updatedAt INTEGER NOT NULL,  -- Timestamp when the SMS record was last updated
                errorCode TEXT,              -- Twilio error code if message failed
                errorMessage TEXT,           -- Twilio error message if message failed
                recipientName TEXT,          -- Name of the recipient
                senderName TEXT              -- Name of the sender (logged-in user)
            );
        `;
        db.exec(createSmsRecordsTableSql);
        console.log('SQLite table "sms_records" ensured.');

        // --- NEW: Create users table if it doesn't exist ---
        const createUsersTableSql = `
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                googleId TEXT UNIQUE NOT NULL,      -- Google's unique ID for the user
                displayName TEXT,                   -- User's display name from Google
                email TEXT UNIQUE,                  -- User's email from Google (should be unique for login)
                photo TEXT,                         -- URL to user's Google profile picture
                createdAt INTEGER NOT NULL,         -- Timestamp when the user record was created
                lastLoginAt INTEGER NOT NULL        -- Timestamp of the user's last login
            );
        `;
        db.exec(createUsersTableSql);
        console.log('SQLite table "users" ensured.');
        // --- END NEW ---

        // Optional: Add new columns if they don't exist (for existing databases)
        const addRecipientNameColumnSql = "ALTER TABLE sms_records ADD COLUMN recipientName TEXT";
        const addSenderNameColumnSql = "ALTER TABLE sms_records ADD COLUMN senderName TEXT";

        try {
            db.exec(addRecipientNameColumnSql);
            console.log('Added recipientName column to sms_records table.');
        } catch (e) {
            if (!e.message.includes('duplicate column name')) {
                console.error('Error adding recipientName column:', e.message);
            }
        }
        try {
            db.exec(addSenderNameColumnSql);
            console.log('Added senderName column to sms_records table.');
        } catch (e) {
            if (!e.message.includes('duplicate column name')) {
                console.error('Error adding senderName column:', e.message);
            }
        }

    } catch (error) {
        console.error('Error initializing SQLite database:', error.message);
        process.exit(1);
    }
}

/**
 * Returns the initialized database instance.
 * @returns {betterSqlite3.Database} The database instance.
 */
function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call initializeDb() first.');
    }
    return db;
}

/**
 * Inserts a new SMS record into the database.
 * @param {object} record - The SMS record object.
 * @param {string} record.sid - Twilio Message SID.
 * @param {string} record.toPhoneNumber - Recipient's phone number.
 * @param {string} record.messageBody - Content of the message.
 * @param {string} record.senderUserId - ID of the user who sent the SMS.
 * @param {string} record.status - Initial status of the SMS.
 * @param {string} [record.errorCode] - Twilio error code if available.
 * @param {string} [record.errorMessage] - Twilio error message if available.
 * @param {string} [record.recipientName] - Name of the recipient.
 * @param {string} [record.senderName] - Name of the sender.
 */
function insertSmsRecord(record) {
    const { sid, messageBody, senderUserId, status, errorCode, errorMessage, recipientName, senderName } = record;
    const normalizedToPhoneNumber = normalizePhoneNumber(record.toPhoneNumber); // Ensure normalization here
    const now = Date.now();
    try {
        const stmt = db.prepare(`
            INSERT INTO sms_records (sid, toPhoneNumber, messageBody, senderUserId, status, createdAt, updatedAt, errorCode, errorMessage, recipientName, senderName)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(sid, normalizedToPhoneNumber, messageBody, senderUserId, status, now, now, errorCode, errorMessage, recipientName, senderName);
        console.log(`Inserted SMS record for SID: ${sid} with normalized number "${normalizedToPhoneNumber}".`);
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            console.warn(`SMS record with SID ${sid} already exists. Attempting to update status instead.`);
            updateSmsStatus(sid, status, errorCode, errorMessage);
        } else {
            console.error(`Error inserting SMS record for SID ${sid}:`, error.message);
        }
    }
}

/**
 * Updates the status of an existing SMS record.
 * @param {string} sid - Twilio Message SID.
 * @param {string} status - New status of the SMS.
 * @param {string} [errorCode] - Twilio error code if available.
 * @param {string} [errorMessage] - Twilio error message if available.
 */
function updateSmsStatus(sid, status, errorCode = null, errorMessage = null) {
    const now = Date.now();
    try {
        const stmt = db.prepare(`
            UPDATE sms_records
            SET status = ?, updatedAt = ?, errorCode = ?, errorMessage = ?
            WHERE sid = ?
        `);
        const info = stmt.run(status, now, errorCode, errorMessage, sid);
        if (info.changes > 0) {
            console.log(`Updated SMS record SID ${sid} to status: ${status}.`);
        } else {
            console.warn(`No SMS record found to update for SID: ${sid}. Status: ${status}.`);
        }
    } catch (error) {
        console.error(`Error updating SMS record SID ${sid}:`, error.message);
    }
}

// --- Functions for User Management (required by Passport and email routing) ---

/**
 * Inserts a new user into the database or updates an existing one during login.
 * @param {object} userProfile - The user profile object from Passport/Google.
 * @returns {Object} The inserted or updated user record from the database.
 */
function upsertUser(userProfile) {
    const { googleId, displayName, email, photos } = userProfile;
    const now = Date.now();

    try {
        // Try to find an existing user
        let user = db.prepare('SELECT * FROM users WHERE googleId = ?').get(googleId);

        if (user) {
            // Update existing user's details and last login time
            const stmt = db.prepare(`
                UPDATE users
                SET displayName = ?, email = ?, photo = ?, lastLoginAt = ?
                WHERE googleId = ?
            `);
            stmt.run(displayName, email, photos?.[0]?.value, now, googleId);
            user = db.prepare('SELECT * FROM users WHERE googleId = ?').get(googleId); // Fetch updated user
            console.log(`Updated existing user: ${user.email}`);
        } else {
            // Insert new user
            const stmt = db.prepare(`
                INSERT INTO users (googleId, displayName, email, photo, createdAt, lastLoginAt)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            const info = stmt.run(googleId, displayName, email, photos?.[0]?.value, now, now);
            user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid); // Fetch newly inserted user
            console.log(`Inserted new user: ${user.email}`);
        }
        return user;
    } catch (error) {
        console.error('Error upserting user into DB:', error.message);
        throw error;
    }
}

/**
 * Finds a user by their database ID. Used by Passport's deserializeUser.
 * @param {number} id - The internal database ID of the user.
 * @returns {Object|null} The user object, or null if not found.
 */
function findUserById(id) {
    try {
        return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    } catch (error) {
        console.error('Error finding user by ID from DB:', error.message);
        throw error;
    }
}

/**
 * Finds a user by their Google ID. Used by Passport's serializeUser and email routing.
 * @param {string} googleId - The Google ID of the user.
 * @returns {Object|null} The user object, or null if not found.
 */
function findUserByGoogleId(googleId) {
    try {
        return db.prepare('SELECT * FROM users WHERE googleId = ?').get(googleId);
    } catch (error) {
        console.error('Error finding user by Google ID from DB:', error.message);
        throw error;
    }
}


/**
 * Retrieves the last SMS message sent from the app to a specific recipient number.
 * This is used to identify the original sender of the conversation.
 * @param {string} toPhoneNumber - The recipient's phone number.
 * @returns {Object|null} The last sent SMS record, or null if not found.
 */
function getLastSentSmsToNumber(toPhoneNumber) {
    const normalizedToPhoneNumber = normalizePhoneNumber(toPhoneNumber);
    console.log(`[db] Looking up last SMS for normalized number: "${normalizedToPhoneNumber}".`);

    const query = `
        SELECT sid, toPhoneNumber, messageBody, senderUserId, createdAt, messageBody AS originalMessageBody, recipientName
        FROM sms_records
        WHERE toPhoneNumber = ?
        ORDER BY createdAt DESC
        LIMIT 1;
    `;
    try {
        return db.prepare(query).get(normalizedToPhoneNumber);
    } catch (err) {
        console.error("Error getting last sent SMS from DB:", err.message);
        throw err;
    }
}

/**
 * Retrieves user details (including email and displayName) by their Google ID.
 * @param {string} googleId - The Google ID of the user.
 * @returns {Object|null} The user object, or null if not found.
 */
function getUserDetailsByGoogleId(googleId) {
    const query = `
        SELECT id, googleId, displayName, email
        FROM users
        WHERE googleId = ?;
    `;
    try {
        return db.prepare(query).get(googleId);
    } catch (err) {
        console.error("Error getting user details by Google ID from DB:", err.message);
        throw err;
    }
}


// Initialize the database when this module is required
initializeDb();

module.exports = {
    getDb,
    insertSmsRecord,
    updateSmsStatus,
    upsertUser,
    findUserById,
    findUserByGoogleId,
    getLastSentSmsToNumber,
    getUserDetailsByGoogleId
};
