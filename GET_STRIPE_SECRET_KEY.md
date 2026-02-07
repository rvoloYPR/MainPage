# How to Get Your Stripe Secret Key

## The Problem

The test secret key in your `.env` file is invalid. You need to get your **actual test secret key** from Stripe.

## ⚠️ IMPORTANT: Secret Key vs Publishable Key

You have TWO types of keys in Stripe:

1. **Publishable Key** (pk_test_...) - ✅ You already have this in `config.js`
   - Safe to use in frontend/browser
   - Already working correctly

2. **Secret Key** (sk_test_...) - ❌ This is what's missing!
   - MUST be kept secret on backend only
   - NEVER put in frontend code
   - This is what you need to get now

## 🔑 How to Get Your Test Secret Key

### Step 1: Go to Stripe Dashboard
Open your browser and go to:
**https://dashboard.stripe.com/test/apikeys**

### Step 2: Make Sure You're in Test Mode
In the top right corner, check that it says **"Test mode"**
If it says "Live mode", click the toggle to switch to Test mode.

### Step 3: Find Your Secret Key
On the API Keys page, you'll see:

```
Standard keys

Publishable key
pk_test_51RhzPbFEWrfGuPMwO7vfaSUFdU7LjktaUpbEpdiirJr7zZUkbYB28xV79Ucdj4qsC57gyhdqs4EYPeoeCJCHpSxU00EB2VBqf7
[This is your publishable key - you already have this!]

Secret key
sk_test_••••••••••••••••••••••••••••••••••••••••
[Click "Reveal test key" to see it]
```

### Step 4: Reveal and Copy Secret Key
1. Click **"Reveal test key"** next to the Secret key
2. Copy the entire key (starts with `sk_test_`)
3. It will look something like: `sk_test_51RhzPbFEWrfGuPMwXXXXXXXXXXXXXXXXXXXXX`

## ✏️ Update Your .env File

### Step 5: Edit .env File
Open this file in a text editor:
```
C:\Users\User\Documents\Documents\YPR\testing - 3\.env
```

### Step 6: Replace the Test Secret Key
Find this line (around line 12):
```env
STRIPE_SECRET_KEY=sk_test_YOUR_CURRENT_PLACEHOLDER_KEY
```

Replace it with YOUR actual test secret key from Stripe:
```env
STRIPE_SECRET_KEY=sk_test_YOUR_ACTUAL_KEY_HERE
```

### Step 7: Save the File
Save and close `.env`

### Step 8: Restart the Server
After updating the key, you need to restart the backend server.

I'll do this for you - just let me know once you've updated the `.env` file with your real secret key!

---

## 🔐 Security Note

**NEVER** share your secret key or commit it to Git!
- The `.env` file is in `.gitignore` so it won't be committed
- Secret keys should ONLY be on your server, never in frontend code
- If you accidentally expose it, immediately regenerate a new one in Stripe dashboard

---

## ❓ Can't Find Your Secret Key?

If you can't see the Secret key section:
1. Make sure you're logged into the correct Stripe account
2. Make sure you have the right permissions (you need to be an admin/owner)
3. Try logging out and back in
4. Contact Stripe support if you still can't see it

---

## What Happens Next

Once you update the `.env` file with your real secret key:
1. I'll restart the server
2. The payment will work!
3. You'll see successful payment processing
4. Order will be saved to database
5. Confirmation email will be sent

---

**Let me know once you've updated the `.env` file and I'll restart the server!**
