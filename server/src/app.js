/**
 * BillSnap Express Application (app.js)
 * --------------------------------------
 * Configures middleware, security policies, static asset serving, API routing,
 * and error handling.
 * 
 * Beginner Concept:
 * - Helmet secures HTTP headers against common web vulnerabilities.
 * - CORS (Cross-Origin Resource Sharing) permits the Vite React frontend (http://localhost:5173)
 *   to safely communicate with this backend API.
 * - Morgan logs every HTTP request to the terminal so you can trace errors and speed.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

// Import Route Handlers
import authRoutes from './routes/authRoutes.js';
import billRoutes from './routes/billRoutes.js';
import recurringRoutes from './routes/recurringRoutes.js';
import splitRoutes from './routes/splitRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import emiRoutes from './routes/emiRoutes.js';
import passkeyRoutes from './routes/passkeyRoutes.js';

// Central Error Handler Middleware
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security HTTP headers
// Allow cross-origin resource loading for uploaded receipt images
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Cross-Origin Resource Sharing (CORS)
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Dev-friendly permissive CORS
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// HTTP request logger
app.use(morgan('dev'));

// Parse JSON and URL-encoded request bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded bill receipt images statically from /uploads
const uploadsPath = path.resolve(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

// Healthcheck endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    app: 'BillSnap API',
    currency: 'INR (₹)',
    timestamp: new Date().toISOString(),
  });
});

// Mount Feature API Routes
app.use('/api/auth', authRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/splits', splitRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/emis', emiRoutes);
app.use('/api/passkey', passkeyRoutes);

// Catch-all for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
});

// Central Error Handler (must be registered last)
app.use(errorHandler);

export default app;
