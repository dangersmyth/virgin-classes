# Booking Speed Analysis

This analysis identifies which Virgin Active classes book up the fastest after they become available.

## How It Works

**Key Concept:** Classes become available to book exactly **7 days before** the class time.
- Example: A Monday 6:00 AM class on Oct 28 becomes available on Monday 6:00 AM on Oct 21

The analysis calculates:
- **Hours to Fill**: How many hours after becoming available until the class was FULL
- **Fill Rate**: What percentage of classes of each type fill up
- **Ranking**: Which specific classes fill up fastest

## Running the Analysis

### Step 1: Wait for Data Collection

You need at least **1 week of data** (collected every 2 hours).

Check your data:
```bash
node view-optimized-data.js
```

You should have:
- Multiple scrapes (ideally 7 days × 12 scrapes/day = ~84 scrapes)
- Status changes showing classes going from AVAILABLE → LOW → FULL

### Step 2: Run the Analysis

```bash
node analyze-booking-speed.js
```

This will:
- ✅ Analyze all classes to find when they became FULL
- ✅ Calculate hours from "available to book" to "fully booked"
- ✅ Rank all classes by booking speed
- ✅ Generate statistics by class type and time of day
- ✅ Export data to:
  - `booking-speed-analysis.json` (detailed data)
  - `fastest-filling-classes.csv` (importable to Excel)

### Step 3: Visualize the Results

```bash
node visualize-booking-speed.js
```

This creates `booking-speed-report.html` with:
- 🏆 Top 20 fastest filling classes
- 📊 Fill rate by class type
- ⏰ Fill rate by time of day
- 📋 Complete sortable table of all classes

**Open the HTML file in your browser:**
```bash
open booking-speed-report.html
```

## What You'll Learn

### 1. **Fastest Filling Classes**
Find which specific classes (instructor + time + day) book up within hours of becoming available.

Example output:
```
1. Reformer Pilates - Align - 6:00am
   Instructor: Clare S
   Filled in: 2.5 hours ⚡
```

### 2. **Popular Class Types**
See which class types consistently fill up vs. which never do.

Example:
- Reformer Pilates: 85% fill rate
- Body Pump: 40% fill rate
- Aqua: 10% fill rate

### 3. **Best Times to Book**
Identify peak demand times (e.g., 6am classes fill up fastest).

### 4. **Never Fill**
Most classes (~70-80%) never reach capacity - these are easy to book anytime.

## Sample Insights

After 1 week of data, you might find:

**Ultra-Hot Classes** (fill within 24 hours):
- Reformer Pilates with popular instructors
- Early morning sessions (6-7am)
- Specific instructors that are in high demand

**Medium Demand** (fill within 3-5 days):
- Body Pump at peak times
- Popular evening classes

**Always Available** (never fill):
- Most classes! (60-80% of all classes)
- Off-peak times
- Less popular class types

## Use Cases

### For You:
- **Book smarter**: Know which classes need immediate booking
- **Find alternatives**: Identify similar classes that don't fill up
- **Plan ahead**: Know exactly when to set reminders to book

### Understanding Patterns:
- Which instructors are most popular?
- What times have highest demand?
- Which class types are worth booking vs. walk-in?

## Data Requirements

**Minimum:**
- 3-4 days of data (to see some classes fill)
- Every 2-hour scraping (to catch the moment classes become FULL)

**Optimal:**
- Full 7 days of data
- Includes at least one Monday (when weekly booking window opens)

## Files Generated

| File | Description | Use |
|------|-------------|-----|
| `booking-speed-analysis.json` | Raw analysis data | Import to other tools, further analysis |
| `fastest-filling-classes.csv` | Top classes ranked | Excel, Google Sheets |
| `booking-speed-report.html` | Visual report | Share, present findings |

## Troubleshooting

**"No classes filled up":**
- Need more data (run for full 7 days)
- Check that scraper is running every 2 hours
- Verify data has status changes (AVAILABLE → FULL)

**"All classes show same fill time":**
- Not enough granularity (scraping too infrequently)
- Need 2-hour intervals to catch fill times

**"Results seem wrong":**
- Check that timezone is AEST (affects "available from" calculation)
- Verify date parsing is correct in analyze-booking-speed.js

## Advanced Analysis

The JSON export allows you to:
- Import to Excel/Google Sheets for pivot tables
- Create custom charts
- Correlate with other factors (weather, holidays, etc.)
- Track trends over multiple weeks

## Next Steps

After first week:
1. Identify your target classes (fastest filling ones you want)
2. Set booking reminders for exactly when they become available
3. Continue collecting data to track trends over time
4. Re-run analysis monthly to see if patterns change
