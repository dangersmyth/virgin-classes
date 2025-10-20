# Virgin Active Class Scraper - Setup Guide

This guide will walk you through setting up an automated scraper that monitors Virgin Active class availability daily.

## 🎯 What This Does

- Logs into your Virgin Active account
- Navigates to the booking page
- Selects classes 1 week out (the furthest bookable date)
- Scrapes all class information: time, name, instructor, availability status
- Detects if classes are FULL (red), LOW availability (<5 spots, orange), or AVAILABLE
- Stores data in a free MongoDB database
- Runs automatically once per day for a week (or longer)

## 📋 Prerequisites

- A Virgin Active gym account
- A GitHub account (free)
- A MongoDB Atlas account (free tier, no credit card required)

---

## 🚀 Setup Instructions

### Step 1: Set Up Free MongoDB Database

1. **Create MongoDB Atlas Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
   - Sign up for a free account (no credit card needed)

2. **Create a Free Cluster**
   - Choose the FREE tier (M0 Sandbox)
   - Select a cloud provider and region close to you
   - Name your cluster (e.g., "gymdata")
   - Click "Create Cluster"

3. **Set Up Database Access**
   - Go to "Database Access" in the left sidebar
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Create a username and strong password (save these!)
   - Set privileges to "Atlas admin"
   - Click "Add User"

4. **Configure Network Access**
   - Go to "Network Access" in the left sidebar
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
   - This is necessary for GitHub Actions to connect
   - Click "Confirm"

5. **Get Your Connection String**
   - Go to "Database" in the left sidebar
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string (looks like: `mongodb+srv://username:<password>@cluster0.xxxxx.mongodb.net/`)
   - Replace `<password>` with your actual database password
   - Save this connection string!

### Step 2: Set Up GitHub Repository

