#!/bin/bash

# Virgin Active Class Scraper - Cron Job Runner
# This script runs the scraper and logs output

# Set the working directory
cd "/Users/smyth/Old apps/Virgin-classes"

# Set up logging
LOG_DIR="/Users/smyth/Old apps/Virgin-classes/logs"
mkdir -p "$LOG_DIR"

# Create log file with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$LOG_DIR/scraper_$TIMESTAMP.log"

# Run the scraper and log output
echo "====================================" >> "$LOG_FILE"
echo "Scraper started at: $(date)" >> "$LOG_FILE"
echo "====================================" >> "$LOG_FILE"

# Run debug-scraper (the working one)
/usr/local/bin/node debug-scraper.js >> "$LOG_FILE" 2>&1

# Log completion
echo "====================================" >> "$LOG_FILE"
echo "Scraper completed at: $(date)" >> "$LOG_FILE"
echo "====================================" >> "$LOG_FILE"

# Keep only last 14 days of logs (to save space)
find "$LOG_DIR" -name "scraper_*.log" -mtime +14 -delete

exit 0
