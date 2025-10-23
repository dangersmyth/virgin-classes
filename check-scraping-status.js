// Check Scraping Status - See what data we have
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkStatus() {
  let client;

  try {
    console.log('📊 Checking Scraping Status\n');
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();

    const db = client.db('Project0');
    const collection = db.collection('classes');

    // Get all records
    const allRecords = await collection.find().sort({ scrapedAt: 1 }).toArray();

    console.log(`Total records: ${allRecords.length}\n`);

    if (allRecords.length === 0) {
      console.log('❌ No data in database yet!');
      return;
    }

    // Group by scrape time
    const scrapesByTime = {};
    allRecords.forEach(record => {
      const scrapeTime = new Date(record.scrapedAt).toLocaleString('en-AU', {
        timeZone: 'Australia/Sydney',
        dateStyle: 'short',
        timeStyle: 'short'
      });
      if (!scrapesByTime[scrapeTime]) {
        scrapesByTime[scrapeTime] = 0;
      }
      scrapesByTime[scrapeTime]++;
    });

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🕒 SCRAPES BY TIME');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const sortedScrapes = Object.entries(scrapesByTime).sort((a, b) => {
      return new Date(a[0]) - new Date(b[0]);
    });

    sortedScrapes.forEach(([time, count]) => {
      console.log(`${time.padEnd(20)} - ${count} classes scraped`);
    });

    // Get unique days
    const uniqueDays = new Set();
    const uniqueDates = new Set();

    allRecords.forEach(record => {
      const scrapeDate = new Date(record.scrapedAt);
      const dayName = scrapeDate.toLocaleDateString('en-AU', {
        timeZone: 'Australia/Sydney',
        weekday: 'long'
      });
      const dateStr = scrapeDate.toLocaleDateString('en-AU', {
        timeZone: 'Australia/Sydney'
      });
      uniqueDays.add(dayName);
      uniqueDates.add(dateStr);
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📅 DAYS SCRAPED');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`Unique scrape days: ${uniqueDays.size}`);
    console.log(`Days: ${Array.from(uniqueDays).join(', ')}\n`);
    console.log(`Unique dates: ${uniqueDates.size}`);
    console.log(`Dates: ${Array.from(uniqueDates).sort().join(', ')}\n`);

    // Check what class dates we're looking at
    const classDays = new Set();
    allRecords.forEach(record => {
      const dayMatch = record.classDate.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i);
      if (dayMatch) {
        classDays.add(dayMatch[0]);
      }
    });

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📚 CLASS DATES IN DATA');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`Class days covered: ${classDays.size}`);
    console.log(`Days: ${Array.from(classDays).sort().join(', ')}\n`);

    // Time range
    const firstScrape = new Date(allRecords[0].scrapedAt);
    const lastScrape = new Date(allRecords[allRecords.length - 1].scrapedAt);
    const hoursDiff = (lastScrape - firstScrape) / (1000 * 60 * 60);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('⏱️  TIME RANGE');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`First scrape: ${firstScrape.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}`);
    console.log(`Last scrape:  ${lastScrape.toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}`);
    console.log(`Duration: ${hoursDiff.toFixed(1)} hours (${(hoursDiff/24).toFixed(1)} days)\n`);

    // Expected scrapes (every 2 hours)
    const expectedScrapes = Math.floor(hoursDiff / 2) + 1;
    const actualScrapes = sortedScrapes.length;

    console.log(`Expected scrapes (every 2h): ~${expectedScrapes}`);
    console.log(`Actual scrapes: ${actualScrapes}`);

    if (actualScrapes < expectedScrapes) {
      console.log(`⚠️  Missing ~${expectedScrapes - actualScrapes} scrapes!\n`);
    } else {
      console.log(`✅ Scraping frequency looks good!\n`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

checkStatus();
