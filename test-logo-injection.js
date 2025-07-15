// test-logo-injection.js
const fs = require('fs');
const path = require('path');

// Define a dummy logo URL for testing
const TEST_APP_LOGO_URL = 'https://example.com/test-logo.png';

// Path to the dummy login HTML file
const testHtmlFilePath = path.join(__dirname, 'public', 'test-login.html');

try {
    // Read the dummy HTML file
    let testHtmlContent = fs.readFileSync(testHtmlFilePath, 'utf8');

    console.log('--- Original test-login.html content (FULL) ---');
    console.log(testHtmlContent); // Log the full original content

    // Replace the placeholder with the dummy logo URL
    const modifiedHtmlContent = testHtmlContent.replace(/\{\{APP_LOGO_URL\}\}/g, TEST_APP_LOGO_URL);

    console.log('\n--- Modified test-login.html content (FULL) ---');
    console.log(modifiedHtmlContent); // Log the full modified content

    // You can also save the modified content to a new file to inspect it in a browser:
    // fs.writeFileSync(path.join(__dirname, 'public', 'output-test-login.html'), modifiedHtmlContent);
    // console.log('\nModified HTML saved to public/output-test-login.html');

} catch (error) {
    console.error('Error during logo injection test:', error.message);
    if (error.code === 'ENOENT') {
        console.error(`Please ensure 'public/test-login.html' exists at: ${testHtmlFilePath}`);
    } else if (error instanceof TypeError && error.message.includes('substring')) {
        console.error('TypeError: Substring operation failed. This might indicate that testHtmlContent is not a string or is unexpectedly short.');
    }
}
