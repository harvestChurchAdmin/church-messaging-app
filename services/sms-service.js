// services/sms-service.js

const twilio = require('twilio');
require('dotenv').config(); // Ensure environment variables are loaded
const db = require('../utils/db'); // Import the SQLite database utility

// Retrieve Twilio credentials from environment variables
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const SERVER_BASE_URL = process.env.SERVER_BASE_URL || 'http://localhost:3000'; // Base URL for callbacks

// Basic validation for Twilio credentials
if (!ACCOUNT_SID || !AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.error('Error: Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER) not set.');
    console.error('Please ensure your .env file contains these Twilio variables.');
    // Do NOT exit here, as other parts of the app might work. SMS will just fail.
}

// Initialize the Twilio client
const client = twilio(ACCOUNT_SID, AUTH_TOKEN);

/**
 * Sends an SMS message using Twilio and logs the event to the database.
 * @param {string} toPhoneNumber - The recipient's phone number (e.g., '+1234567890'). Can be comma-separated.
 * @param {string} messageBody - The text content of the message.
 * @param {string} senderUserId - The ID of the user who sent the message (for logging purposes).
 * @param {string} recipientName - The name of the recipient (e.g., "John Doe").
 * @param {string} senderName - The name of the logged-in user who sent the message.
 * @returns {Promise<Object>} A promise that resolves to an object indicating success and SIDs.
 */
async function sendSms(toPhoneNumber, messageBody, senderUserId, recipientName, senderName) {
    // Validate inputs before proceeding
    if (!toPhoneNumber || !messageBody || !senderUserId || !recipientName || !senderName) {
        throw new Error('Recipient phone number(s), message body, sender user ID, recipient name, and sender name are required.');
    }

    // Split comma-separated numbers and trim whitespace for individual sending
    const recipientNumbers = toPhoneNumber.split(',').map(num => num.trim()).filter(num => num);

    if (recipientNumbers.length === 0) {
        throw new Error('No valid recipient phone numbers provided.');
    }

    const smsPromises = recipientNumbers.map(async (number) => {
        let messageSid = null;
        let initialStatus = 'queued'; // Initial status before Twilio responds
        let errorMessage = null;
        let errorCode = null;

        try {
            // Construct the status callback URL for Twilio
            // This URL will be called by Twilio when the message status changes
            const statusCallbackUrl = `${SERVER_BASE_URL}/twilio-status-callback`;

            console.log(`[sms-service] Attempting to send message from ${TWILIO_PHONE_NUMBER} to ${number} (Recipient: ${recipientName}): "${messageBody}"`);
            console.log(`[sms-service] Twilio Status Callback URL: ${statusCallbackUrl}`);

            const message = await client.messages.create({
                body: messageBody,
                from: TWILIO_PHONE_NUMBER,
                to: number,
                statusCallback: statusCallbackUrl // Enable status callbacks
            });
            messageSid = message.sid;
            initialStatus = message.status; // Twilio's immediate status (e.g., 'queued')

            console.log(`[sms-service] SMS initiated successfully to ${number}. SID: ${message.sid}. Status: ${message.status}. Sent by user: ${senderUserId}`);
            
        } catch (singleSmsError) {
            console.error(`[sms-service] Failed to send SMS to ${number}:`, singleSmsError.message);
            initialStatus = 'failed_to_send'; // Custom status for internal sending failure
            errorMessage = singleSmsError.message;
            if (singleSmsError.code) {
                console.error(`[sms-service] Twilio Error Code for ${number}: ${singleSmsError.code}`);
                errorCode = String(singleSmsError.code); // Store as string
            }
            if (singleSmsError.moreInfo) {
                console.error(`[sms-service] Twilio More Info for ${number}: ${singleSmsError.moreInfo}`);
                errorMessage = `${errorMessage} | More Info: ${singleSmsError.moreInfo}`;
            }
            // If messageSid is not available (e.g., Twilio API call failed completely), generate a pseudo-SID
            messageSid = messageSid || `failed-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        } finally {
            // Always attempt to insert a record, even if sending failed
            try {
                db.insertSmsRecord({
                    sid: messageSid,
                    toPhoneNumber: number,
                    messageBody: messageBody,
                    senderUserId: senderUserId,
                    status: initialStatus,
                    errorCode: errorCode,
                    errorMessage: errorMessage,
                    recipientName: recipientName, // NEW: Store recipient name
                    senderName: senderName        // NEW: Store sender name
                });
                console.log(`[sms-service] SMS record inserted/updated for SID ${messageSid}.`);
            } catch (dbError) {
                console.error(`[sms-service] CRITICAL: Failed to save SMS record to DB for SID ${messageSid}:`, dbError.message);
            }
        }
        return messageSid; // Return the SID (or pseudo-SID) for tracking
    });

    const results = await Promise.all(smsPromises);
    const successfulSids = results.filter(sid => sid !== null && !sid.startsWith('failed-'));

    if (successfulSids.length > 0) {
        console.log(`[sms-service] Successfully initiated sending for ${successfulSids.length} SMS messages.`);
        return { success: true, sids: successfulSids };
    } else {
        throw new Error('All SMS messages failed to initiate sending.');
    }
}

module.exports = {
    sendSms // Export the sendSms function
};