1. **Create New Repository**
   - Go to [GitHub](https://github.com)
   - Click the "+" icon → "New repository"
   - Name it "virgin-classess" (or your preferred name)
   - Set to **Private** (recommended for credentials security)
   - Initialize with README
   - Click "Create repository"

2. **Upload Your Code**
   - Download all the artifacts I provided
   - Create this folder structure in your repository:
   ```
   virgin-classess/
   ├── .github/
   │   └── workflows/
   │       └── scraper.yml
   ├── scraper.js
   ├── package.json
   ├── .env.example
   └── README.md
   ```

3. **Configure GitHub Secrets**
   - In your repository, go to Settings → Secrets and variables → Actions
   - Click "New repository secret" and add these three secrets:
   
   **GYM_USERNAME**
   - Your Virgin Active email/username
   
   **GYM_PASSWORD**
   - Your Virgin Active password
   
   **MONGODB_URI**
   - Your MongoDB connection string from Step 1

### Step 3: Customize the Schedule

Edit `.github/workflows/scraper.yml` to set when it runs:

```yaml
schedule:
  # Run daily at 6 AM UTC (example)
  - cron: '0 6 * * *'
```

**Cron Schedule Examples:**
- `0 6 * * *` - Daily at 6 AM UTC
- `0 */6 * * *` - Every 6 hours
- `0 6 * * 1-5` - Weekdays only at 6 AM UTC
- `0 6,18 * * *` - Twice daily (6 AM and 6 PM UTC)

**Important:** GitHub Actions runs on UTC time. Convert your local time to UTC.
- Sydney (AEDT): UTC+11, so 6 AM Sydney = 7 PM UTC previous day = `0 19 * * *`
- Sydney (AEST): UTC+10, so 6 AM Sydney = 8 PM UTC previous day = `0 20 * * *`

### Step 4: Test Your Setup

1. **Manual Test**
   - Go to your repository
   - Click "Actions" tab
   - Select "Gym Class Scraper" workflow
   - Click "Run workflow" → "Run workflow"
   - Wait 2-3 minutes and check if it completes successfully

2. **Check MongoDB**
   - Go to MongoDB Atlas
   - Navigate to your cluster → Collections
   - You should see a database `Project0` with collection `classes`
   - View the scraped data

### Step 5: Monitor and Maintain

**View Results:**
- MongoDB Atlas → Browse Collections → `Project0` → `classes`
- Each document contains: time, className, instructor, status, date, scrapedAt

**Check Logs:**
- GitHub → Your repository → Actions tab
- Click on any workflow run to see logs

**If Something Fails:**
- Check the Actions logs for errors
- Common issues:
  - Login credentials incorrect → Update GitHub secrets
  - Website structure changed → May need to update selectors in scraper.js
  - MongoDB connection issues → Verify connection string and network access

---

## 📊 Understanding the Data

### Class Status Values:
- **AVAILABLE**: Class has spots available (appears green/normal)
- **LOW**: Less than 5 spots remaining (appears orange)
- **FULL**: No spots available (appears red)

### Database Schema:
```javascript
{
  time: "6:00am",
  className: "Boxing",
  instructor: "Nick F",
  status: "AVAILABLE", // or "LOW" or "FULL"
  spacesRemaining: 12, // if available
  date: "Mon 27",
  scrapedAt: ISODate("2025-10-20T06:00:00Z"),
  url: "https://mylocker.virginactive.com.au/#/bookaclass"
}
```

---

## 🎛️ Alternative Hosting Options

If you prefer not to use GitHub Actions:

### Option 1: Railway (Free Tier)
- 500 hours/month free
- Go to [railway.app](https://railway.app)
- Connect your GitHub repo
- Add a cron job in the dashboard

### Option 2: Render (Free Tier)
- Cron jobs available on free tier
- Go to [render.com](https://render.com)
- Create a new Cron Job
- Set schedule and connect repo

### Option 3: Local Machine
- Clone the repo locally
- Run `npm install`
- Create `.env` file with your credentials
- Use your OS's task scheduler:
  - **macOS/Linux**: `crontab -e` then add: `0 6 * * * cd /path/to/scraper && npm start`
  - **Windows**: Use Task Scheduler

---

## 🔒 Security Best Practices

1. **Never commit credentials** - Always use environment variables
2. **Use a private repository** - Keeps your code and logs private
3. **Use strong passwords** - Especially for MongoDB
4. **Rotate credentials periodically** - Update secrets every few months
5. **Monitor access logs** - Check MongoDB Atlas access logs

---

## 🛠️ Customization Ideas

### Extend to Multiple Weeks:
Modify the scraper to loop through multiple dates and collect data for 2-4 weeks ahead.

### Add Notifications:
Integrate with services like:
- Twilio (SMS notifications when your favorite class has spots)
- Discord/Slack webhooks
- Email via SendGrid

### Data Analysis:
Query MongoDB to find:
- Which classes fill up fastest
- Best times to find availability
- Instructor popularity patterns

### Web Dashboard:
Build a simple web app to visualize the data using:
- React + Recharts
- Express.js backend
- MongoDB for data

---

## 📞 Troubleshooting

### Scraper fails at login:
- Verify credentials in GitHub Secrets
- Check if Virgin Active website requires 2FA
- Website may have changed - update selectors

### No data in MongoDB:
- Check connection string format
- Verify IP whitelist (should include 0.0.0.0/0)
- Check database user permissions

### GitHub Actions quota exceeded:
- Free tier: 2,000 minutes/month
- Each run takes ~2-3 minutes
- Running daily = 60-90 minutes/month (well within limits)

### Classes not being detected:
- Website structure may have changed
- Use browser dev tools to inspect new class selectors
- Update the `page.evaluate()` section in scraper.js

---

## 📈 Next Steps

1. Let it run for a week and collect data
2. Analyze patterns in class availability
3. Set up notifications for specific classes
4. Share insights with gym buddies!

---

**Need Help?** Check the GitHub Actions logs first - they contain detailed error messages that will point you in the right direction.