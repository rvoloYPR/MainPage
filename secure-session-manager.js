// Secure Session Manager - Adds server-side session validation
// Protects against stolen SESSION_SECRET attacks

const crypto = require('crypto');

class SecureSessionManager {
    constructor() {
        this.activeSessions = new Map();
        this.maxSessions = 10; // Max concurrent admin sessions
        this.sessionTimeout = 8 * 60 * 60 * 1000; // 8 hours
        
        // Cleanup expired sessions every 10 minutes
        setInterval(() => this.cleanupExpiredSessions(), 10 * 60 * 1000);
        
        console.log('🔐 Secure Session Manager initialized');
    }

    // Create new session (called on successful login)
    createSession(userId, username, ip, userAgent) {
        const sessionId = crypto.randomUUID();
        const now = Date.now();
        
        const sessionData = {
            sessionId,
            userId,
            username,
            ip,
            userAgent,
            createdAt: now,
            lastActivity: now,
            expiresAt: now + this.sessionTimeout
        };
        
        // Store session
        this.activeSessions.set(sessionId, sessionData);
        
        // Limit concurrent sessions per user
        this.enforceSessionLimit(userId);
        
        console.log(`✅ Session created: ${sessionId} for ${username} from ${ip}`);
        return sessionId;
    }

    // Validate session (called on every admin request)
    validateSession(sessionId, ip, userAgent) {
        const session = this.activeSessions.get(sessionId);
        
        if (!session) {
            console.warn(`❌ Session not found: ${sessionId}`);
            return false;
        }
        
        const now = Date.now();
        
        // Check expiry
        if (now > session.expiresAt) {
            console.warn(`⏰ Session expired: ${sessionId}`);
            this.activeSessions.delete(sessionId);
            return false;
        }
        
        // Check IP consistency (optional - can be disabled for mobile users)
        if (session.ip !== ip) {
            console.warn(`🚨 IP mismatch for session ${sessionId}: ${session.ip} vs ${ip}`);
            // Could either reject or just log (depends on your security requirements)
            // return false; // Uncomment for strict IP binding
        }
        
        // Update last activity
        session.lastActivity = now;
        session.expiresAt = now + this.sessionTimeout; // Sliding expiration
        
        return {
            valid: true,
            session: session
        };
    }

    // Revoke specific session
    revokeSession(sessionId, reason = 'Manual revocation') {
        const session = this.activeSessions.get(sessionId);
        if (session) {
            this.activeSessions.delete(sessionId);
            console.log(`🗑️  Session revoked: ${sessionId} (${reason})`);
            return true;
        }
        return false;
    }

    // Revoke all sessions for a user
    revokeAllUserSessions(userId, except = null) {
        let revokedCount = 0;
        
        for (const [sessionId, session] of this.activeSessions.entries()) {
            if (session.userId === userId && sessionId !== except) {
                this.activeSessions.delete(sessionId);
                revokedCount++;
            }
        }
        
        console.log(`🗑️  Revoked ${revokedCount} sessions for user ${userId}`);
        return revokedCount;
    }

    // Get all active sessions
    getActiveSessions() {
        const sessions = [];
        const now = Date.now();
        
        for (const [sessionId, session] of this.activeSessions.entries()) {
            if (now <= session.expiresAt) {
                sessions.push({
                    sessionId,
                    userId: session.userId,
                    username: session.username,
                    ip: session.ip,
                    userAgent: session.userAgent,
                    createdAt: new Date(session.createdAt),
                    lastActivity: new Date(session.lastActivity),
                    expiresAt: new Date(session.expiresAt)
                });
            }
        }
        
        return sessions.sort((a, b) => b.lastActivity - a.lastActivity);
    }

    // Get sessions for specific user
    getUserSessions(userId) {
        return this.getActiveSessions().filter(session => session.userId === userId);
    }

    // Enforce maximum sessions per user
    enforceSessionLimit(userId) {
        const userSessions = this.getUserSessions(userId);
        
        if (userSessions.length > this.maxSessions) {
            // Remove oldest sessions
            const sessionsToRemove = userSessions
                .sort((a, b) => a.lastActivity - b.lastActivity)
                .slice(0, userSessions.length - this.maxSessions);
            
            sessionsToRemove.forEach(session => {
                this.revokeSession(session.sessionId, 'Session limit exceeded');
            });
        }
    }

    // Cleanup expired sessions
    cleanupExpiredSessions() {
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [sessionId, session] of this.activeSessions.entries()) {
            if (now > session.expiresAt) {
                this.activeSessions.delete(sessionId);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned up ${cleanedCount} expired sessions`);
        }
    }

    // Get session statistics
    getStats() {
        const sessions = this.getActiveSessions();
        const now = Date.now();
        
        return {
            totalActiveSessions: sessions.length,
            uniqueUsers: new Set(sessions.map(s => s.userId)).size,
            uniqueIPs: new Set(sessions.map(s => s.ip)).size,
            recentActivity: sessions.filter(s => 
                now - new Date(s.lastActivity).getTime() < 30 * 60 * 1000 // Active in last 30 minutes
            ).length,
            oldestSession: sessions.length > 0 ? 
                Math.min(...sessions.map(s => new Date(s.createdAt).getTime())) : null
        };
    }

    // Emergency: Revoke ALL sessions (nuclear option)
    revokeAllSessions(reason = 'Emergency shutdown') {
        const count = this.activeSessions.size;
        this.activeSessions.clear();
        console.log(`💥 ALL SESSIONS REVOKED: ${count} sessions (${reason})`);
        return count;
    }
}

// Export singleton
const sessionManager = new SecureSessionManager();
module.exports = sessionManager;