# Personal Calendar Sync

A Google Apps Script that automatically syncs busy time from your personal Google Calendar to your work calendar.

## Features

- ✅ **One-way sync**: Personal calendar → Work calendar
- ✅ **All 7 days of the week**: Configurable day filtering
- ✅ **Smart filtering**: Exclude specific events, all-day events, or certain days
- ✅ **Efficient**: O(n) algorithm with rate limiting and lock management
- ✅ **Maintainable**: Clean code with comprehensive configuration section
- ✅ **Detailed logging**: Track what's added, deleted, updated, or skipped

## Setup Instructions

### 1. Create Google Apps Script Project

1. Go to https://script.google.com/ (from your **Work** Google account)
2. Click **"New Project"**
3. Rename the project to "Personal Calendar Sync"
4. Delete the default code

### 2. Add the Script

1. Copy the contents of `Code.js` from this repository
2. Paste into the Google Apps Script editor
3. Save the project (Ctrl+S or Cmd+S)

### 3. Configure

Update the `CONFIG` object at the top of the script:

```javascript
const CONFIG = {
  personalCalendarId: 'your.personal.email@gmail.com', // ← CHANGE THIS
  blockedTimeTitle: 'Busy Personal Time',
  eventColor: '2', // Sage/pale green
  daysToSync: [0, 1, 2, 3, 4, 5, 6], // All days
  // ... see Code.js for all options
};
```

### 4. Share Personal Calendar with Work Account

Your work Google account needs access to your personal calendar:

1. In Google Calendar (from your **personal** account), find your calendar in the left sidebar
2. Click **⋮** → **Settings and sharing**
3. Scroll to **"Share with specific people"**
4. Add your **work email** with one of these permissions:
   - **"See only free/busy"** - Faster setup, syncs all busy times
   - **"See all event details"** - Required if you want to filter by event title or skip all-day events
5. Click **Send**

**Verify access**: From your work account, go to Google Calendar → **+** next to "Other calendars" → **Subscribe to calendar** → enter your personal email. If it adds successfully, you're good to go.

> **Note**: If you use "See only free/busy", the `ignoredPersonalEventTitles` and `syncAllDayEvents` filters won't work (event titles are hidden). All busy times will be synced.

### 6. Grant Permissions

1. In the Google Apps Script editor, select the `sync` function from the dropdown
2. Click the **Run** button (▶️)
3. Grant calendar permissions when prompted

### 7. Set Up Triggers

Click the clock icon (⏰ Triggers) → **Add Trigger**

#### Trigger 1: Calendar Updates (Real-time)
- **Function**: `sync`
- **Deployment**: Head
- **Event source**: From calendar
- **Calendar details**: Calendar updated
- **Calendar owner email**: your.personal.email@gmail.com
- **Failure notification**: Daily

#### Trigger 2: Daily Backup
- **Function**: `sync`
- **Deployment**: Head
- **Event source**: Time-driven
- **Type**: Day timer
- **Time of day**: Midnight to 1am
- **Failure notification**: Daily

#### Optional Trigger 3: Hourly Sync
- **Function**: `sync`
- **Deployment**: Head
- **Event source**: Time-driven
- **Type**: Hour timer
- **Every**: 1 hour
- **Failure notification**: Daily

## Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `personalCalendarId` | Email of your personal calendar | (required) |
| `daysInPast` | Days in the past to sync | 1 |
| `daysInFuture` | Days in the future to sync | 30 |
| `blockedTimeTitle` | Title shown on work calendar | 'Busy Personal Time' |
| `eventColor` | Color code (see below) | '2' (Sage/pale green) |
| `ignoredPersonalEventTitles` | Event titles to skip | `['Busy w/ Work']` |
| `syncAllDayEvents` | Whether to sync all-day events (vacation, holidays) | `true` |
| `daysToSync` | Days of week (0=Sun, 6=Sat) | `[0,1,2,3,4,5,6]` |
| `rateLimitDelayMs` | Delay between operations | 1000 |
| `lockTimeoutMs` | Lock timeout | 1500 |

### Event Colors

```
ID   | Name      | Visual Color
'0'  | Default   | No color (pale blue)
'1'  | Lavender  | Pale purple/blue
'2'  | Sage      | Pale green
'3'  | Grape     | Purple
'4'  | Flamingo  | Pink
'5'  | Banana    | Yellow
'6'  | Tangerine | Orange
'7'  | Peacock   | Light blue/teal
'8'  | Graphite  | Gray
'9'  | Blueberry | Blue
'10' | Basil     | Green
'11' | Tomato    | Red
```

Set in `CONFIG.eventColor` using the ID string, e.g., `eventColor: '3'` for Grape (purple).

## How It Works

1. **Fetches events** from both calendars within the configured date range
2. **Removes stale blocks**: Deletes work calendar events that no longer exist in personal calendar
3. **Updates existing**: Ensures color is correct on existing blocked time events
4. **Adds new blocks**: Creates new blocked time events for personal calendar events that don't exist on work calendar
5. **Filters intelligently**: Skips events based on title, day of week, and all-day status

## Viewing Logs

To see what the script is doing:

1. In Google Apps Script editor, click **View** → **Logs** (or Ctrl+Enter)
2. Logs show:
   - Date range being synced
   - Number of events found
   - Actions taken (added, deleted, updated, skipped)
   - Execution time

## Troubleshooting

### "Could not access personal calendar"
- Verify `personalCalendarId` is correct (the email of your personal Google account)
- **Make sure you've shared your personal calendar with your work account** (see Step 4)
- Verify the work account can subscribe to the personal calendar in Google Calendar
- Try removing and re-adding the calendar share

### Events not syncing
- Check the logs to see if events are being skipped
- Verify `daysToSync` includes the day of week
- Check if event title is in `ignoredPersonalEventTitles`

### "Script already running"
- This is normal - the lock prevents concurrent executions
- The next trigger will run successfully

## Comparison to Existing Solutions

This script improves upon existing calendar sync solutions:

- **Better code quality**: Clear variable names, modern JavaScript idioms
- **More efficient**: O(n) algorithm vs O(n²) nested loops
- **More configurable**: All parameters in one CONFIG object
- **Better logging**: Detailed stats on what changed
- **Safer**: Lock mechanism and rate limiting

## Development

### Running Tests

This project includes a Jest test suite for validating the sync logic:

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Project Structure

```
.
├── Code.js                 # Main Google Apps Script
├── README.md              # This file
├── CHANGELOG.md           # Version history
├── CONTRIBUTING.md        # Contribution guidelines
├── package.json           # Node.js dependencies
├── jest.config.js         # Jest configuration
└── __tests__/
    ├── mocks/
    │   └── gas-mocks.js   # GAS API mocks for testing
    ├── getDateRange.test.js
    ├── getEventTimeKey.test.js
    ├── shouldSyncEvent.test.js
    ├── buildEventMap.test.js
    ├── createSyncStats.test.js
    └── sync.test.js
```

MIT License - feel free to modify and use as needed.

## Credits

Inspired by:
- [Vitali Lovich's original script](https://wiki.cfdata.org/spaces/~vlovich/pages/441910222/Share+busy+time+from+personal+calendar)
- [Jaryl Chng's v2 improvements](https://wiki.cfdata.org/spaces/~jaryl/pages/571525056/Share+and+sync+busy+time+from+personal+calendar+v2)
