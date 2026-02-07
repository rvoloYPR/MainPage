# Stripe API Key Verification

## What I Fixed

The issue was that your website was trying to use the **LIVE key** instead of the **TEST key** when you opened the file locally. I've updated the config to use the test key for local testing.

## Now Test Again:

1. **Close your browser completely** (to clear any cached errors)
2. **Reopen** `ypr-websiteV24.html`
3. **Open Developer Console** (F12)
4. You should now see in the console:
   ```
   Environment Detection:
     - Hostname: (empty or file)
     - Protocol: file:
     - Using Stripe Key: pk_test_51RhzP...
     - Key Type: TEST KEY ✅
   ```

5. If you see "TEST KEY ✅", proceed with payment testing
6. Use card: **4242 4242 4242 4242**, expiry: **12/26**, CVC: **123**

## If You Still Get "Invalid API Key"

Your test key might need to be regenerated. Here's how to verify:

### Option 1: Verify in Stripe Dashboard

1. Go to: https://dashboard.stripe.com/test/apikeys
2. Make sure you're in **Test Mode** (toggle in top right should say "Test mode")
3. Look for "Publishable key" (NOT "Secret key")
4. It should start with `pk_test_`
5. Click "Reveal test key" to see it
6. Compare it with the key in your `config.js` file (line 6)

### Option 2: Use a Fresh Test Key

If the keys don't match or you want to be sure, generate a new test key:

1. Go to: https://dashboard.stripe.com/test/apikeys
2. Click "Create restricted key" or use the standard publishable key
3. Copy the **Publishable key** (starts with `pk_test_`)
4. Update line 6 in `config.js` with the new key

## Important Notes:

- ✅ **Publishable key** (pk_test_xxx) - Safe to use in frontend code
- ❌ **Secret key** (sk_test_xxx) - NEVER use in frontend! Server-side only
- 🧪 **Test mode** - Use for testing with test cards
- 💳 **Live mode** - Only use when you're ready to accept real payments

## Current Keys in Your Config:

Your test key: `pk_test_51RhzPbFEWrfGuPMw...`
Your live key: `pk_live_51RhzPbFEWrfGuPMw...`

Both start with the correct prefixes, so they should work. The test key will now be used automatically for local testing.
