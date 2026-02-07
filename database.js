// SQLite Database Setup for Yorkshire Property Report V24
// This handles all customer data storage securely

const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

// Encryption utility for sensitive data
class DataEncryption {
    constructor() {
        this.algorithm = 'aes-256-gcm';
        this.keyLength = 32;
        this.ivLength = 16;
        this.tagLength = 16;
        this.key = this.getEncryptionKey();
    }

    getEncryptionKey() {
        const keyStr = process.env.DATABASE_ENCRYPTION_KEY;
        if (!keyStr) {
            console.error('❌ DATABASE_ENCRYPTION_KEY required in .env');
            if (process.env.NODE_ENV === 'production') process.exit(1);
            return crypto.randomBytes(32); // Development fallback
        }
        return Buffer.from(keyStr, 'hex');
    }

    encrypt(text) {
        if (!text) return null;
        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const tag = cipher.getAuthTag();

        return iv.toString('hex') + tag.toString('hex') + encrypted;
    }

    decrypt(encryptedText) {
        if (!encryptedText) return null;
        try {
            const iv = Buffer.from(encryptedText.slice(0, this.ivLength * 2), 'hex');
            const tag = Buffer.from(encryptedText.slice(this.ivLength * 2, (this.ivLength + this.tagLength) * 2), 'hex');
            const encrypted = encryptedText.slice((this.ivLength + this.tagLength) * 2);

            const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
            decipher.setAuthTag(tag);

            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            console.error('❌ Decryption failed:', error.message);
            return '[ENCRYPTED_DATA]';
        }
    }
}

const encryption = new DataEncryption();
const path = require('path');

// Database file location (persists on Render.com)
const DB_PATH = path.join(__dirname, 'ypr_customers.db');

class Database {
    constructor() {
        this.db = null;
        this.init();
    }

