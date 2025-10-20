// Virgin Active Class Availability Scraper
// Install dependencies: npm install puppeteer mongodb dotenv

const puppeteer = require('puppeteer');
const { MongoClient } = require('mongodb');
require('dotenv').config();

// Configuration from environment variables
const config = {
  username: process.env.GYM_USERNAME,
  password: process.env.GYM_PASSWORD,
  mongoUri: process.env.MONGODB_URI,
  dbName: 'Project0',
  collectionName: 'classes'
};

// Determine class availability status based on visual indicators
function getAvailabilityStatus(element) {
  const classList = element.className || '';
  const style = element.style || {};
  
  // Check for red (full) or orange (<5 spots) indicators
  if (classList.includes('full') || style.backgroundColor === 'red') {
    return 'FULL';
  } else if (classList.includes('low-availability') || style.backgroundColor === 'orange') {
    return 'LOW'; // <5 spots
  } else {
    return 'AVAILABLE';
  }
}

async function scrapeGymClasses() {
  let browser;
  let mongoClient;
  
  try {
    console.log('Starting browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set timezone to AEST to ensure dates are shown correctly
    // This is critical for GitHub Actions which runs in UTC
    await page.emulateTimezone('Australia/Sydney');
    console.log('Timezone set to Australia/Sydney (AEST)');

    await page.setViewport({ width: 1280, height: 800 });
    
    // Step 1: Login
    console.log('Navigating to login page...');
    await page.goto('https://mylocker.virginactive.com.au/#/login', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    console.log('Entering credentials...');
    await page.waitForSelector('input[name="username"], input[type="text"]', { timeout: 10000 });
    
    // Find and fill username field
    await page.type('input[name="username"], input[type="text"]', config.username);
    
    // Find and fill password field
    await page.type('input[name="password"], input[type="password"]', config.password);
    
    // Click login button
    await page.click('button[type="submit"]');

    // Wait for navigation after login
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Login successful!');
    
    // Step 2: Navigate to Book a Class
    console.log('Navigating to book a class...');
    await page.goto('https://mylocker.virginactive.com.au/#/bookaclass', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for the calendar to load
    await page.waitForSelector('.vaTimetable, [class*="timetable"]', { timeout: 10000 });
    await new Promise(resolve => setTimeout(resolve, 3000)); // Give time for dynamic content and Angular rendering

    // Step 3: Select the second date from the right (the furthest bookable date)
    console.log('Selecting target date...');

    // Try to find all date elements with multiple strategies
    // The page shows dates like "Monday\n20", "Tuesday\n21", etc. in clickable divs/buttons
    const dateSelectors = [
      '[ng-repeat*="date"]',  // Angular date repeat
      'div[ng-click*="selectDate"]',  // Angular click handler for selecting dates
      'a[ng-click*="date"]',
      'div[ng-click*="date"]',
      'button[ng-click*="date"]',
      '[class*="date-button"]',
      '[class*="dateButton"]',
      '[class*="day-selector"]'
    ];

    let dateElements = [];

    for (const selector of dateSelectors) {
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        // Filter to find elements that contain day names or date numbers
        const validDates = [];
        for (const el of elements) {
          const text = await page.evaluate(e => e.textContent?.trim().replace(/\s+/g, ' '), el);
          const isVisible = await page.evaluate(e => {
            const rect = e.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && window.getComputedStyle(e).visibility !== 'hidden';
          }, el);

          // Check if element contains a day name and/or a number (date pattern)
          const hasDate = text && /\d{1,2}/.test(text);
          const hasDayName = text && /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/.test(text);

          if (isVisible && (hasDate || hasDayName)) {
            validDates.push(el);
          }
        }
        if (validDates.length > 0) {
          dateElements = validDates;
          console.log(`Found ${dateElements.length} date elements using selector: ${selector}`);
          break;
        }
      }
    }

    console.log(`Total date elements found: ${dateElements.length}`);

    if (dateElements.length < 2) {
      throw new Error(`Could not find enough date elements (found ${dateElements.length}, need at least 2)`);
    }

    // Click the second from right (index length-2)
    const targetDateElement = dateElements[dateElements.length - 2];

    // Scroll element into view before clicking
    await page.evaluate(el => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, targetDateElement);

    await new Promise(resolve => setTimeout(resolve, 500));

    // Try multiple click methods to ensure it works
    try {
      await targetDateElement.click();
    } catch (e) {
      console.log('Regular click failed, trying JS click...');
      await page.evaluate(el => el.click(), targetDateElement);
    }

    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for classes to load
    
    // Step 4: Verify the date turned red
    console.log('Verifying date selection...');
    const isRedDate = await page.evaluate((element) => {
      const computedStyle = window.getComputedStyle(element);
      const bgColor = computedStyle.backgroundColor;
      const classList = element.className;
      
      return bgColor.includes('255, 0, 0') || 
             classList.includes('selected') || 
             classList.includes('active') ||
             bgColor === 'rgb(255, 0, 0)';
    }, targetDateElement);
    
    if (!isRedDate) {
      console.warn('Warning: Date may not be properly selected (not red)');
    }
    
    // Get the selected date
    const selectedDate = await page.evaluate((element) => {
      return element.textContent || element.innerText;
    }, targetDateElement);
    
    console.log(`Selected date: ${selectedDate}`);
    
    // Step 5: Scrape class data
    console.log('Scraping class data...');

    const classes = await page.evaluate(() => {
      const classRows = document.querySelectorAll('[class*="classRow"], tr[class*="class"], .class-item');
      const scrapedData = [];
      
      classRows.forEach(row => {
        try {
          // Extract data from table cells
          // Columns: Time, Class, Duration, Location, Instructor, (empty)
          const cells = row.querySelectorAll('td');

          let time = '', className = '', duration = '', location = '', instructor = '';

          if (cells.length >= 5) {
            time = cells[0]?.textContent.trim() || '';
            className = cells[1]?.textContent.trim() || '';
            duration = cells[2]?.textContent.trim() || '';
            location = cells[3]?.textContent.trim() || '';
            instructor = cells[4]?.textContent.trim() || '';
          }
          
          // Determine availability status based on CSS classes
          // rowFull = 0 spaces, rowGettingFull = 1-5 spaces, rowHasSpaces = >5 spaces
          let status = 'AVAILABLE';
          const rowClasses = row.className.toLowerCase();

          if (rowClasses.includes('rowfull')) {
            status = 'FULL';  // 0 spaces remaining
          } else if (rowClasses.includes('rowgettingfull')) {
            status = 'LOW';   // 1-5 spaces remaining
          } else if (rowClasses.includes('rowhasspaces')) {
            status = 'AVAILABLE';  // >5 spaces remaining
          }
          
          // Extract spaces remaining if visible
          const spacesElement = row.querySelector('[class*="spaces"], [class*="remaining"]');
          const spacesText = spacesElement ? spacesElement.textContent : '';
          const spacesMatch = spacesText.match(/(\d+)/);
          const spacesRemaining = spacesMatch ? parseInt(spacesMatch[1]) : null;
          
          if (time && className) {
            scrapedData.push({
              time,
              className,
              duration,
              location,
              instructor,
              status
            });
          }
        } catch (err) {
          console.error('Error parsing row:', err);
        }
      });
      
      return scrapedData;
    });
    
    console.log(`Found ${classes.length} classes`);

    // Get current time in AEST (Australian Eastern Standard Time)
    // UTC+10 for standard time, UTC+11 for daylight saving
    const now = new Date();
    const aestTime = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));

    // Prepare optimized data for database - only essential fields
    const documentsToInsert = classes.map((cls, index) => ({
      classId: `${selectedDate.replace(/\s+/g, '')}_${cls.time}_${cls.className}`.substring(0, 100),
      status: cls.status,          // FULL, LOW, or AVAILABLE
      classDate: selectedDate,      // Date of the class
      time: cls.time,               // Time of class (e.g., "6:00am")
      className: cls.className,     // Type of class
      instructor: cls.instructor,   // Instructor name (e.g., "Clare S")
      scrapedAt: aestTime,          // When we scraped (AEST)
      index: index                  // Position in list
    }));
    
    // Step 6: Save to MongoDB
    console.log('Connecting to MongoDB...');
    mongoClient = new MongoClient(config.mongoUri);
    await mongoClient.connect();
    
    const db = mongoClient.db(config.dbName);
    const collection = db.collection(config.collectionName);
    
    if (documentsToInsert.length > 0) {
      const result = await collection.insertMany(documentsToInsert);
      console.log(`Inserted ${result.insertedCount} classes into database`);
    } else {
      console.log('No classes to insert');
    }
    
    // Print summary
    console.log('\n=== SCRAPING SUMMARY ===');
    console.log(`Date: ${selectedDate}`);
    console.log(`Total classes: ${classes.length}`);
    console.log(`Available: ${classes.filter(c => c.status === 'AVAILABLE').length}`);
    console.log(`Low availability (<5): ${classes.filter(c => c.status === 'LOW').length}`);
    console.log(`Full: ${classes.filter(c => c.status === 'FULL').length}`);
    
    return {
      success: true,
      date: selectedDate,
      classCount: classes.length,
      classes: documentsToInsert
    };
    
  } catch (error) {
    console.error('Error during scraping:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}

// Main execution
if (require.main === module) {
  scrapeGymClasses()
    .then(result => {
      console.log('Scraping completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('Scraping failed:', error);
      process.exit(1);
    });
}

module.exports = { scrapeGymClasses };