/**
 * Server Entrypoint (server.js)
 * ------------------------------
 * Initializes environment variables, connects to the database, auto-seeds initial data
 * if missing, and begins listening for incoming HTTP connections.
 * 
 * Beginner Concept:
 * In ES modules (Node.js), top-level imports execute first.
 * Calling dotenv.config() loads variables from .env into process.env before the server starts.
 */

import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import { seedDatabase } from '../scripts/seed.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Connect to MongoDB (local or persistent embedded instance)
    await connectDB();

    // 2. Check if demo user exists, if not, auto-seed realistic bills & subscriptions
    const demoUser = await User.findOne({ email: 'demo@billsnap.in' });
    if (!demoUser) {
      console.log('🌱 [Auto-Seed] Demo user not found. Initializing realistic bills & demo user...');
      try {
        await seedDatabase();
      } catch (seedErr) {
        console.warn('⚠️ [Auto-Seed] Seed warning:', seedErr.message);
      }
    }

    // 3. Start listening for incoming HTTP requests
    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 [BillSnap Server] Running successfully!`);
      console.log(`🌐 Base URL: http://localhost:${PORT}`);
      console.log(`📦 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`⚡ Mode: ${process.env.NODE_ENV || 'development'}`);
      console.log(`💰 Currency: Indian Rupee (₹)`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('❌ [BillSnap Server] Failed to start:', err.message);
    process.exit(1);
  }
};

startServer();
