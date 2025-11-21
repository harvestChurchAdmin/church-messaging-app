// utils/phone.js

/**
 * Normalize a phone number to E.164 format (e.g., +12501234567).
 * Assumes North American numbers if no country code is present.
 * @param {string} phoneNumber - Raw phone number input.
 * @returns {string} Normalized phone number, or an empty string if input is falsy.
 */
function normalizePhoneNumber(phoneNumber) {
    if (!phoneNumber) return '';

    let cleaned = phoneNumber.replace(/\D/g, '');

    if (cleaned.length === 10 && !cleaned.startsWith('1')) {
        cleaned = `1${cleaned}`;
    }

    if (!cleaned.startsWith('+')) {
        cleaned = `+${cleaned}`;
    }

    return cleaned;
}

module.exports = {
    normalizePhoneNumber,
};
