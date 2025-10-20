#!/bin/bash

# Setup Cron Job for Virgin Active Scraper
# This script helps you set up a cron job to run every 2 hours starting at 6am AEST

echo "╔════════════════════════════════════════╗"
echo "║  Virgin Active Scraper - Cron Setup    ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "This will set up a cron job to run the scraper:"
echo "  • Every 2 hours"
echo "  • Starting at 6:00 AM AEST"
echo "  • Times: 6am, 8am, 10am, 12pm, 2pm, 4pm, 6pm, 8pm, 10pm"
echo ""

# Check if node is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: node is not found in PATH"
    echo "Please make sure Node.js is installed"
    exit 1
fi

NODE_PATH=$(which node)
echo "✓ Node.js found at: $NODE_PATH"
echo ""

# The cron expression for every 2 hours starting at 6am
# 0 6,8,10,12,14,16,18,20,22 * * *
# Explanation:
# - 0: At minute 0 (on the hour)
# - 6,8,10,12,14,16,18,20,22: At these hours (6am, 8am, etc.)
# - * * *: Every day, every month, every day of week

CRON_SCHEDULE="0 6,8,10,12,14,16,18,20,22 * * *"
SCRIPT_PATH="/Users/smyth/Old apps/Virgin-classes/run-scraper.sh"
CRON_JOB="$CRON_SCHEDULE $SCRIPT_PATH"

echo "Cron job to be added:"
echo "  $CRON_JOB"
echo ""
echo "⚠️  Note: This cron job uses your system time, which should be set to AEST"
echo ""

# Check current crontab
echo "Checking existing crontab..."
EXISTING_CRON=$(crontab -l 2>/dev/null | grep "run-scraper.sh" || true)

if [ ! -z "$EXISTING_CRON" ]; then
    echo "⚠️  Found existing scraper cron job:"
    echo "  $EXISTING_CRON"
    echo ""
    read -p "Do you want to replace it? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
    # Remove old cron job
    crontab -l 2>/dev/null | grep -v "run-scraper.sh" | crontab -
    echo "✓ Removed old cron job"
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo ""
echo "✅ Cron job added successfully!"
echo ""
echo "To verify, run: crontab -l"
echo ""
echo "📋 Next scheduled runs (approximate):"
echo "  Today:    6:00 PM (18:00)"
echo "  Today:    8:00 PM (20:00)"
echo "  Today:   10:00 PM (22:00)"
echo "  Tomorrow: 6:00 AM (06:00) ⭐ First morning run"
echo "  Tomorrow: 8:00 AM (08:00)"
echo "  And every 2 hours after..."
echo ""
echo "📁 Logs will be saved to: /Users/smyth/Old apps/Virgin-classes/logs/"
echo ""
echo "To remove the cron job later, run:"
echo "  crontab -e"
echo "  Then delete the line containing 'run-scraper.sh'"
echo ""
