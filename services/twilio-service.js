// services/twilio-service.js

// 1. Import necessary modules
// The Twilio Node.js library for interacting with the Twilio API
const twilio = require('twilio');
// Ensure environment variables are loaded (though server.js already does this)
require('dotenv').config();

// 2. Retrieve Twilio credentials from environment variables
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

// 3. Initialize the Twilio client
// This client will be used to make all API calls to Twilio
const client = twilio(ACCOUNT_SID, AUTH_TOKEN);

// 4. Define the sendMessage function
/**
 * Sends an SMS message using Twilio.
 * @param {string} toPhoneNumber - The recipient's phone number (e.g., '+1234567890').
 * @param {string} messageBody - The text content of the message.
 * @returns {Promise<Object>} A promise that resolves to the Twilio message object.
 */
async function sendMessage(toPhoneNumber, messageBody) {
    try {
        if (!TWILIO_PHONE_NUMBER) {
            throw new Error('TWILIO_PHONE_NUMBER is not set in .env file.');
        }
        if (!toPhoneNumber || !messageBody) {
            throw new Error('Recipient phone number and message body are required.');
        }

        console.log(`Attempting to send message from ${TWILIO_PHONE_NUMBER} to ${toPhoneNumber}: "${messageBody}"`);

        const message = await client.messages.create({
            body: messageBody,
            from: TWILIO_PHONE_NUMBER, // Your Twilio phone number
            to: toPhoneNumber          // Recipient's phone number
        });

        console.log('Message sent successfully! SID:', message.sid);
        return message; // Return the Twilio message object
    } catch (error) {
        console.error('Error sending message via Twilio:', error.message);
        // Provide more specific error details if available from Twilio
        if (error.code) {
            console.error(`Twilio Error Code: ${error.code}`);
            console.error(`Twilio Error Message: ${error.moreInfo}`);
        }
        throw error; // Re-throw the error for the caller to handle
    }
}

// 5. Export the sendMessage function
module.exports = {
    sendMessage
};