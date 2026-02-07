// Backend Configuration - Loads from environment variables
require('dotenv').config();

const config = {
    // Stripe Configuration
    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        priceInPence: 14900, // £149.00
        currency: 'gbp'
    },

    // Server Configuration
    server: {
        port: process.env.PORT || 3000,
        environment: process.env.NODE_ENV || 'development',
        allowedOrigins: process.env.ALLOWED_ORIGINS ?
            process.env.ALLOWED_ORIGINS.split(',') :
            ['http://localhost:3000', 'http://127.0.0.1:3000', 'null'],
        sessionSecret: process.env.SESSION_SECRET || 'change-this-secret-in-production'
    },

    // Database Configuration
    database: {
        path: './ypr_customers.db',
        encryptionKey: process.env.DATABASE_ENCRYPTION_KEY
    },

    // Email Configuration
    email: {
        service: process.env.EMAIL_SERVICE || 'gmail',
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
        fromName: process.env.EMAIL_FROM_NAME || 'Yorkshire Property Report',
        fromAddress: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER
    },

    // Business Configuration
    business: {
        name: process.env.BUSINESS_NAME || 'Yorkshire Property Report',
        email: process.env.BUSINESS_EMAIL || process.env.EMAIL_USER
    },

    // Security Configuration
    security: {
        jwtSecret: process.env.JWT_SECRET || 'change-this-jwt-secret',
        require2FA: process.env.REQUIRE_2FA === 'true',
        adminAllowedIPs: process.env.ADMIN_ALLOWED_IPS ?
            process.env.ADMIN_ALLOWED_IPS.split(',') :
            [],
        allowedCountries: process.env.ALLOWED_COUNTRIES ?
            process.env.ALLOWED_COUNTRIES.split(',') :
            []
    },

    // Helper Functions
    isStripeConfigured() {
        return !!this.stripe.secretKey && !!this.stripe.publishableKey;
    },

    isEmailConfigured() {
        return !!this.email.user && !!this.email.pass;
    },

    logStatus() {
        console.log('\n⚙️  Configuration Status:');
        console.log(`   Stripe: ${this.isStripeConfigured() ? '✅ Configured' : '❌ Not Configured'}`);
        console.log(`   Email: ${this.isEmailConfigured() ? '✅ Configured' : '❌ Not Configured'}`);
        console.log(`   Environment: ${this.server.environment}`);
        console.log(`   Port: ${this.server.port}`);

        if (this.stripe.secretKey) {
            const keyType = this.stripe.secretKey.startsWith('sk_test_') ? 'TEST' : 'LIVE';
            console.log(`   Stripe Mode: ${keyType} ${keyType === 'TEST' ? '🧪' : '💳'}`);
        }
    }
};

module.exports = config;
