# Email Confirmation System Setup Guide

## Overview
This guide will help you set up the auto-confirmation email system for your Yorkshire Property Report website.

## What's Been Created

### 1. **Payment Confirmation Page** (`payment-confirmation.html`)
- Professional confirmation page with order details
- Animated success indicators
- Next steps for customers
- Contact information
- Responsive design matching your site's theme

### 2. **Email Template** (`email-confirmation.html`)
- Professional HTML email template
- Order summary and customer details
- Next steps and support information
- Mobile-responsive design
- Placeholder system for dynamic content

### 3. **Email Server Script** (`send-confirmation-email.js`)
- Node.js server for sending emails
- Integration with popular email services
- Template processing with customer data
- API endpoints for form submission
- Error handling and logging

### 4. **Updated Checkout Process** (`checkout-page.html`)
- Enhanced form validation
- Automatic redirect to confirmation page
- Data passing between pages
- Order number generation
- Improved user experience

## Setup Instructions

### Step 1: Install Node.js Dependencies
```bash
cd /mnt/c/Users/aryan/Documents/Y.P.R
npm install
```

### Step 2: Configure Email Service

#### Option A: Gmail (Recommended for testing)
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account Settings → Security
   - Select "App passwords" 
   - Generate password for "Mail"
3. Update `send-confirmation-email.js`:
   ```javascript
   const emailConfig = {
       service: 'gmail',
       auth: {
           user: 'your-email@gmail.com',        // Your Gmail address
           pass: 'your-16-digit-app-password'   // The generated app password
       }
   };
   ```

#### Option B: Custom SMTP Server
```javascript
const emailConfig = {
    host: 'smtp.yourdomain.com',
    port: 587,
    secure: false,
    auth: {
        user: 'noreply@yourdomain.com',
        pass: 'your-password'
    }
};
```

### Step 3: Test Email Configuration
```bash
node send-confirmation-email.js
```
Then visit: `http://localhost:3000/test-email`

### Step 4: Integration Options

#### Option A: Simple File-Based (Current Setup)
- The checkout form redirects to confirmation page
- Emails can be sent manually or via the Node.js script
- Good for testing and low-volume operations

#### Option B: Full Server Integration
1. Deploy the Node.js script to a web server
2. Update the checkout form to submit to your server
3. Process payments through Stripe/PayPal
4. Send emails automatically

## How It Works

### Current Flow:
1. **Customer fills out checkout form**
2. **Form validation** ensures all required fields are completed
3. **Payment processing simulation** (2-second delay)
4. **Data storage** in browser's localStorage
5. **Redirect to confirmation page** with order details
6. **Confirmation page displays** success message and order info

### With Email Integration:
1. Customer completes checkout
2. Server processes payment (Stripe, PayPal, etc.)
3. Server sends confirmation email automatically
4. Customer redirected to confirmation page
5. Customer receives email within minutes

## Email Template Customization

The email template uses placeholders that get replaced with actual data:

- `{{CUSTOMER_NAME}}` - Customer's full name
- `{{ORDER_NUMBER}}` - Unique order identifier
- `{{ORDER_DATE}}` - Order placement date
- `{{PAYMENT_METHOD}}` - Payment method used
- `{{CUSTOMER_EMAIL}}` - Customer's email address
- `{{PROPERTY_ADDRESS}}` - Property address for report

## File Structure
```
Y.P.R/
├── checkout-page.html          # Updated checkout form
├── payment-confirmation.html   # Success page
├── email-confirmation.html     # Email template
├── send-confirmation-email.js  # Email server
├── package.json               # Node.js dependencies
└── EMAIL_SETUP_GUIDE.md       # This guide
```

## Testing the System

### 1. Test the Confirmation Page
- Open `checkout-page.html` in your browser
- Fill out the form with test data
- Submit and verify redirect to confirmation page

### 2. Test Email Sending
```bash
# Start the email server
npm start

# Test email configuration
curl http://localhost:3000/test-email

# Send test confirmation email
curl -X POST http://localhost:3000/send-confirmation \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe", 
    "email": "your-test-email@example.com",
    "propertyAddress": "123 Test St, Leeds",
    "paymentMethod": "card"
  }'
```

## Production Deployment

### Requirements:
1. **Web hosting** that supports Node.js
2. **Domain name** for professional emails
3. **SSL certificate** for secure payment processing
4. **Payment processor** (Stripe, PayPal, etc.)
5. **Database** for storing orders (optional)

### Recommended Services:
- **Hosting**: Heroku, DigitalOcean, AWS
- **Email**: SendGrid, Mailgun, AWS SES
- **Payments**: Stripe, PayPal
- **Domain**: Namecheap, GoDaddy

## Security Considerations

1. **Never store** email passwords in client-side code
2. **Use HTTPS** for all payment processing
3. **Validate** all form data on the server
4. **Sanitize** email content to prevent injection
5. **Rate limit** email sending to prevent abuse

## Troubleshooting

### Common Issues:

1. **"Authentication failed"**
   - Check email credentials
   - Verify app password for Gmail
   - Ensure 2FA is enabled

2. **"Connection refused"**
   - Check SMTP server settings
   - Verify port numbers
   - Check firewall settings

3. **Emails not received**
   - Check spam folder
   - Verify email address
   - Check email service logs

### Debug Mode:
Add this to your email script for detailed logging:
```javascript
process.env.DEBUG = 'nodemailer:*';
```

## Next Steps

1. **Set up email service** following Step 2
2. **Test thoroughly** with real email addresses
3. **Integrate payment processing** (Stripe/PayPal)
4. **Deploy to production** server
5. **Monitor email delivery** rates

## Support

If you need help with:
- Setting up email services
- Integrating payment processors
- Deploying to production
- Customizing templates

Feel free to ask for additional assistance!

---

**Created for Yorkshire Property Report**  
*Professional Property Intelligence*