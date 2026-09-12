import jwt from 'jsonwebtoken';
import db from '../db/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'pulsepm-ultra-secure-jwt-key-2026';

export function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(401).json({ error: 'Session expired or invalid', is_expired: true });
        }

        // Fetch fresh user record
        const userRecord = db.prepare('SELECT id, email, full_name, role_title, user_type, status, avatar_url FROM users WHERE id = ?').get(user.id);
        if (!userRecord || userRecord.status !== 'active') {
            return res.status(403).json({ error: 'User account is inactive or not found' });
        }

        req.user = userRecord;
        next();
    });
}

export function requirePM(req, res, next) {
    if (!req.user || (req.user.user_type !== 'pm' && req.user.user_type !== 'superuser')) {
        return res.status(403).json({ error: 'Administrative PM authorization required for this resource' });
    }
    next();
}

export function requireSuperuser(req, res, next) {
    if (!req.user || req.user.user_type !== 'superuser') {
        return res.status(403).json({ error: 'Superuser authorization required for this resource' });
    }
    next();
}

export function signToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, user_type: user.user_type },
        JWT_SECRET,
        { expiresIn: '1h' }
    );
}
