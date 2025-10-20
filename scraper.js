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
    await page.click('button[type="submit"], button:has-text("LOGIN")');
    
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
    await page.waitForTimeout(2000); // Give time for dynamic content
    
    // Step 3: Select the second date from the right (the furthest bookable date)
    console.log('Selecting target date...');
    
    const dateElements = await page.$$('[class*="date"], .date-selector, [role="button"][class*="day"]');
    
    if (dateElements.length < 2) {
      throw new Error('Could not find enough date elements');
    }
    
    // Click the second from right (index length-2)
    const targetDateElement = dateElements[dateElements.length - 2];
    await targetDateElement.click();
    await page.waitForTimeout(2000); // Wait for classes to load
    
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
          // Extract time
          const timeElement = row.querySelector('[class*="time"], .time, td:first-child');
          const time = timeElement ? timeElement.textContent.trim() : '';
          
          // Extract class name
          const classElement = row.querySelector('[class*="class"], .class-name, td:nth-child(2)');
          const className = classElement ? classElement.textContent.trim() : '';
          
          // Extract instructor
          const instructorElement = row.querySelector('[class*="instructor"], .instructor, td:nth-child(3)');
          const instructor = instructorElement ? instructorElement.textContent.trim() : '';
          
          // Determine availability status
          let status = 'AVAILABLE';
          const rowClasses = row.className.toLowerCase();
          const computedStyle = window.getComputedStyle(row);
          const bgColor = computedStyle.backgroundColor;
          
          // Check left border or background color for status
          const leftBorder = computedStyle.borderLeftColor;
          
          if (rowClasses.includes('full') || 
              leftBorder.includes('255, 0, 0') || 
              bgColor.includes('255, 0, 0')) {
            status = 'FULL';
          } else if (rowClasses.includes('low') || 
                     leftBorder.includes('255, 165, 0') || 
                     bgColor.includes('255, 165, 0') ||
                     leftBorder.includes('orange')) {
            status = 'LOW'; // <5 spots remaining
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
              instructor,
              status,
              spacesRemaining
            });
          }
        } catch (err) {
          console.error('Error parsing row:', err);
        }
      });
      
      return scrapedData;
    });
    
    console.log(`Found ${classes.length} classes`);
    
    // Prepare data for database
    const timestamp = new Date();
    const documentsToInsert = classes.map(cls => ({
      ...cls,
      date: selectedDate,
      scrapedAt: timestamp,
      url: page.url()
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