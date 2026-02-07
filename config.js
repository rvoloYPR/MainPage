// Configuration file for API keys and settings
const CONFIG = {
    // 🚀 NOW IN LIVE MODE - ACCEPTING REAL PAYMENTS
    // Environment-based key selection - automatically switches between test/live
    // Use test key for: localhost, 127.0.0.1, file://, or empty hostname (local testing)
    // Use live key for production domain
    STRIPE_PUBLISHABLE_KEY: (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '' ||
        window.location.protocol === 'file:'
    )
        ? 'pk_test_51RhzPbFEWrfGuPMwO7vfaSUFdU7LjktaUpbEpdiirJr7zZUkbYB28xV79Ucdj4qsC57gyhdqs4EYPeoeCJCHpSxU00EB2VBqf7' // Test key for local development
        : 'pk_live_51RhzPbFEWrfGuPMwZdGMrR4xhhkgmgw8Hg4kVJiPpoYQKCoP6SHpHWhSVMyJUaGiVYG0sBt7tgflRLhdInONyE6M00oPr7yu5v', // Live key for production
};

// Make config available globally
window.CONFIG = CONFIG;

// Debug logging to help identify which key is being used
console.log('Environment Detection:');
console.log('  - Hostname:', window.location.hostname);
console.log('  - Protocol:', window.location.protocol);
console.log('  - Using Stripe Key:', CONFIG.STRIPE_PUBLISHABLE_KEY.substring(0, 15) + '...');
console.log('  - Key Type:', CONFIG.STRIPE_PUBLISHABLE_KEY.startsWith('pk_test_') ? 'TEST KEY ✅' : 'LIVE KEY ⚠️');