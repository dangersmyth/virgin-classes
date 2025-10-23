// Visualize Booking Speed Data
// Requires: npm install chart.js chartjs-node-canvas
// Run with: node visualize-booking-speed.js

const fs = require('fs');

async function visualizeBookingSpeed() {
  console.log('📊 Creating Booking Speed Visualizations\n');

  // Check if analysis has been run
  if (!fs.existsSync('booking-speed-analysis.json')) {
    console.error('❌ Please run analyze-booking-speed.js first!');
    console.log('   Run: node analyze-booking-speed.js');
    process.exit(1);
  }

  const results = JSON.parse(fs.readFileSync('booking-speed-analysis.json', 'utf8'));
  console.log(`Loaded ${results.length} classes\n`);

  // Check data coverage based on when we SCRAPED (not class dates)
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const scrapeDaysCovered = new Set();

  // We need to re-read from MongoDB to get scrapedAt timestamps
  const { MongoClient } = require('mongodb');
  require('dotenv').config();

  // Quick check of scrape days
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('Project0');
  const collection = db.collection('classes');
  const allRecords = await collection.find().toArray();

  allRecords.forEach(record => {
    const scrapeDate = new Date(record.scrapedAt);
    const dayName = scrapeDate.toLocaleDateString('en-AU', {
      timeZone: 'Australia/Sydney',
      weekday: 'long'
    });
    scrapeDaysCovered.add(dayName);
  });

  await client.close();

  const missingDays = daysOfWeek.filter(day => !scrapeDaysCovered.has(day));
  const coverageComplete = missingDays.length === 0;

  // Generate HTML visualization (no dependencies required)
  const filledClasses = results.filter(r => r.everFilled).sort((a, b) => a.hoursToFull - b.hoursToFull);
  const neverFilled = results.filter(r => !r.everFilled);

  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Virgin Active - Class Booking Speed Analysis</title>
    <meta charset="utf-8">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        h1, h2 { color: #e10a0a; }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #e10a0a;
        }
        .stat-label {
            color: #666;
            font-size: 0.9em;
        }
        table {
            width: 100%;
            background: white;
            border-collapse: collapse;
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        th {
            background: #e10a0a;
            color: white;
            font-weight: 600;
        }
        tr:hover { background: #f9f9f9; }
        .fast { color: #d32f2f; font-weight: bold; }
        .medium { color: #f57c00; }
        .slow { color: #388e3c; }
        .badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.85em;
            font-weight: 600;
        }
        .badge-full { background: #ffebee; color: #c62828; }
        .badge-low { background: #fff3e0; color: #e65100; }
        .badge-available { background: #e8f5e9; color: #2e7d32; }
        .coverage-warning {
            background: #fff3e0;
            border-left: 4px solid #f57c00;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .coverage-complete {
            background: #e8f5e9;
            border-left: 4px solid #388e3c;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .day-badge {
            display: inline-block;
            padding: 4px 8px;
            margin: 2px;
            border-radius: 4px;
            font-size: 0.85em;
            font-weight: 600;
        }
        .day-covered { background: #e8f5e9; color: #2e7d32; }
        .day-missing { background: #ffebee; color: #c62828; }
        .chart-container {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .bar {
            background: linear-gradient(90deg, #e10a0a 0%, #ff5252 100%);
            height: 25px;
            margin: 5px 0;
            border-radius: 4px;
            display: flex;
            align-items: center;
            padding-left: 10px;
            color: white;
            font-weight: 600;
        }
        .time-bar {
            background: #e0e0e0;
            height: 30px;
            margin: 8px 0;
            border-radius: 4px;
            position: relative;
            overflow: hidden;
        }
        .time-bar-fill {
            background: linear-gradient(90deg, #e10a0a 0%, #ff5252 100%);
            height: 100%;
            display: flex;
            align-items: center;
            padding-left: 10px;
            color: white;
            font-weight: 600;
        }
        .time-label {
            position: absolute;
            left: 10px;
            top: 50%;
            transform: translateY(-50%);
            font-weight: 600;
            color: #333;
            z-index: 1;
        }
    </style>
</head>
<body>
    <h1>🏋️ Virgin Active - Class Booking Speed Analysis</h1>
    <p>Analysis of ${results.length} classes</p>

    <div class="${coverageComplete ? 'coverage-complete' : 'coverage-warning'}">
        <strong>${coverageComplete ? '✅ Complete Data Collection Coverage' : '⚠️ Incomplete Data Collection Coverage'}</strong>
        <p style="margin: 10px 0;">
            ${daysOfWeek.map(day =>
                `<span class="day-badge ${scrapeDaysCovered.has(day) ? 'day-covered' : 'day-missing'}">${day}</span>`
            ).join('')}
        </p>
        ${!coverageComplete ?
            `<p style="margin: 5px 0;">Missing scrapes for: <strong>${missingDays.join(', ')}</strong>. Continue collecting for ${missingDays.length} more day(s) for complete weekly coverage.</p>` :
            `<p style="margin: 5px 0;">Data scraped on all 7 days of the week!</p>`
        }
    </div>

    <div class="summary">
        <div class="card">
            <div class="stat-number">${filledClasses.length}</div>
            <div class="stat-label">Classes Filled Up</div>
        </div>
        <div class="card">
            <div class="stat-number">${neverFilled.length}</div>
            <div class="stat-label">Never Filled</div>
        </div>
        <div class="card">
            <div class="stat-number">${filledClasses.length > 0 ? (filledClasses.reduce((s,c) => s + c.hoursToFull, 0) / filledClasses.length).toFixed(1) : 0}h</div>
            <div class="stat-label">Avg Time to Fill</div>
        </div>
        <div class="card">
            <div class="stat-number">${filledClasses.length > 0 ? filledClasses[0].hoursToFull.toFixed(1) : 0}h</div>
            <div class="stat-label">Fastest to Fill</div>
        </div>
    </div>

    <div class="chart-container">
        <h2>🏆 Top 20 Fastest Filling Classes</h2>
        <table>
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>Class</th>
                    <th>Time</th>
                    <th>Day/Date</th>
                    <th>Instructor</th>
                    <th>Hours to Fill</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${filledClasses.slice(0, 20).map((cls, i) => `
                <tr>
                    <td><strong>${i + 1}</strong></td>
                    <td>${cls.className}</td>
                    <td>${cls.time}</td>
                    <td>${cls.date.replace(/\s+/g, ' ').substring(0, 25)}</td>
                    <td>${cls.instructor}</td>
                    <td class="${cls.hoursToFull < 24 ? 'fast' : cls.hoursToFull < 72 ? 'medium' : 'slow'}">
                        ${cls.hoursToFull.toFixed(1)} hours
                    </td>
                    <td><span class="badge badge-${cls.currentStatus.toLowerCase()}">${cls.currentStatus}</span></td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="chart-container">
        <h2>📊 Fill Rate by Class Type</h2>
        ${generateClassTypeChart(results)}
    </div>

    <div class="chart-container">
        <h2>⏰ Fill Rate by Time of Day</h2>
        ${generateTimeChart(results)}
    </div>

    <div class="chart-container">
        <h2>📋 All Classes - Complete List</h2>
        <p>Total: ${results.length} classes</p>
        <table>
            <thead>
                <tr>
                    <th>Class</th>
                    <th>Time</th>
                    <th>Date</th>
                    <th>Instructor</th>
                    <th>Hours to Fill</th>
                    <th>Current Status</th>
                </tr>
            </thead>
            <tbody>
                ${filledClasses.map(cls => `
                <tr>
                    <td>${cls.className}</td>
                    <td>${cls.time}</td>
                    <td>${cls.date.substring(0, 20)}</td>
                    <td>${cls.instructor}</td>
                    <td class="${cls.hoursToFull < 24 ? 'fast' : cls.hoursToFull < 72 ? 'medium' : 'slow'}">
                        ${cls.hoursToFull.toFixed(1)} hours
                    </td>
                    <td><span class="badge badge-${cls.currentStatus.toLowerCase()}">${cls.currentStatus}</span></td>
                </tr>
                `).join('')}
                ${neverFilled.map(cls => `
                <tr>
                    <td>${cls.className}</td>
                    <td>${cls.time}</td>
                    <td>${cls.date.substring(0, 20)}</td>
                    <td>${cls.instructor}</td>
                    <td style="color: #666;">Never filled</td>
                    <td><span class="badge badge-${cls.currentStatus.toLowerCase()}">${cls.currentStatus}</span></td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

</body>
</html>
  `;

  fs.writeFileSync('booking-speed-report.html', html);
  console.log('✅ Created: booking-speed-report.html');
  console.log('   Open this file in your browser to view the report!\n');
}

function generateClassTypeChart(results) {
  const byClassType = {};
  results.forEach(r => {
    if (!byClassType[r.className]) {
      byClassType[r.className] = { total: 0, filled: 0 };
    }
    byClassType[r.className].total++;
    if (r.everFilled) byClassType[r.className].filled++;
  });

  const sorted = Object.entries(byClassType)
    .map(([name, stats]) => ({
      name,
      fillRate: (stats.filled / stats.total * 100),
      filled: stats.filled,
      total: stats.total
    }))
    .sort((a, b) => b.fillRate - a.fillRate);

  return sorted.map(cls => `
    <div class="time-bar">
      <div class="time-label">${cls.name}</div>
      <div class="time-bar-fill" style="width: ${cls.fillRate}%">
        ${cls.fillRate > 15 ? `${cls.filled}/${cls.total} (${cls.fillRate.toFixed(0)}%)` : ''}
      </div>
    </div>
  `).join('');
}

function generateTimeChart(results) {
  const byTime = {};
  results.forEach(r => {
    if (!byTime[r.time]) {
      byTime[r.time] = { total: 0, filled: 0 };
    }
    byTime[r.time].total++;
    if (r.everFilled) byTime[r.time].filled++;
  });

  const sorted = Object.entries(byTime)
    .map(([time, stats]) => ({
      time,
      fillRate: (stats.filled / stats.total * 100),
      filled: stats.filled,
      total: stats.total,
      sortKey: parseTime(time)
    }))
    .sort((a, b) => a.sortKey - b.sortKey);

  return sorted.map(t => `
    <div class="time-bar">
      <div class="time-label">${t.time}</div>
      <div class="time-bar-fill" style="width: ${t.fillRate}%">
        ${t.fillRate > 10 ? `${t.filled}/${t.total} (${t.fillRate.toFixed(0)}%)` : ''}
      </div>
    </div>
  `).join('');
}

function parseTime(timeStr) {
  const match = timeStr.match(/(\d+):(\d+)(am|pm)/i);
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const isPM = match[3].toLowerCase() === 'pm';

  if (isPM && hours !== 12) hours += 12;
  if (!isPM && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

visualizeBookingSpeed().catch(console.error);
