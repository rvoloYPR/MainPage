# Stripe Payment Testing Instructions

## How to Test Your Payment Flow

### 1. Open Your Website
- Navigate to: `C:\Users\User\Documents\Documents\YPR\testing - 3\ypr-websiteV24.html`
- Open it in your web browser (Chrome, Firefox, or Edge)

### 2. Test Card Numbers (Stripe Test Mode)
Since you're testing on localhost, it will use your **test key** automatically.

**Successful Payment Test Cards:**
- **Visa**: `4242 4242 4242 4242`
- **Mastercard**: `5555 5555 5555 4444`
- **American Express**: `3782 822463 10005`

**Card Details to Use:**
- **Expiry Date**: Any future date (e.g., `12/25`)
- **CVC**: Any 3 digits (e.g., `123`)
- **ZIP/Postcode**: Any UK postcode (e.g., `SW1A 1AA`)

**Decline/Error Test Cards:**
- **Card Declined**: `4000 0000 0000 0002`
- **Insufficient Funds**: `4000 0000 0000 9995`
- **CVC Check Fails**: `4000 0000 0000 0127`

### 3. Testing Steps

1. **Click "Get Your Report" button** on your website
2. **Fill in Customer Information:**
   - First Name: John
   - Last Name: Doe
   - Email: test@example.com
   - Current Address: 123 Test Street
   - City: London
   - Postcode: SW1A 1AA
   - Property Address: 456 Property Lane
   - Property City: London
   - Property Postcode: SW1A 2BB

3. **Test the NEW Billing Address Feature:**
   - ✅ **Check the box** "Billing address is the same as my current address"
   - Notice how billing fields auto-fill from your current address
   - Try unchecking it - fields should clear and become editable again
   - Try changing your current address while checked - billing should update automatically

4. **Enter Payment Details:**
   - Cardholder Name: John Doe
   - Card Number: `4242 4242 4242 4242`
   - Expiry: `12/25`
   - CVC: `123`

5. **Click "Pay Now"** and watch for success message

### 4. What to Check

✅ **Billing Address Checkbox Works:**
   - Auto-fills from current address
   - Disables billing fields when checked
   - Clears and re-enables when unchecked
   - Updates live when current address changes

✅ **Payment Processing:**
   - Button shows "Processing..." during payment
   - Success message appears after payment
   - No console errors (press F12 to open developer tools)

✅ **Validation:**
   - Try submitting with empty fields - should show errors
   - Try invalid card number - should show Stripe error
   - All required fields validated properly

### 5. Backend Integration Note

⚠️ **IMPORTANT**: The payment will create a PaymentMethod but won't charge yet because you need:
- A backend server to create Payment Intents
- The endpoint `/create-payment-intent` (currently in the code at line 3874)

Your frontend is ready, but for actual charges you'll need to set up a backend (Node.js, Python, PHP, etc.) to securely process payments.

### 6. About Billing Address

**Why keep it?**
- ✅ Fraud prevention (AVS checks)
- ✅ Reduces chargebacks
- ✅ Required by many card issuers
- ✅ Stripe best practice

**Your new feature:**
- Makes it convenient with auto-fill checkbox
- Users don't have to type it twice
- Still maintains security benefits

## Need Help?

If you encounter issues:
1. Check browser console (F12) for errors
2. Verify you're testing on `localhost` or `127.0.0.1`
3. Make sure config.js is loaded before the main HTML file
