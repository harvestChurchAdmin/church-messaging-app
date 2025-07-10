// routes/api-routes.js

const express = require('express');
const router = express.Router();

// Import service modules
const breezeApi = require('../services/breeze-api');
const twilioService = require('../services/twilio-service');
const authCheck = require('../middleware/authCheck'); // <-- ADD THIS LINE

console.log('Type of authCheck:', typeof authCheck);

// Get people from Breeze - NOW PROTECTED
router.get('/people', authCheck, async (req, res) => { // <-- ADD authCheck HERE
    try {
        const people = await breezeApi.getPeople();
        res.json(people);
    } catch (error) {
        console.error('Error fetching people:', error);
        res.status(500).json({ message: 'Failed to fetch people', error: error.message });
    }
});

// Send a message via Twilio - NOW PROTECTED
router.post('/send-message', authCheck, async (req, res) => { // <-- ADD authCheck HERE
    const { to, message } = req.body;

    if (!to || !message) {
        return res.status(400).json({ message: 'Recipient phone number and message body are required.' });
    }

    try {
        const twilioResponse = await twilioService.sendMessage(to, message);
        res.status(200).json({
            message: 'Message sent successfully!',
            sid: twilioResponse.sid,
            status: twilioResponse.status
        });
    } catch (error) {
        console.error('Error sending message:', error);
        if (error.message.includes('Recipient phone number and message body are required')) {
            res.status(400).json({ message: error.message });
        } else {
            res.status(500).json({ message: 'Failed to send message via Twilio', error: error.message });
        }
    }
});

module.exports = router;