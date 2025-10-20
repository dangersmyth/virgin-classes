// View Optimized MongoDB Data
// Run with: node view-optimized-data.js

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
      console.log('Class Date:', latestClasses[0].classDate);
      console.log('Scraped at (AEST):', latestClasses[0].scrapedAt.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' }));
      console.log('\nFirst 10 classes:\n');

      latestClasses.forEach((cls, i) => {
        console.log(`${i + 1}. ${cls.time} - ${cls.className}`);
        console.log(`   Instructor: ${cls.instructor}`);
        console.log(`   Status: ${cls.status}`);
        console.log(`   Index: ${cls.index}`);
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

      // Show document size
      const sampleDoc = latestClasses[0];
      const docSize = JSON.stringify(sampleDoc).length;
      console.log(`\n📊 Storage Analysis:`);
      console.log(`  Document size: ~${docSize} bytes`);
      console.log(`  Total for ${count} docs: ~${(count * docSize / 1024).toFixed(2)} KB`);
      console.log(`  Projected for 1 week (every 2 hours):`);
      console.log(`    3,276 documents × ${docSize} bytes = ~${(3276 * docSize / 1024).toFixed(2)} KB`);
      console.log(`    ≈ ${(3276 * docSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  ✅ Well within 500MB free tier!`);
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
