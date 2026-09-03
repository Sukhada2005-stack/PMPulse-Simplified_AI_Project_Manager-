import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/api.js';
import db from './db/database.js';
import { seedDatabase } from './db/seed.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: '*',
    credentials: true
}));

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// Mount REST API endpoints
app.use('/api', apiRouter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        platform: 'PulsePM Lightweight AI Project & Employee Management Platform',
        timestamp: new Date().toISOString()
    });
});

// Auto-seed database if empty
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
if (userCount === 0) {
    console.log('Database empty. Running seed...');
    seedDatabase();
}

app.listen(PORT, () => {
    console.log(`🚀 PulsePM Backend Server running on http://localhost:${PORT}`);
});
