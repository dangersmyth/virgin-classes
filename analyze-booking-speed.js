// Analyze Which Classes Book Up Fastest
// Run with: node analyze-booking-speed.js

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function analyzeBookingSpeed() {
  let client;

  try {
    console.log('📊 Analyzing Class Booking Speed\n');
    console.log('Connecting to MongoDB...');
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();

    const db = client.db('Project0');
    const collection = db.collection('classes');

    // Get all unique classes (by classId which includes date, time, and name)
    const allClasses = await collection
      .find()
      .sort({ scrapedAt: 1 }) // Oldest first
      .toArray();

    console.log(`✓ Loaded ${allClasses.length} total records\n`);

    // Check data coverage by day of week
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📅 DATA COVERAGE CHECK');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const daysCovered = new Set();

    allClasses.forEach(record => {
      // Extract day from classDate
      const dayMatch = record.classDate.match(/(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i);
      if (dayMatch) {
        daysCovered.add(dayMatch[0]);
      }
    });

    console.log('Days with data collected:');
    daysOfWeek.forEach(day => {
      const hasCoverage = daysCovered.has(day);
      const icon = hasCoverage ? '✅' : '❌';
      console.log(`  ${icon} ${day}`);
    });

    const missingDays = daysOfWeek.filter(day => !daysCovered.has(day));
    if (missingDays.length > 0) {
      console.log(`\n⚠️  WARNING: Missing data for ${missingDays.length} day(s): ${missingDays.join(', ')}`);
      console.log('   Continue collecting data for complete weekly analysis.\n');
    } else {
      console.log(`\n✅ Complete coverage! Data for all 7 days of the week.\n`);
    }

    console.log(`Total unique days: ${daysCovered.size}/7`);
    console.log('');

    // Group by unique class (same date + time + name)
    const classesByIdentifier = {};

    allClasses.forEach(record => {
      const identifier = record.classId;
      if (!classesByIdentifier[identifier]) {
        classesByIdentifier[identifier] = [];
      }
      classesByIdentifier[identifier].push(record);
    });

    console.log(`✓ Found ${Object.keys(classesByIdentifier).length} unique classes\n`);

    // Analyze each class to find when it became FULL
    const results = [];

    for (const [identifier, records] of Object.entries(classesByIdentifier)) {
      // Sort by scrape time
      records.sort((a, b) => new Date(a.scrapedAt) - new Date(b.scrapedAt));

      const firstRecord = records[0];
      const lastRecord = records[records.length - 1];

      // Find when it became FULL
      const fullRecord = records.find(r => r.status === 'FULL');
      const lowRecord = records.find(r => r.status === 'LOW');

      // Calculate class availability time
      // Classes become available 7 days before at the same time
      // E.g., Monday 6am class on Oct 28 becomes available Monday 6am on Oct 21
      const classDateTime = parseClassDateTime(firstRecord.classDate, firstRecord.time);
      const availableFrom = new Date(classDateTime.getTime() - (7 * 24 * 60 * 60 * 1000)); // 7 days earlier

      let hoursToFull = null;
      let hoursToLow = null;
      let everFilled = false;
      let currentStatus = lastRecord.status;

      if (fullRecord) {
        everFilled = true;
        const fullTime = new Date(fullRecord.scrapedAt);
        hoursToFull = (fullTime - availableFrom) / (1000 * 60 * 60); // Hours
      }

      if (lowRecord) {
        const lowTime = new Date(lowRecord.scrapedAt);
        hoursToLow = (lowTime - availableFrom) / (1000 * 60 * 60); // Hours
      }

      results.push({
        className: firstRecord.className,
        time: firstRecord.time,
        date: firstRecord.classDate,
        instructor: firstRecord.instructor,
        availableFrom: availableFrom,
        everFilled: everFilled,
        hoursToFull: hoursToFull,
        hoursToLow: hoursToLow,
        currentStatus: currentStatus,
        firstSeenStatus: firstRecord.status,
        lastSeenStatus: lastRecord.status,
        timesChecked: records.length,
        identifier: identifier
      });
    }

    // Filter only classes that filled up
    const filledClasses = results.filter(r => r.everFilled);

    // Sort by hours to full (fastest first)
    filledClasses.sort((a, b) => a.hoursToFull - b.hoursToFull);

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🏆 FASTEST FILLING CLASSES (Ranked by Speed)');
    console.log('═══════════════════════════════════════════════════════════════\n');

    filledClasses.forEach((cls, index) => {
      console.log(`${index + 1}. ${cls.className} - ${cls.time}`);
      console.log(`   Date: ${cls.date.substring(0, 20)}...`);
      console.log(`   Instructor: ${cls.instructor}`);
      console.log(`   ⏱️  Filled in: ${cls.hoursToFull.toFixed(1)} hours`);
      if (cls.hoursToLow) {
        console.log(`   ⚠️  Got to LOW in: ${cls.hoursToLow.toFixed(1)} hours`);
      }
      console.log(`   Status now: ${cls.currentStatus}`);
      console.log('');
    });

    console.log(`\n📈 SUMMARY STATISTICS`);
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Total classes analyzed: ${results.length}`);
    console.log(`Classes that filled up: ${filledClasses.length} (${(filledClasses.length/results.length*100).toFixed(1)}%)`);
    console.log(`Classes still available: ${results.filter(r => !r.everFilled).length}`);

    if (filledClasses.length > 0) {
      const avgHoursToFull = filledClasses.reduce((sum, c) => sum + c.hoursToFull, 0) / filledClasses.length;
      const fastestClass = filledClasses[0];
      const slowestClass = filledClasses[filledClasses.length - 1];

      console.log(`\nAverage time to fill: ${avgHoursToFull.toFixed(1)} hours`);
      console.log(`Fastest to fill: ${fastestClass.hoursToFull.toFixed(1)} hours (${fastestClass.className})`);
      console.log(`Slowest to fill: ${slowestClass.hoursToFull.toFixed(1)} hours (${slowestClass.className})`);
    }

    // Breakdown by class type
    console.log('\n\n📊 FILL RATE BY CLASS TYPE');
    console.log('═══════════════════════════════════════════════════════════════');

    const byClassType = {};
    results.forEach(r => {
      if (!byClassType[r.className]) {
        byClassType[r.className] = { total: 0, filled: 0, avgHours: [] };
      }
      byClassType[r.className].total++;
      if (r.everFilled) {
        byClassType[r.className].filled++;
        byClassType[r.className].avgHours.push(r.hoursToFull);
      }
    });

    const classTypeSummary = Object.entries(byClassType)
      .map(([name, stats]) => ({
        name,
        total: stats.total,
        filled: stats.filled,
        fillRate: (stats.filled / stats.total * 100),
        avgHours: stats.avgHours.length > 0
          ? stats.avgHours.reduce((a, b) => a + b, 0) / stats.avgHours.length
          : null
      }))
      .sort((a, b) => b.fillRate - a.fillRate);

    classTypeSummary.forEach(cls => {
      console.log(`\n${cls.name}`);
      console.log(`  Fills ${cls.filled}/${cls.total} times (${cls.fillRate.toFixed(1)}%)`);
      if (cls.avgHours !== null) {
        console.log(`  Average time to fill: ${cls.avgHours.toFixed(1)} hours`);
      }
    });

    // Breakdown by time of day
    console.log('\n\n⏰ FILL RATE BY TIME OF DAY');
    console.log('═══════════════════════════════════════════════════════════════');

    const byTime = {};
    results.forEach(r => {
      if (!byTime[r.time]) {
        byTime[r.time] = { total: 0, filled: 0 };
      }
      byTime[r.time].total++;
      if (r.everFilled) {
        byTime[r.time].filled++;
      }
    });

    const timeSummary = Object.entries(byTime)
      .map(([time, stats]) => ({
        time,
        total: stats.total,
        filled: stats.filled,
        fillRate: (stats.filled / stats.total * 100)
      }))
      .sort((a, b) => {
        // Sort by time
        const timeA = parseTime(a.time);
        const timeB = parseTime(b.time);
        return timeA - timeB;
      });

    timeSummary.forEach(t => {
      const bar = '█'.repeat(Math.round(t.fillRate / 5));
      console.log(`${t.time.padEnd(8)} ${t.filled}/${t.total} ${bar} ${t.fillRate.toFixed(0)}%`);
    });

    // Export detailed data for further analysis
    console.log('\n\n💾 Exporting detailed data for analysis...');
    const fs = require('fs');

    // Export all results as JSON
    fs.writeFileSync(
      'booking-speed-analysis.json',
      JSON.stringify(results, null, 2)
    );
    console.log('✓ Saved to: booking-speed-analysis.json');

    // Export filled classes as CSV
    const csv = [
      'Rank,Class Name,Time,Day/Date,Instructor,Hours to Fill,Hours to Low,Current Status',
      ...filledClasses.map((cls, i) =>
        `${i+1},"${cls.className}","${cls.time}","${cls.date.replace(/\s+/g, ' ')}","${cls.instructor}",${cls.hoursToFull.toFixed(1)},${cls.hoursToLow ? cls.hoursToLow.toFixed(1) : 'N/A'},${cls.currentStatus}`
      )
    ].join('\n');

    fs.writeFileSync('fastest-filling-classes.csv', csv);
    console.log('✓ Saved to: fastest-filling-classes.csv');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('\n✓ Connection closed');
    }
  }
}

// Helper function to parse class date and time
function parseClassDateTime(dateStr, timeStr) {
  // dateStr is like "MondayMon 27 Oct"
  // timeStr is like "6:00am"

  // Extract day number and month
  const dayMatch = dateStr.match(/\d+/);
  const monthMatch = dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);

  if (!dayMatch || !monthMatch) {
    return new Date(); // Fallback
  }

  const day = parseInt(dayMatch[0]);
  const monthStr = monthMatch[0];
  const year = 2025; // Adjust as needed

  const months = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };

  // Parse time
  const timeMatch = timeStr.match(/(\d+):(\d+)(am|pm)/i);
  let hours = parseInt(timeMatch[1]);
  const minutes = parseInt(timeMatch[2]);
  const isPM = timeMatch[3].toLowerCase() === 'pm';

  if (isPM && hours !== 12) hours += 12;
  if (!isPM && hours === 12) hours = 0;

  return new Date(year, months[monthStr], day, hours, minutes, 0);
}

// Helper function to parse time for sorting
function parseTime(timeStr) {
  const match = timeStr.match(/(\d+):(\d+)(am|pm)/i);
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const isPM = match[3].toLowerCase() === 'pm';

  if (isPM && hours !== 12) hours += 12;
  if (!isPM && hours === 12) hours = 0;

  return hours * 60 + minutes; // Return minutes since midnight
}

analyzeBookingSpeed();
