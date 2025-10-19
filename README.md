# Virgin Active Class Availability Tracker 🏋️‍♀️

Automated web scraper that monitors Virgin Active gym class availability and tracks which classes are filling up. Never miss your favorite class again!

## ✨ Features

- **Automated Daily Monitoring**: Runs once per day via GitHub Actions
- **Smart Status Detection**: Tracks if classes are AVAILABLE, LOW (<5 spots), or FULL
- **Free Cloud Storage**: Stores data in MongoDB Atlas (free tier)
- **Historical Analysis**: Build trends over time to predict class popularity
- **Easy Setup**: 10-minute configuration, then runs automatically

## 🎯 What It Tracks

For each class, the scraper captures:
- **Time**: When the class starts (e.g., "5:45am")
- **Class Name**: Type of class (e.g., "Boxing", "Grid Training")
- **Instructor**: Who's teaching
- **Status**: AVAILABLE, LOW (<5 spots), or FULL
- **Spaces Remaining**: Actual count when available
- **Date**: The class date
- **Timestamp**: When the data was scraped

## 📸 How It Works

1. Logs into your Virgin Active mylocker account
2. Navigates to the booking page
3. Selects the furthest bookable date (1 week ahead)
4. Scrapes all class information
5. Saves to MongoDB database
6. Repeats automatically every day

## 🚀 Quick Start

### Prerequisites
- Virgin Active gym membership
- GitHub account (free)
- MongoDB Atlas account (free)

### Setup (10 minutes)

1. **Clone this repository**
   ```bash
   git clone https://github.com/yourusername/virgin-classess.git
   cd virgin-classess
   ```

2. **Set up MongoDB Atlas**
   - Create account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas/register)
   - Create free cluster (M0)
   - Get connection string
   - See [Complete Setup Guide](SETUP_GUIDE.md) for detailed steps

3. **Configure GitHub Secrets**
   - Go to Settings → Secrets → Actions
   - Add three secrets:
     - `GYM_USERNAME`: Your Virgin Active email
     - `GYM_PASSWORD`: Your Virgin Active password
     - `MONGODB_URI`: Your MongoDB connection string

4. **Customize schedule** (optional)
   - Edit `.github/workflows/scraper.yml`
   - Modify the cron schedule to your preferred time

5. **Test it**
   - Go to Actions tab
   - Run workflow manually
   - Check MongoDB Atlas for data

## 📊 Analyzing Your Data

Query your data using the provided script:

```bash
npm install
node queries.js
```

This will show you:
- Latest class availability
- Most popular classes
- Instructor fill rates
- Best times for availability
- Historical trends

### Example Queries

Find all available Boxing classes:
```javascript
db.classes.find({ 
  className: "Boxing",
  status: { $ne: "FULL" }
})
```

Track how quickly a class fills:
```javascript
db.classes.find({ 
  className: "Grid Training",
  time: "5:45am"
}).sort({ scrapedAt: 1 })
```

## 📁 Project Structure

```
virgin-classess/
├── .github/
│   └── workflows/
│       └── scraper.yml        # GitHub Actions automation
├── scraper.js                 # Main scraping logic
├── queries.js                 # Data analysis examples
├── package.json               # Dependencies
├── .env.example               # Environment template
├── SETUP_GUIDE.md            # Detailed setup instructions
└── README.md                 # This file
```

## 🔒 Security

- Credentials stored as GitHub Secrets (encrypted)
- Repository should be **private**
- MongoDB uses secure connection string
- Never commit `.env` file

## 🛠️ Customization

### Change Schedule
Edit `.github/workflows/scraper.yml`:
```yaml
schedule:
  - cron: '0 6 * * *'  # Daily at 6 AM UTC
```

### Scrape Multiple Dates
Modify `scraper.js` to loop through additional date buttons.

### Add Notifications
Integrate with:
- Email (SendGrid, AWS SES)
- SMS (Twilio)
- Slack/Discord webhooks

### Create Dashboard
Build a web interface to visualize:
- Class popularity trends
- Best times to book
- Your booking success rate

## 📈 Use Cases

- **Never miss favorite classes**: Get notified when spots open
- **Find best times**: Analyze when classes have most availability  
- **Track instructor popularity**: See which instructors fill fastest
- **Plan your schedule**: Know which days/times are least crowded
- **Share with gym friends**: Help others find available classes

## 🐛 Troubleshooting

**Scraper fails at login?**
- Check credentials in GitHub Secrets
- Verify Virgin Active hasn't changed login page

**No data in MongoDB?**
- Verify connection string format
- Check IP whitelist includes `0.0.0.0/0`
- Confirm database user has read/write permissions

**Classes not detected?**
- Website HTML may have changed
- Update selectors in `scraper.js`
- Check browser DevTools for new class structure

See [Setup Guide](SETUP_GUIDE.md) for detailed troubleshooting.

## 📝 Development

### Local Testing
```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your credentials

# Run scraper
npm start
```

### View Logs
```bash
# GitHub Actions logs
Go to Actions tab → Select workflow run → View logs

# Local logs
Check console output during npm start
```

## 🤝 Contributing

Feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Share your analysis insights!

## ⚖️ Legal & Ethics

- This tool is for **personal use only**
- Respects Virgin Active's robots.txt and rate limits
- Only accesses your own account data
- Complies with website terms of service
- No commercial use or data redistribution

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Built with Puppeteer for browser automation
- MongoDB Atlas for free cloud database
- GitHub Actions for free scheduled execution

---

**Note**: This is an independent project and is not affiliated with or endorsed by Virgin Active.