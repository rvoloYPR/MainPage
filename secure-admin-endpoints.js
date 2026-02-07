// Secure Admin Endpoints with Zero-Trust Security Challenges
// Every sensitive action requires additional verification

const express = require('express');
const zeroTrustAuth = require('./zero-trust-auth');

// Middleware for sensitive actions
const requireSecurityChallenge = (actionType) => {
    return async (req, res, next) => {
        try {
            const challengeId = await zeroTrustAuth.requireSecurityChallenge(actionType, req);
            
            if (challengeId) {
                // Action requires additional verification
                return res.status(202).json({
                    requiresChallenge: true,
                    challengeId: challengeId,
                    message: `Security verification required for ${actionType}. Check your verification method.`,
                    action: actionType
                });
            }
            
            // No challenge required, proceed
            next();
            
        } catch (error) {
            res.status(500).json({
                error: 'Security challenge generation failed',
                message: error.message
            });
        }
    };
};

// Security challenge completion endpoint
const completeSecurityChallenge = async (req, res) => {
    try {
        const { challengeId, code, action } = req.body;
        
        if (!challengeId || !code) {
            return res.status(400).json({
                error: 'Challenge ID and code required'
            });
        }
        
        await zeroTrustAuth.verifySecurityChallenge(challengeId, code);
        
        // Challenge verified - now execute the original action
        // This would typically redirect to the original endpoint
        res.json({
            success: true,
            message: 'Security challenge completed',
            action: action,
            nextStep: 'Retry your original request'
        });
        
    } catch (error) {
        res.status(401).json({
            error: 'Security challenge failed',
            message: error.message
        });
    }
};

// Continuous verification endpoint
const performContinuousVerification = async (req, res) => {
    try {
        const { twoFactorCode } = req.body;
        
        if (!twoFactorCode) {
            return res.status(400).json({
                error: '2FA code required for continuous verification'
            });
        }
        
        const user = zeroTrustAuth.adminUsers.get(req.user.username);
        if (!user || !user.twoFactorEnabled) {
            return res.status(400).json({
                error: '2FA not enabled for this account'
            });
        }
        
        const speakeasy = require('speakeasy');
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: twoFactorCode,
            window: 1
        });
        
        if (!verified) {
            return res.status(401).json({
                error: 'Invalid 2FA code'
            });
        }
        
        // Update session verification timestamp
        const session = zeroTrustAuth.activeSessions.get(req.sessionId);
        if (session) {
            session.lastVerification = Date.now();
            session.trustLevel = 'VERIFIED';
        }
        
        zeroTrustAuth.addAuditLog('CONTINUOUS_VERIFICATION_SUCCESS', {
            userId: req.user.userId,
            username: req.user.username,
            sessionId: req.sessionId,
            ip: req.ip,
            severity: 'INFO'
        });
        
        res.json({
            success: true,
            message: 'Continuous verification successful',
            trustLevel: 'VERIFIED',
            nextVerificationDue: Date.now() + (zeroTrustAuth.config.VERIFY_EVERY_MINUTES * 60 * 1000)
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Continuous verification failed',
            message: error.message
        });
    }
};

module.exports = {
    requireSecurityChallenge,
    completeSecurityChallenge,
    performContinuousVerification
};