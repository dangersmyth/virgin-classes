// Debug Scraper - Test Each Step Individually
// Run with: node debug-scraper.js

const puppeteer = require('puppeteer');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config();

// Configuration
const config = {
  username: process.env.GYM_USERNAME,
  password: process.env.GYM_PASSWORD,
  mongoUri: process.env.MONGODB_URI,
  dbName: 'Project0',  // Changed from 'Project 0' - MongoDB doesn't allow spaces in database names
  collectionName: 'classes'
};

// Create screenshots directory
const screenshotsDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

// Helper to wait for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function waitForUser(message) {
  // Auto-continue for automated testing
  console.log(`\n${message}`);
  return new Promise((resolve) => {
    setTimeout(resolve, 1000); // Just wait 1 second instead of user input
  });
}

// Helper to take screenshots
async function takeScreenshot(page, stepName) {
  const filename = `${stepName}-${Date.now()}.png`;
  const filepath = path.join(screenshotsDir, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Screenshot saved: ${filepath}`);
  return filepath;
}

async function debugScraper() {
  let browser;
  let page;
  let mongoClient;
  
  try {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  VIRGIN ACTIVE DEBUG SCRAPER           ║');
    console.log('║  Step-by-Step Testing Mode             ║');
    console.log('╚════════════════════════════════════════╝\n');
    
    // ============================================
    // STEP 0: Configuration Check
    // ============================================
    console.log('\n━━━ STEP 0: Configuration Check ━━━');
    console.log('Username:', config.username ? '✓ SET' : '✗ MISSING');
    console.log('Password:', config.password ? '✓ SET (hidden)' : '✗ MISSING');
    console.log('MongoDB URI:', config.mongoUri ? '✓ SET (hidden)' : '✗ MISSING');
    console.log('Database:', config.dbName);
    
    if (!config.username || !config.password || !config.mongoUri) {
      throw new Error('❌ Missing required environment variables in .env file');
    }
    
    await waitForUser('✓ Configuration looks good!');
    
    // ============================================
    // STEP 1: Launch Browser
    // ============================================
    console.log('\n━━━ STEP 1: Launching Browser ━━━');
    browser = await puppeteer.launch({
      headless: false, // Set to false so you can SEE what's happening
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--window-size=1280,800'
      ],
      slowMo: 100 // Slow down actions so you can see them
    });
    console.log('✓ Browser launched');

    page = await browser.newPage();

    // Set timezone to AEST to ensure dates are shown correctly
    await page.emulateTimezone('Australia/Sydney');
    console.log('✓ Timezone set to Australia/Sydney (AEST)');

    await page.setViewport({ width: 1280, height: 800 });
    console.log('✓ Page created');
    
    await waitForUser('✓ Browser is open and ready');
    
    // ============================================
    // STEP 2: Navigate to Login Page
    // ============================================
    console.log('\n━━━ STEP 2: Navigating to Login Page ━━━');
    console.log('URL: https://mylocker.virginactive.com.au/#/login');
    
    await page.goto('https://mylocker.virginactive.com.au/#/login', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    console.log('✓ Page loaded');
    
    await takeScreenshot(page, '01-login-page');
    console.log('✓ Screenshot taken');
    
    await waitForUser('✓ Check the browser - are you on the login page?');
    
    // ============================================
    // STEP 3: Find and Fill Username
    // ============================================
    console.log('\n━━━ STEP 3: Finding Username Field ━━━');
    
    try {
      await page.waitForSelector('input[type="text"], input[name="username"]', { timeout: 10000 });
      console.log('✓ Username field found');
      
      await page.type('input[type="text"], input[name="username"]', config.username, { delay: 50 });
      console.log('✓ Username entered');
      
      await takeScreenshot(page, '02-username-entered');
      await waitForUser('✓ Check browser - is username filled in?');
      
    } catch (error) {
      console.error('❌ Could not find username field');
      await takeScreenshot(page, 'ERROR-no-username-field');
      throw error;
    }
    
    // ============================================
    // STEP 4: Find and Fill Password
    // ============================================
    console.log('\n━━━ STEP 4: Finding Password Field ━━━');
    
    try {
      await page.waitForSelector('input[type="password"]', { timeout: 5000 });
      console.log('✓ Password field found');
      
      await page.type('input[type="password"]', config.password, { delay: 50 });
      console.log('✓ Password entered');
      
      await takeScreenshot(page, '03-password-entered');
      await waitForUser('✓ Check browser - is password filled in? (will show dots)');
      
    } catch (error) {
      console.error('❌ Could not find password field');
      await takeScreenshot(page, 'ERROR-no-password-field');
      throw error;
    }
    
    // ============================================
    // STEP 5: Click Login Button
    // ============================================
    console.log('\n━━━ STEP 5: Clicking Login Button ━━━');
    
    try {
      // Wait for login button to be ready
      await page.waitForSelector('button[type="submit"]', { timeout: 10000 });

      console.log('✓ Login button found');
      await takeScreenshot(page, '04-before-login-click');

      // Click and wait for navigation with proper Promise handling
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
        page.click('button[type="submit"]')
      ]);

      console.log('✓ Login button clicked and navigation completed');

      await waitForUser('✓ Button clicked - watch the browser!');

    } catch (error) {
      console.error('❌ Could not find or click login button');
      await takeScreenshot(page, 'ERROR-login-button');
      throw error;
    }
    
    // ============================================
    // STEP 6: Verify Login Success
    // ============================================
    console.log('\n━━━ STEP 6: Verifying Login Success ━━━');

    try {
      // Extra wait for page to fully load
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('Current URL:', page.url());

      await takeScreenshot(page, '05-after-login');

      // Check if we're actually logged in
      const currentUrl = page.url();
      if (currentUrl.includes('login')) {
        console.warn('⚠️  WARNING: Still on login page - login may have failed!');
        await waitForUser('Check browser - did login fail? Is there an error message?');
      } else {
        console.log('✓ Login appears successful!');
        await waitForUser('✓ Check browser - are you logged in and on the home page?');
      }

    } catch (error) {
      console.error('❌ Login verification failed');
      await takeScreenshot(page, 'ERROR-after-login');
      throw error;
    }
    
    // ============================================
    // STEP 7: Navigate to Book a Class
    // ============================================
    console.log('\n━━━ STEP 7: Navigating to Book a Class ━━━');
    console.log('URL: https://mylocker.virginactive.com.au/#/bookaclass');
    
    await page.goto('https://mylocker.virginactive.com.au/#/bookaclass', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    console.log('✓ Navigated to booking page');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    await takeScreenshot(page, '06-booking-page');
    
    await waitForUser('✓ Check browser - are you on the booking page with dates showing?');
    
    // ============================================
    // STEP 8: Find Date Buttons
    // ============================================
    console.log('\n━━━ STEP 8: Finding Date Buttons ━━━');

    try {
      // Wait for calendar/timetable to load
      await page.waitForSelector('.vaTimetable, [class*="timetable"], [class*="date"]', { timeout: 10000 });
      console.log('✓ Timetable found');

      // Wait for date elements to be fully rendered
      await new Promise(resolve => setTimeout(resolve, 2000));

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
            console.log(`✓ Found ${dateElements.length} date elements using selector: ${selector}`);
            break;
          }
        }
      }

      if (dateElements.length === 0) {
        throw new Error('No date elements found');
      }

      // Log information about each date element
      console.log('\nDate elements found:');
      console.log('Current date/time in AEST:', new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' }));
      console.log('');

      for (let i = 0; i < dateElements.length; i++) {
        const text = await page.evaluate(el => el.textContent, dateElements[i]);
        const classes = await page.evaluate(el => el.className, dateElements[i]);
        const position = i === 0 ? 'FIRST (today?)' :
                        i === dateElements.length - 1 ? 'LAST (furthest)' :
                        i === dateElements.length - 2 ? '⭐ TARGET (1 week out)' : '';
        console.log(`  [${i}]: ${text.trim()} ${position}`);
        if (i === dateElements.length - 2) {
          console.log(`       ^ This is what we'll select`);
        }
      }
      console.log(`\nTotal dates available: ${dateElements.length}`);
      console.log(`Selecting index ${dateElements.length - 2} (second from last)`);

      await takeScreenshot(page, '07-dates-visible');
      await waitForUser(`✓ Found ${dateElements.length} dates. Check browser to verify.`);
      
      // ============================================
      // STEP 9: Click Second Date from Right
      // ============================================
      console.log('\n━━━ STEP 9: Clicking Second Date from Right ━━━');

      if (dateElements.length < 2) {
        throw new Error('Not enough date elements found');
      }

      const targetIndex = dateElements.length - 2;
      const targetDateElement = dateElements[targetIndex];

      const dateText = await page.evaluate(el => el.textContent, targetDateElement);
      console.log(`Target date (index ${targetIndex}): ${dateText.trim()}`);
      console.log('Clicking...');

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

      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for classes to load

      console.log('✓ Date clicked');
      await takeScreenshot(page, '08-date-selected');

      await waitForUser('✓ Check browser - did the date turn red/selected? Did classes load?');
      
      // ============================================
      // STEP 10: Verify Date Selection
      // ============================================
      console.log('\n━━━ STEP 10: Verifying Date Selection ━━━');
      
      const isSelected = await page.evaluate((element) => {
        const computedStyle = window.getComputedStyle(element);
        const bgColor = computedStyle.backgroundColor;
        const classList = element.className;
        
        return {
          backgroundColor: bgColor,
          classes: classList,
          isRed: bgColor.includes('255, 0, 0'),
          hasSelectedClass: classList.includes('selected') || classList.includes('active')
        };
      }, targetDateElement);
      
      console.log('Date status:', isSelected);
      
      if (isSelected.isRed || isSelected.hasSelectedClass) {
        console.log('✓ Date appears to be selected (red or has selected class)');
      } else {
        console.warn('⚠️  WARNING: Date may not be properly selected');
      }
      
      await waitForUser('Check the visual state of the date button');
      
      // ============================================
      // STEP 11: Find Class Rows
      // ============================================
      console.log('\n━━━ STEP 11: Finding Class Rows ━━━');
      
      const classSelectors = [
        '[class*="classRow"]',
        'tr[class*="class"]',
        '.class-item',
        'tr',
        '[class*="Row"]'
      ];
      
      let classRows = [];
      let classSelector = '';

      for (const selector of classSelectors) {
        classRows = await page.$$(selector);
        if (classRows.length > 0) {
          classSelector = selector;
          console.log(`✓ Found ${classRows.length} potential class rows using: ${selector}`);
          break;
        }
      }
      
      if (classRows.length === 0) {
        throw new Error('No class rows found');
      }
      
      await takeScreenshot(page, '09-classes-visible');
      await waitForUser(`Found ${classRows.length} rows. Check browser to see classes.`);
      
      // ============================================
      // STEP 12: Extract Class Data
      // ============================================
      console.log('\n━━━ STEP 12: Extracting Class Data ━━━');
      
      const classes = await page.evaluate((classSelector) => {
        const rows = document.querySelectorAll(classSelector);
        const scrapedData = [];
        
        rows.forEach((row, index) => {
          try {
            // Try multiple ways to find data
            const cells = row.querySelectorAll('td');
            
            // Extract data by cell position
            // Columns: Time, Class, Duration, Location, Instructor, (empty)
            let time = '', className = '', duration = '', location = '', instructor = '';

            if (cells.length >= 5) {
              time = cells[0]?.textContent.trim() || '';
              className = cells[1]?.textContent.trim() || '';
              duration = cells[2]?.textContent.trim() || '';
              location = cells[3]?.textContent.trim() || '';
              instructor = cells[4]?.textContent.trim() || '';
            }
            
            // Determine status based on CSS classes
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
            
            // Only add if we have at least time and class name
            if (time && className) {
              scrapedData.push({
                index,
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
      }, classSelector);
      
      console.log(`\n✓ Extracted ${classes.length} classes:`);
      classes.forEach((cls, i) => {
        console.log(`\n  Class ${i + 1}:`);
        console.log(`    Time: ${cls.time}`);
        console.log(`    Name: ${cls.className}`);
        console.log(`    Instructor: ${cls.instructor}`);
        console.log(`    Status: ${cls.status}`);
      });
      
      await waitForUser(`\nExtracted ${classes.length} classes. Review the data above.`);
      
      if (classes.length === 0) {
        throw new Error('No valid class data extracted');
      }
      
      // ============================================
      // STEP 13: Test MongoDB Connection
      // ============================================
      console.log('\n━━━ STEP 13: Testing MongoDB Connection ━━━');
      
      try {
        mongoClient = new MongoClient(config.mongoUri);
        await mongoClient.connect();
        console.log('✓ Connected to MongoDB');
        
        const db = mongoClient.db(config.dbName);
        console.log(`✓ Using database: ${config.dbName}`);
        
        const collection = db.collection(config.collectionName);
        console.log(`✓ Using collection: ${config.collectionName}`);
        
        await waitForUser('✓ MongoDB connection successful!');
        
        // ============================================
        // STEP 14: Insert Test Data
        // ============================================
        console.log('\n━━━ STEP 14: Inserting Data into MongoDB ━━━');
        
        // Get current time in AEST (Australian Eastern Standard Time)
        const now = new Date();
        const aestTime = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));

        // Prepare optimized data - only essential fields
        const documentsToInsert = classes.map((cls, idx) => ({
          classId: `${dateText.trim().replace(/\s+/g, '')}_${cls.time}_${cls.className}`.substring(0, 100),
          status: cls.status,        // FULL, LOW, or AVAILABLE
          classDate: dateText.trim(), // Date of the class
          time: cls.time,            // Time of class
          className: cls.className,  // Type of class
          instructor: cls.instructor, // Instructor name (e.g., "Clare S")
          scrapedAt: aestTime,       // When scraped (AEST)
          index: idx                 // Position in list
        }));
        
        const result = await collection.insertMany(documentsToInsert);
        console.log(`✓ Inserted ${result.insertedCount} documents`);
        
        await waitForUser('✓ Data inserted! Check MongoDB Atlas to verify.');
        
      } catch (error) {
        console.error('❌ MongoDB error:', error.message);
        throw error;
      }
      
    } catch (error) {
      console.error('❌ Error in date/class section:', error.message);
      await takeScreenshot(page, 'ERROR-date-selection');
      throw error;
    }
    
    // ============================================
    // FINAL SUMMARY
    // ============================================
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║  ✓ ALL STEPS COMPLETED SUCCESSFULLY!  ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('\nSummary:');
    console.log(`  ✓ Logged in successfully`);
    console.log(`  ✓ Navigated to booking page`);
    console.log(`  ✓ Found and selected date`);
    console.log(`  ✓ Extracted and inserted class data`);
    console.log(`  ✓ Connected to MongoDB`);
    console.log(`  ✓ Data saved successfully`);
    console.log('\nScreenshots saved in: ./screenshots/');
    console.log('\nYour main scraper should work now! 🎉');
    
  } catch (error) {
    console.error('\n\n❌ ERROR OCCURRED:');
    console.error(error);
    console.log('\nCheck the screenshots in ./screenshots/ folder for visual debugging');
    
  } finally {
    if (page) {
      await takeScreenshot(page, '99-final-state');
    }
    
    rl.close();
    
    console.log('\nKeeping browser open for 10 seconds so you can inspect...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
    
    if (mongoClient) {
      await mongoClient.close();
      console.log('MongoDB connection closed');
    }
  }
}

// Run the debug scraper
debugScraper()
  .then(() => {
    console.log('\n✓ Debug scraper completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Debug scraper failed:', error);
    process.exit(1);
  });