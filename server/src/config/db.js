/**
 * Database Connection Module (db.js)
 * ----------------------------------
 * This file establishes a connection to MongoDB using Mongoose.
 * 
 * Embedded MongoDB with Disk Persistence:
 * If no local MongoDB service is running, it starts an embedded MongoDB instance
 * via 'mongodb-memory-server'. We ensure single-connection safety and prevent
 * duplicate instance creation or reconnection conflicts.
 */

import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let memoryServer = null;

/**
 * Connect to MongoDB safely without redundant openUri calls.
 */
export const connectDB = async () => {
  // If already connected, do nothing
  if (mongoose.connection.readyState === 1) {
    return;
  }

  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/billsnap';

  try {
    // Attempt connecting to the configured MongoDB URI
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`✅ [Database] Connected to external MongoDB at: ${uri}`);
    return;
  } catch (initialErr) {
    console.warn(`⚠️ [Database] Could not connect to URI (${uri}): ${initialErr.message}`);
    console.log('🔄 [Database] Starting embedded MongoDB server...');

    try {
      if (!memoryServer) {
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const dbDir = path.resolve(__dirname, '../../.data/db');
        if (!fs.existsSync(dbDir)) {
          fs.mkdirSync(dbDir, { recursive: true });
        }

        memoryServer = await MongoMemoryServer.create({
          instance: {
            dbPath: dbDir,
            storageEngine: 'wiredTiger',
            dbName: 'billsnap',
          },
        });
      }

      const memUri = memoryServer.getUri();
      await mongoose.connect(memUri);
      console.log(`✅ [Database] Connected to embedded persistent MongoDB at: ${memUri}`);
    } catch (memErr) {
      console.error('❌ [Database] Failed to start embedded MongoDB:', memErr.message);
      process.exit(1);
    }
  }

  mongoose.connection.on('error', (err) => {
    console.error('❌ [Database] MongoDB connection error:', err.message);
  });
};

/**
 * Disconnect from MongoDB and stop memory server
 */
export const disconnectDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (memoryServer) {
      await memoryServer.stop();
      memoryServer = null;
    }
    console.log('🔌 [Database] MongoDB disconnected gracefully.');
  } catch (err) {
    console.error('❌ [Database] Error during disconnect:', err.message);
  }
};
