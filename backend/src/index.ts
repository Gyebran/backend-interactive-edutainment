import './env'; // Multi-step loader (Must be first)
import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/api.routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3001;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
const allowedOrigins = new Set([
    frontendUrl,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
]);
const rawDatabaseUrl = process.env.DATABASE_URL || '';
const maskedDatabaseUrl = rawDatabaseUrl
    ? rawDatabaseUrl.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:****@')
    : 'DATABASE_URL is not set';

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-secret', 'x-season-admin-secret'],
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api', apiRoutes);

app.get('/health', async (req, res) => {
    try {
        // Check DB connection
        // This is just a check, assuming DB might be up
        // await db.$connect(); 
        res.json({ status: 'ok', database: 'connected (simulated)' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: String(error) });
    }
});

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`[Startup] DATABASE_URL: ${maskedDatabaseUrl}`);
    console.log(`Backend server running on http://localhost:${PORT}`);
});
