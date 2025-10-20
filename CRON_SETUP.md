# Cron Job Setup Guide

This guide explains how to set up automated scraping every 2 hours starting at 6am AEST.

## Quick Setup

Run the setup script:

```bash
cd "/Users/smyth/Old apps/Virgin-classes"
./setup-cron.sh
```

This will:
- Create a cron job to run every 2 hours
- Schedule runs at: 6am, 8am, 10am, 12pm, 2pm, 4pm, 6pm, 8pm, 10pm (AEST)
- Save logs to `logs/` directory
- Auto-clean logs older than 14 days

## Schedule

The scraper will run at these times daily:
- 06:00 (6:00 AM)
- 08:00 (8:00 AM)
- 10:00 (10:00 AM)
- 12:00 (12:00 PM)
- 14:00 (2:00 PM)
- 16:00 (4:00 PM)
- 18:00 (6:00 PM)
- 20:00 (8:00 PM)
- 22:00 (10:00 PM)

**First run tomorrow: 6:00 AM AEST**

## Manual Commands

### View your cron jobs
```bash
crontab -l
```

### Edit cron jobs manually
```bash
crontab -e
```

### Remove the cron job
```bash
crontab -l | grep -v "run-scraper.sh" | crontab -
```

### Test the scraper manually
```bash
cd "/Users/smyth/Old apps/Virgin-classes"
./run-scraper.sh
```

## Monitoring

### View latest log
```bash
cd "/Users/smyth/Old apps/Virgin-classes/logs"
tail -f scraper_*.log  # Follow the most recent log
```

### View all logs
```bash
ls -lh "/Users/smyth/Old apps/Virgin-classes/logs/"
```

### Check MongoDB data
```bash
cd "/Users/smyth/Old apps/Virgin-classes"
node view-optimized-data.js
```

## Troubleshooting

### Cron job not running?

1. **Check if cron is enabled on macOS:**
   - System Preferences → Security & Privacy → Privacy → Full Disk Access
   - Add Terminal (or your terminal app) to the list

2. **Check system time:**
   ```bash
   date
   ```
   Make sure it's in AEST timezone

3. **Verify the script is executable:**
   ```bash
   ls -la run-scraper.sh
   # Should show: -rwxr-xr-x (x means executable)
   ```

4. **Test the script manually:**
   ```bash
   ./run-scraper.sh
   # Check logs/ directory for output
   ```

5. **Check cron logs (macOS):**
   ```bash
   log show --predicate 'process == "cron"' --last 1h
   ```

### Browser issues when running in background?

If Puppeteer fails when running via cron, you may need to:
- Ensure your Mac doesn't sleep during scheduled runs
- Check that node has necessary permissions

## Storage Monitoring

Each scrape stores ~11 KB of data.

**Weekly storage:** ~0.91 MB
**Monthly storage:** ~3.64 MB
**Yearly storage:** ~43.68 MB

This is well within MongoDB's 500 MB free tier.

To check current storage:
```bash
node view-optimized-data.js
```

## Stopping the Scraper

To temporarily stop automated scraping:

```bash
crontab -l | grep -v "run-scraper.sh" | crontab -
```

To resume, run `./setup-cron.sh` again.

## Notes

- Logs are automatically cleaned after 14 days to save space
- The scraper uses `debug-scraper.js` which is the tested, working version
- Screenshots are saved to `screenshots/` during each run for debugging
- Make sure your computer is on and not sleeping during scheduled times
