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
    // NOTE: Using headless: false because the Virgin Active Angular app
    // does not properly load data in headless mode (API calls fail/hang)
    // This works fine in GitHub Actions with Xvfb virtual display
    browser = await puppeteer.launch({
      headless: false,  // Angular app requires visible browser to load data properly
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1280,800'
      ]
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

    // Give Angular time to fully bootstrap after login
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Navigate to Book a Class
    console.log('Navigating to book a class...');
    await page.goto('https://mylocker.virginactive.com.au/#/bookaclass', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for Angular to handle the route change
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Wait for the calendar page to load
    console.log('Waiting for timetable container...');
    await page.waitForSelector('.vaTimetable', { timeout: 15000 });
    console.log('Timetable container found');

    // Wait for Angular to bootstrap and load data
    console.log('Waiting for Angular to bootstrap and load club/timetable data...');

    try {
      // First, wait for the loading spinner to disappear
      await page.waitForFunction(
        () => {
          const loader = document.querySelector('.ajaxLoader, ajax-loader');
          return !loader || loader.offsetParent === null || window.getComputedStyle(loader).display === 'none';
        },
        { timeout: 30000 }
      );
      console.log('✓ Loading spinner cleared');

      // Wait for the club selector to be populated (this loads first)
      await page.waitForFunction(
        () => {
          const clubSelect = document.querySelector('select.virginSelect');
          return clubSelect && clubSelect.options.length > 1; // More than just the default option
        },
        { timeout: 30000 }
      );
      console.log('✓ Club selector populated');

      // Now wait for date elements to render
      await page.waitForFunction(
        () => {
          const datePicker = document.querySelector('.vaFlexDatePicker');
          if (!datePicker) return false;
          const renderedDates = datePicker.querySelectorAll('[ng-click*="date"], [ng-click*="selectDate"]');
          return renderedDates.length > 0;
        },
        { timeout: 30000 }
      );
      console.log('✓ Date elements rendered');

    } catch (e) {
      console.error('✗ Timeout waiting for Angular to load data');
      console.log('Taking screenshot for debugging...');
      await page.screenshot({ path: 'screenshots/angular-timeout.png', fullPage: true });

      // Log what we can see
      const pageState = await page.evaluate(() => {
        return {
          hasLoader: !!document.querySelector('.ajaxLoader, ajax-loader'),
          clubSelectOptions: document.querySelector('select.virginSelect')?.options.length || 0,
          datePickerExists: !!document.querySelector('.vaFlexDatePicker'),
          bodyText: document.body?.textContent?.substring(0, 500)
        };
      });
      console.log('Page state:', JSON.stringify(pageState, null, 2));

      throw new Error('Angular failed to load data within 30 seconds - possible API or authentication issue');
    }

    // Extra buffer for any animations/transitions
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Select the second date from the right (the furthest bookable date)
    console.log('Selecting target date...');

    // Debug: Take a screenshot and log page info
    const fs = require('fs');
    if (!fs.existsSync('screenshots')) {
      fs.mkdirSync('screenshots', { recursive: true });
    }
    await page.screenshot({ path: 'screenshots/scraper-debug.png', fullPage: true });
    console.log('Screenshot saved: screenshots/scraper-debug.png');

    // Save HTML for debugging
    const html = await page.content();
    fs.writeFileSync('screenshots/scraper-page.html', html);
    console.log('Page HTML saved: screenshots/scraper-page.html');

    // Debug: Log what's on the page
    const pageInfo = await page.evaluate(() => {
      const allDivs = document.querySelectorAll('div');
      const allElements = document.querySelectorAll('*');
      const divsWithDay = [];
      const bodyText = document.body?.textContent || '';

      allDivs.forEach((div, idx) => {
        const text = div.textContent?.trim();
        if (text && /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/.test(text) && text.length < 50) {
          divsWithDay.push({
            index: idx,
            text: text.substring(0, 100),
            classes: div.className,
            ngRepeat: div.getAttribute('ng-repeat'),
            ngClick: div.getAttribute('ng-click')
          });
        }
      });

      return {
        url: window.location.href,
        totalElements: allElements.length,
        totalDivs: allDivs.length,
        divsWithDay: divsWithDay.slice(0, 20),
        bodyTextPreview: bodyText.substring(0, 500)
      };
    });
    console.log('Page debug info:', JSON.stringify(pageInfo, null, 2));

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
    let usedSelector = '';

    for (const selector of dateSelectors) {
      const elements = await page.$$(selector);
      console.log(`Trying selector "${selector}": found ${elements.length} elements`);

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
          usedSelector = selector;
          console.log(`Found ${dateElements.length} valid date elements using selector: ${selector}`);
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