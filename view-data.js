// View MongoDB Data
// Run with: node view-data.js

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function viewData() {
  let client;

  try {
    console.log('Connecting to MongoDB...\n');
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();

    const db = client.db('Project0');
    const collection = db.collection('classes');

    // Get total count
    const count = await collection.countDocuments();
    console.log(`Total classes in database: ${count}\n`);

    // Get the most recent scrape
    const latestClasses = await collection
      .find()
      .sort({ scrapedAt: -1 })
      .limit(10)
      .toArray();

    if (latestClasses.length > 0) {
      console.log('Latest scraped data:');
      console.log('Date:', latestClasses[0].date);
      console.log('Scraped at:', latestClasses[0].scrapedAt);
      console.log('\nFirst 10 classes:\n');

      latestClasses.forEach((cls, i) => {
        console.log(`${i + 1}. ${cls.time} - ${cls.className}`);
        console.log(`   Instructor: ${cls.instructor}`);
        console.log(`   Status: ${cls.status}`);
        console.log('');
      });

      // Show summary
      const available = latestClasses.filter(c => c.status === 'AVAILABLE').length;
      const full = latestClasses.filter(c => c.status === 'FULL').length;
      const low = latestClasses.filter(c => c.status === 'LOW').length;

      console.log('\nStatus Summary (of these 10):');
      console.log(`  Available: ${available}`);
      console.log(`  Full: ${full}`);
      console.log(`  Low (<5 spots): ${low}`);
    } else {
      console.log('No data found in database.');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('\nConnection closed.');
    }
  }
}

viewData();
