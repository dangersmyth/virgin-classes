// Clear MongoDB Database
// Run with: node clear-database.js

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function clearDatabase() {
  let client;

  try {
    console.log('Connecting to MongoDB...');
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();

    const db = client.db('Project0');
    const collection = db.collection('classes');

    // Get current count
    const countBefore = await collection.countDocuments();
    console.log(`Current documents in database: ${countBefore}`);

    if (countBefore === 0) {
      console.log('Database is already empty.');
      return;
    }

    // Ask for confirmation
    console.log('\n⚠️  WARNING: This will delete ALL documents in the database!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Delete all documents
    const result = await collection.deleteMany({});
    console.log(`✓ Deleted ${result.deletedCount} documents`);

    // Verify
    const countAfter = await collection.countDocuments();
    console.log(`✓ Database now has ${countAfter} documents`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('\nConnection closed.');
    }
  }
}

clearDatabase();
