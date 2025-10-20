// Investigate Class Availability Indicators
// This script will help us understand how Virgin Active indicates if a class is full

const puppeteer = require('puppeteer');
require('dotenv').config();

const config = {
  username: process.env.GYM_USERNAME,
  password: process.env.GYM_PASSWORD
};

async function investigate() {
  let browser;

  try {
    console.log('Starting browser...');
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
      slowMo: 50
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Login
    console.log('Logging in...');
    await page.goto('https://mylocker.virginactive.com.au/#/login', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await page.waitForSelector('input[type="text"]', { timeout: 10000 });
    await page.type('input[type="text"]', config.username);
    await page.type('input[type="password"]', config.password);

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
      page.click('button[type="submit"]')
    ]);

    console.log('Logged in successfully!');

    // Navigate to booking page
    console.log('Going to booking page...');
    await page.goto('https://mylocker.virginactive.com.au/#/bookaclass', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Find and click the second-to-last date
    const dateElements = await page.$$('[ng-repeat*="date"]');
    if (dateElements.length >= 2) {
      const targetDate = dateElements[dateElements.length - 2];
      await targetDate.click();
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log('Date selected!\n');
    }

    // Now investigate the class rows
    console.log('Investigating class availability indicators...\n');

    const classInfo = await page.evaluate(() => {
      const rows = document.querySelectorAll('[class*="classRow"]');
      const results = [];

      rows.forEach((row, index) => {
        if (index >= 10) return; // Only check first 10 classes

        try {
          const timeEl = row.querySelector('td:first-child');
          const classEl = row.querySelector('td:nth-child(2)');
          const time = timeEl?.textContent.trim();
          const className = classEl?.textContent.trim();

          // Look for booking button or action element
          const bookButton = row.querySelector('button, a[ng-click], [ng-click*="book"], td:last-child button, td:last-child a');
          const allButtons = row.querySelectorAll('button, a[ng-click]');

          // Check if button is disabled or has certain classes
          const isDisabled = bookButton?.disabled || bookButton?.getAttribute('disabled') !== null;
          const buttonClasses = bookButton?.className || '';
          const buttonText = bookButton?.textContent.trim();
          const buttonStyle = bookButton ? window.getComputedStyle(bookButton) : {};

          // Check row attributes
          const rowClasses = row.className;
          const rowData = {
            'data-full': row.getAttribute('data-full'),
            'data-available': row.getAttribute('data-available'),
            'data-spaces': row.getAttribute('data-spaces')
          };

          // Look for any text indicators
          const fullText = row.textContent.toLowerCase();
          const hasFull = fullText.includes('full') || fullText.includes('waitlist');
          const hasSpaces = fullText.match(/(\d+)\s*(spot|space)/i);

          results.push({
            index,
            time,
            className,
            buttonInfo: {
              exists: !!bookButton,
              isDisabled,
              classes: buttonClasses,
              text: buttonText,
              opacity: buttonStyle.opacity,
              cursor: buttonStyle.cursor,
              totalButtons: allButtons.length
            },
            rowInfo: {
              classes: rowClasses,
              dataAttributes: rowData,
              hasFull,
              hasSpaces: hasSpaces ? hasSpaces[0] : null
            }
          });
        } catch (err) {
          console.error('Error parsing row:', err);
        }
      });

      return results;
    });

    // Print results
    classInfo.forEach(info => {
      console.log(`\n═══ Class ${info.index + 1}: ${info.time} - ${info.className} ═══`);
      console.log(`\nButton Info:`);
      console.log(`  Exists: ${info.buttonInfo.exists}`);
      console.log(`  Disabled: ${info.buttonInfo.isDisabled}`);
      console.log(`  Text: "${info.buttonInfo.text}"`);
      console.log(`  Classes: "${info.buttonInfo.classes}"`);
      console.log(`  Opacity: ${info.buttonInfo.opacity}`);
      console.log(`  Cursor: ${info.buttonInfo.cursor}`);
      console.log(`  Total Buttons in Row: ${info.buttonInfo.totalButtons}`);

      console.log(`\nRow Info:`);
      console.log(`  Classes: "${info.rowInfo.classes}"`);
      console.log(`  Data Attributes:`, info.rowInfo.dataAttributes);
      console.log(`  Has "full" text: ${info.rowInfo.hasFull}`);
      console.log(`  Spaces text: ${info.rowInfo.hasSpaces}`);
    });

    console.log('\n\n=== Keeping browser open for 30 seconds so you can inspect ===');
    await new Promise(resolve => setTimeout(resolve, 30000));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

investigate();
