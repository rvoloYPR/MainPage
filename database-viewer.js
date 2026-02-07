#!/usr/bin/env node
// Database Viewer - Access encrypted customer data with automatic decryption
// Usage: node database-viewer.js [command] [options]

require('dotenv').config();
const database = require('./database.js');

const commands = {
    async viewOrders(limit = 10) {
        console.log('\n📋 Recent Orders (Decrypted):');
        console.log('=' * 50);
        
        try {
            const orders = await database.getAllOrders(parseInt(limit));
            
            if (orders.length === 0) {
                console.log('No orders found.');
                return;
            }
            
            orders.forEach((order, index) => {
                console.log(`\n${index + 1}. Order: ${order.orderNumber}`);
                console.log(`   Customer: ${order.firstName} ${order.lastName}`);
                console.log(`   Email: ${order.email}`);
                console.log(`   Property: ${order.propertyAddress}, ${order.propertyCity}`);
                console.log(`   Amount: £${order.amountPaid}`);
                console.log(`   Date: ${new Date(order.createdAt).toLocaleDateString()}`);
                console.log(`   Email Sent: ${order.emailSent ? '✅ Yes' : '❌ No'}`);
            });
            
        } catch (error) {
            console.error('❌ Error fetching orders:', error.message);
        }
    },

    async viewStats() {
        console.log('\n📊 Database Statistics:');
        console.log('=' * 30);
        
        try {
            const stats = await database.getOrderStats();
            console.log(`Total Orders: ${stats.totalOrders}`);
            console.log(`Total Revenue: £${stats.totalRevenue}`);
            console.log(`Orders Today: ${stats.ordersToday}`);
            console.log(`Emails Sent: ${stats.emailsSent}`);
            console.log(`Average Order Value: £${stats.averageOrderValue}`);
            
        } catch (error) {
            console.error('❌ Error fetching stats:', error.message);
        }
    },

    async searchCustomer(email) {
        if (!email) {
            console.log('❌ Please provide an email address');
            console.log('Usage: node database-viewer.js search customer@email.com');
            return;
        }
        
        console.log(`\n🔍 Searching for customer: ${email}`);
        console.log('=' * 40);
        
        try {
            const customers = await database.getCustomerByEmail(email);
            
            if (customers.length === 0) {
                console.log('No customers found with that email.');
                return;
            }
            
            customers.forEach((customer, index) => {
                console.log(`\n${index + 1}. Order: ${customer.orderNumber}`);
                console.log(`   Name: ${customer.firstName} ${customer.lastName}`);
                console.log(`   Phone: ${customer.phone || 'Not provided'}`);
                console.log(`   Property: ${customer.propertyAddress}`);
                console.log(`   City: ${customer.propertyCity}`);
                console.log(`   Postcode: ${customer.propertyPostcode}`);
                console.log(`   Amount: £${customer.amountPaid}`);
                console.log(`   Payment ID: ${customer.paymentIntentId}`);
                console.log(`   Order Date: ${new Date(customer.createdAt).toLocaleDateString()}`);
            });
            
        } catch (error) {
            console.error('❌ Error searching customer:', error.message);
        }
    },

    async testEncryption() {
        console.log('\n🔐 Testing Database Encryption:');
        console.log('=' * 35);
        
        const testData = {
            email: 'test@example.com',
            firstName: 'John',
            lastName: 'Doe',
            phone: '07123456789',
            propertyAddress: '123 Test Street',
            propertyCity: 'Leeds'
        };
        
        console.log('Original Data:');
        console.log(JSON.stringify(testData, null, 2));
        
        // Test encryption
        const encrypted = database.encryptSensitiveData(testData);
        console.log('\nEncrypted Data:');
        Object.keys(encrypted).forEach(key => {
            if (['email', 'firstName', 'lastName', 'phone', 'propertyAddress', 'propertyCity'].includes(key)) {
                console.log(`${key}: ${encrypted[key].substring(0, 50)}...`);
            } else {
                console.log(`${key}: ${encrypted[key]}`);
            }
        });
        
        // Test decryption
        const decrypted = database.decryptSensitiveData(encrypted);
        console.log('\nDecrypted Data:');
        console.log(JSON.stringify(decrypted, null, 2));
        
        const isMatching = JSON.stringify(testData) === JSON.stringify(decrypted);
        console.log(`\n${isMatching ? '✅' : '❌'} Encryption/Decryption Test: ${isMatching ? 'PASSED' : 'FAILED'}`);
    },

    showHelp() {
        console.log('\n🗃️  Yorkshire Property Report - Database Viewer');
        console.log('=' * 50);
        console.log('\nAvailable Commands:');
        console.log('  orders [limit]     - View recent orders (default: 10)');
        console.log('  stats              - Show database statistics');
        console.log('  search <email>     - Search for customer by email');
        console.log('  test               - Test encryption/decryption');
        console.log('  help               - Show this help message');
        console.log('\nExamples:');
        console.log('  node database-viewer.js orders 20');
        console.log('  node database-viewer.js stats');
        console.log('  node database-viewer.js search customer@email.com');
        console.log('  node database-viewer.js test');
        console.log('\n💡 Tip: All sensitive data is automatically decrypted for viewing');
        console.log('   The actual database stores everything encrypted with AES-256-GCM');
    }
};

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    
    // Check if encryption key is configured
    if (!process.env.DATABASE_ENCRYPTION_KEY && command !== 'help') {
        console.error('❌ DATABASE_ENCRYPTION_KEY not found in .env file');
        console.error('   Encryption key is required to decrypt customer data');
        process.exit(1);
    }
    
    try {
        switch (command.toLowerCase()) {
            case 'orders':
                await commands.viewOrders(args[1]);
                break;
            case 'stats':
                await commands.viewStats();
                break;
            case 'search':
                await commands.searchCustomer(args[1]);
                break;
            case 'test':
                await commands.testEncryption();
                break;
            case 'help':
            default:
                commands.showHelp();
                break;
        }
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (process.env.NODE_ENV === 'development') {
            console.error(error.stack);
        }
    }
    
    // Close database connection
    setTimeout(() => process.exit(0), 1000);
}

if (require.main === module) {
    main();
}