// utils/db.js

const sqlite3 = require('better-sqlite3');
const path = require('path');

// Define the database file path
const dbPath = path.join(__dirname, '..', 'sms_logs.db');
let db;

/**
 * Initializes the database connection and creates the sms_records table if it doesn't exist.
 */
function initializeDb() {
    try {
        db = sqlite3(dbPath); // Open the database file
        console.log(`SQLite database connected at ${dbPath}`);

        // Create sms_records table if it doesn't exist
        const createTableSql = `
            CREATE TABLE IF NOT EXISTS sms_records (
                sid TEXT PRIMARY KEY,        -- Twilio Message SID (unique identifier)
                toPhoneNumber TEXT NOT NULL, -- Recipient's phone number
                messageBody TEXT NOT NULL,   -- Content of the SMS message
                senderUserId TEXT NOT NULL,  -- ID of the user who sent the SMS
                status TEXT NOT NULL,        -- Current status of the SMS (e.g., 'queued', 'sent', 'delivered', 'failed')
                createdAt INTEGER NOT NULL,  -- Timestamp when the SMS record was created (Unix epoch milliseconds)
                updatedAt INTEGER NOT NULL,  -- Timestamp when the SMS record was last updated
                errorCode TEXT,              -- Twilio error code if message failed
                errorMessage TEXT,           -- Twilio error message if message failed
                recipientName TEXT,          -- NEW: Name of the recipient
                senderName TEXT              -- NEW: Name of the sender (logged-in user)
            );
        `;
        db.exec(createTableSql);
        console.log('SQLite table "sms_records" ensured.');

        // Optional: Add new columns if they don't exist (for existing databases)
        // This is a common pattern for schema migrations in SQLite
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
        process.exit(1); // Exit if database cannot be initialized
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
    const { sid, toPhoneNumber, messageBody, senderUserId, status, errorCode, errorMessage, recipientName, senderName } = record;
    const now = Date.now();
    try {
        const stmt = db.prepare(`
            INSERT INTO sms_records (sid, toPhoneNumber, messageBody, senderUserId, status, createdAt, updatedAt, errorCode, errorMessage, recipientName, senderName)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(sid, toPhoneNumber, messageBody, senderUserId, status, now, now, errorCode, errorMessage, recipientName, senderName);
        console.log(`Inserted SMS record for SID: ${sid}`);
    } catch (error) {
        // If the SID already exists (e.g., due to a retry or callback race condition),
        // attempt to update instead of insert.
        if (error.message.includes('UNIQUE constraint failed')) {
            console.warn(`SMS record with SID ${sid} already exists. Attempting to update status instead.`);
            updateSmsStatus(sid, status, errorCode, errorMessage); // Re-use update function
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
            console.log(`Updated SMS record SID ${sid} to status: ${status}`);
        } else {
            console.warn(`No SMS record found to update for SID: ${sid}. Status: ${status}`);
            // This might happen if the callback arrives before the initial insert (race condition)
            // Or if the SID is genuinely not in our database.
            // In a more robust system, you might re-insert here or log for manual review.
        }
    } catch (error) {
        console.error(`Error updating SMS record SID ${sid}:`, error.message);
    }
}

// Initialize the database when this module is required
initializeDb();

module.exports = {
    getDb,
    insertSmsRecord,
    updateSmsStatus
};
