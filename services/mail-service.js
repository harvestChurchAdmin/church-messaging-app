// services/mail-service.js

const nodemailer = require('nodemailer');
require('dotenv').config();

// Ensure environment variables for email are set
const EMAIL_HOST = process.env.EMAIL_HOST;
const EMAIL_PORT = process.env.EMAIL_PORT || 587;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const NOREPLY_EMAIL = process.env.NOREPLY_EMAIL || 'noreply@yourdomain.com';

if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
    console.error('Error: Email service credentials (EMAIL_HOST, EMAIL_USER, EMAIL_PASS) not set in .env.');
    console.error('Email forwarding will not work.');
}

// Create a Nodemailer transporter using your SMTP settings
const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: EMAIL_PORT == 465, // Use true for 465, false for other ports like 587
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
    },
});

/**
 * Sends an email containing an SMS reply to the original sender.
 * @param {string} toEmail - The email address of the original sender.
 * @param {string} originalSenderName - The display name of the original sender (from your app user).
 * @param {string} replySenderDisplayName - The display name of the person who replied (retrieved from DB).
 * @param {string} replySenderNumber - The phone number of the person who replied.
 * @param {string} replyMessageBody - The content of the SMS reply.
 * @param {string} originalMessageBody - The content of the original SMS sent (for context).
 * @returns {Promise<Object>} A promise that resolves with mail service response.
 */
async function sendReplyEmail(toEmail, originalSenderName, replySenderDisplayName, replySenderNumber, replyMessageBody, originalMessageBody) {
    if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) {
        throw new Error('Email service is not configured. Cannot send reply email.');
    }

    const mailOptions = {
        from: `Harvest Church Messenger <${NOREPLY_EMAIL}>`,
        to: toEmail,
        subject: `SMS Reply from ${replySenderDisplayName} (${replySenderNumber}) regarding "${originalMessageBody.substring(0, 30)}..."`,
        html: `
            <p>Hello ${originalSenderName},</p>
            <p>You received a reply to your SMS message:</p>
            <p><strong>Original Message:</strong> "${originalMessageBody}"</p>
            <p><strong>Reply From:</strong> ${replySenderDisplayName} (${replySenderNumber})</p>
            <p><strong>Reply:</strong> "${replyMessageBody}"</p>
            <br>
            <p>This message was automatically forwarded to you by the Harvest Church Messenger app.</p>
            <p>Please do not reply directly to this email.</p>
        `,
        text: `Hello ${originalSenderName},\nYou received a reply to your SMS message:\n\nOriginal Message: "${originalMessageBody}"\nReply From: ${replySenderDisplayName} (${replySenderNumber})\nReply: "${replyMessageBody}"\n\nThis message was automatically forwarded to you by the Harvest Church Messenger app.\nPlease do not reply directly to this email.`,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error('Error sending reply email:', error);
        throw error;
    }
}

module.exports = {
    sendReplyEmail,
};
