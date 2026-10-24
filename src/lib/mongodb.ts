import { MongoClient, Db } from 'mongodb';
import { DatabaseSchema } from '@/types';

function getMongoUri(): string {
  return process.env.MONGODB_URI || '';
}

function getDbName(): string {
  return process.env.MONGODB_DB_NAME || 'vahan360';
}

const COLLECTION_NAME = 'fleet_state';
const DOC_ID = 'primary_fleet_database';

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

// Global caching for Next.js to prevent connection pool exhaustion across HMR/reloads
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export function isMongoConfigured(): boolean {
  const uri = getMongoUri();
  return Boolean(uri && uri.startsWith('mongodb'));
}

export async function getMongoClient(): Promise<MongoClient | null> {
  const uri = getMongoUri();
  if (!isMongoConfigured()) return null;

  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
      });
      global._mongoClientPromise = client.connect();
    }
    return global._mongoClientPromise;
  } else {
    if (!clientPromise) {
      client = new MongoClient(uri, {
        maxPoolSize: 20,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
      });
      clientPromise = client.connect();
    }
    return clientPromise;
  }
}

export async function getMongoDb(): Promise<Db | null> {
  const c = await getMongoClient();
  if (!c) return null;
  return c.db(getDbName());
}

/**
 * Load database snapshot from MongoDB Atlas
 */
export async function loadFromMongo(): Promise<DatabaseSchema | null> {
  try {
    const db = await getMongoDb();
    if (!db) return null;
    const doc = await db.collection(COLLECTION_NAME).findOne({ _id: DOC_ID as any });
    if (doc && doc.data && doc.data.settings && Array.isArray(doc.data.users)) {
      return doc.data as DatabaseSchema;
    }
    return null;
  } catch (err) {
    console.error('Failed to load from MongoDB Atlas:', err);
    return null;
  }
}

/**
 * Persist database snapshot to MongoDB Atlas with upsert
 */
export async function saveToMongo(data: DatabaseSchema): Promise<boolean> {
  try {
    const db = await getMongoDb();
    if (!db) return false;
    await db.collection(COLLECTION_NAME).updateOne(
      { _id: DOC_ID as any },
      {
        $set: {
          data,
          lastSavedAt: new Date().toISOString(),
          recordVersion: data.version || '1.0.0',
        },
      },
      { upsert: true }
    );
    return true;
  } catch (err) {
    console.error('Failed to save to MongoDB Atlas:', err);
    return false;
  }
}
