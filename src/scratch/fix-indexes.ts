import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function fixIndexes() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('No URI');

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  try {
    const db = mongoose.connection.db;
    if (!db) throw new Error('No DB');

    // Drop old unique index on 'date' in 'expenses'
    console.log('Dropping old date index from expenses...');
    await db.collection('expenses').dropIndex('date_1');
    console.log('Successfully dropped date_1 index');
  } catch (e: unknown) {
    console.log('Could not drop date index (it might not exist):', (e as Error).message);
  }

  try {
    const db = mongoose.connection.db;
    if (!db) throw new Error('No DB');

    // Drop old index from settings if needed (usually just _id)
    console.log('Checking settings indexes...');
    const indexes = await db.collection('settings').indexes();
    console.log('Settings indexes:', indexes);
  } catch (e: unknown) {
    console.log('Error checking settings:', (e as Error).message);
  }

  await mongoose.disconnect();
  console.log('Done');
}

fixIndexes().catch(console.error);