    // Initialize database connection and create tables
    init() {
        this.db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('❌ Database connection error:', err.message);
            } else {
                console.log('✅ Connected to SQLite database');
                console.log('🔐 Application-layer encryption enabled');
                this.createTables();
            }
        });
    }

    // Encrypt sensitive customer data before saving
    encryptSensitiveData(customerData) {
        const sensitiveFields = ['email', 'first_name', 'last_name', 'phone', 'property_address', 'property_city'];
        const encrypted = { ...customerData };
        
        sensitiveFields.forEach(field => {
            if (encrypted[field]) {
                encrypted[field] = encryption.encrypt(encrypted[field]);
            }
        });
        
        return encrypted;
    }

    // Decrypt sensitive customer data after retrieval
    decryptSensitiveData(customerData) {
        if (!customerData) return null;
        const sensitiveFields = ['email', 'first_name', 'last_name', 'phone', 'property_address', 'property_city'];
        const decrypted = { ...customerData };
        
        sensitiveFields.forEach(field => {
            if (decrypted[field]) {
                decrypted[field] = encryption.decrypt(decrypted[field]);
            }
        });
        
        return decrypted;
    }

    // Decrypt array of customers
    decryptCustomerArray(customers) {
        if (!Array.isArray(customers)) return [];
        return customers.map(customer => this.decryptSensitiveData(customer));
    }

    // Create tables if they don't exist
    createTables() {
        const createCustomersTable = `
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_number TEXT UNIQUE NOT NULL,
                email TEXT NOT NULL,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                phone TEXT,
                property_address TEXT NOT NULL,
                property_city TEXT NOT NULL,
                property_postcode TEXT NOT NULL,
                amount_paid REAL NOT NULL,
                payment_status TEXT DEFAULT 'completed',
                payment_intent_id TEXT UNIQUE,
                stripe_customer_id TEXT,
                email_sent BOOLEAN DEFAULT 0,
                report_delivered BOOLEAN DEFAULT 0,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const createOrdersTable = `
            CREATE TABLE IF NOT EXISTS order_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_number TEXT NOT NULL,
                status TEXT NOT NULL,
                description TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_number) REFERENCES customers (order_number)
            )
        `;

        this.db.run(createCustomersTable, (err) => {
            if (err) {
                console.error('❌ Error creating customers table:', err.message);
            } else {
                console.log('✅ Customers table ready');
            }
        });

        this.db.run(createOrdersTable, (err) => {
            if (err) {
                console.error('❌ Error creating order_history table:', err.message);
            } else {
                console.log('✅ Order history table ready');
            }
        });
    }

    // Save customer order to database
    saveCustomer(customerData) {
        return new Promise((resolve, reject) => {
            // Encrypt sensitive data before saving
            const encryptedData = this.encryptSensitiveData({
                email: customerData.email,
                firstName: customerData.firstName,
                lastName: customerData.lastName,
                phone: customerData.phone,
                propertyAddress: customerData.propertyAddress,
                propertyCity: customerData.propertyCity
            });

            const sql = `
                INSERT INTO customers (
                    order_number, email, first_name, last_name, phone,
                    property_address, property_city, property_postcode,
                    amount_paid, payment_intent_id, stripe_customer_id,
                    email_sent
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const values = [
                customerData.orderNumber,
                encryptedData.email,
                encryptedData.firstName,
                encryptedData.lastName,
                encryptedData.phone || null,
                encryptedData.propertyAddress,
                encryptedData.propertyCity,
                customerData.propertyPostcode, // Postcode not encrypted for search
                customerData.amountPaid,
                customerData.paymentIntentId,
                customerData.stripeCustomerId || null,
                customerData.emailSent ? 1 : 0
            ];

            this.db.run(sql, values, function(err) {
                if (err) {
                    console.error('❌ Error saving customer:', err.message);
                    reject(err);
                } else {
                    console.log('✅ Customer saved with ID:', this.lastID);
                    
                    // Add order history entry
                    database.addOrderHistory(customerData.orderNumber, 'order_placed', 'Order placed and payment completed');
                    
                    resolve({ id: this.lastID, orderNumber: customerData.orderNumber });
                }
            });
        });
    }

    // Get customer by order number
    getCustomerByOrderNumber(orderNumber) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM customers WHERE order_number = ?';
            
            this.db.get(sql, [orderNumber], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.decryptSensitiveData(row));
                }
            });
        });
    }

    // Get customer by email
    getCustomerByEmail(email) {
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM customers WHERE email = ? ORDER BY created_at DESC';
            
            this.db.all(sql, [email], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.decryptCustomerArray(rows));
                }
            });
        });
    }

    // Update email sent status
    updateEmailStatus(orderNumber, emailSent) {
        return new Promise((resolve, reject) => {
            const sql = 'UPDATE customers SET email_sent = ?, updated_at = CURRENT_TIMESTAMP WHERE order_number = ?';
            
            this.db.run(sql, [emailSent ? 1 : 0, orderNumber], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    // Update report delivery status
    updateReportStatus(orderNumber, delivered) {
        return new Promise((resolve, reject) => {
            const sql = 'UPDATE customers SET report_delivered = ?, updated_at = CURRENT_TIMESTAMP WHERE order_number = ?';
            
            this.db.run(sql, [delivered ? 1 : 0, orderNumber], function(err) {
                if (err) {
                    reject(err);
                } else {
                    database.addOrderHistory(orderNumber, 'report_delivered', 'Property report delivered to customer');
                    resolve({ changes: this.changes });
                }
            });
        });
    }

    // Add order history entry
    addOrderHistory(orderNumber, status, description) {
        const sql = 'INSERT INTO order_history (order_number, status, description) VALUES (?, ?, ?)';
        
        this.db.run(sql, [orderNumber, status, description], function(err) {
            if (err) {
                console.error('❌ Error adding order history:', err.message);
            }
        });
    }

    // Get all orders (for admin dashboard)
    getAllOrders(limit = 50) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM customers 
                ORDER BY created_at DESC 
                LIMIT ?
            `;
            
            this.db.all(sql, [limit], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.decryptCustomerArray(rows));
                }
            });
        });
    }

    // Get order statistics
    getOrderStats() {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    COUNT(*) as total_orders,
                    SUM(amount_paid) as total_revenue,
                    SUM(CASE WHEN email_sent = 1 THEN 1 ELSE 0 END) as emails_sent,
                    SUM(CASE WHEN report_delivered = 1 THEN 1 ELSE 0 END) as reports_delivered,
                    COUNT(CASE WHEN DATE(created_at) = DATE('now') THEN 1 END) as orders_today
                FROM customers
            `;
            
            this.db.get(sql, [], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Close database connection
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('❌ Error closing database:', err.message);
                } else {
                    console.log('✅ Database connection closed');
                }
            });
        }
    }
}

// Create single database instance
const database = new Database();

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Closing database connection...');
    database.close();
    process.exit(0);
});

module.exports = database;