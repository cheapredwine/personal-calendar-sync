# Personal Calendar Sync

A Google Apps Script that automatically syncs busy time from your personal Google Calendar to your work calendar.

## Features

- ✅ **One-way sync**: Personal calendar → Work calendar
- ✅ **Duplicate prevention**: Won't create blocked time if you already have a work event at that time
- ✅ **All-day event support**: Vacation and holidays sync as full-day blocks
- ✅ **FREE event support**: Events marked "Free" on personal calendar are skipped
- ✅ **Invitation filtering**: Skips events you haven't accepted (mailing list invites, declined events)
- ✅ **Rate limiting & locking**: Prevents API quota issues and race conditions

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
4. Add your **work email** with permission: **"See only free/busy"**
5. Click **Send**

**What this does**: 
- Your work account sees when you're busy on your personal calendar (but not event titles/details)
- The script creates "Busy Personal Time" blocks on your work calendar for all busy times
- **FREE events are skipped**: Events you mark as "Free" availability on your personal calendar won't sync
- **All-day events sync**: Vacation, holidays, and other all-day events create full-day blocks
- **Duplicate prevention**: Won't create a block if you already have a work event at that time

**Verify access**: From your work account, go to Google Calendar → **+** next to "Other calendars" → **Subscribe to calendar** → enter your personal email. If it adds successfully, you're good to go.

### 5. Grant Permissions

1. In the Google Apps Script editor, select the `sync` function from the dropdown
2. Click the **Run** button (▶️)
3. Grant calendar permissions when prompted

### 6. Set Up Triggers

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
| `daysInFuture` | Days in the future to sync | 90 |
| `blockedTimeTitle` | Title shown on work calendar | 'Busy Personal Time' |
| `eventColor` | Color code (see below) | '2' (Sage/pale green) |
| `daysToSync` | Days of week to sync (0=Sun, 6=Sat) | `[0,1,2,3,4,5,6]` (all days) |
| `rateLimitDelayMs` | Delay between operations | 1000 |
| `lockTimeoutMs` | Lock timeout | 1500 |
| `debugLogging` | Enable debug logging | `false` |

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

## How Identity & Authorization Work

### The Script Runs As You

When you paste this code into [script.google.com](https://script.google.com) while logged into your **work account**, the script runs with **that account's identity and permissions**. There's no separate API key or service account—Google Apps Script executes as the authenticated user.

```javascript
// This gets the DEFAULT calendar - your work calendar
const workCalendar = CalendarApp.getDefaultCalendar();
```

### OAuth Authorization Flow

The first time you run `sync()` manually, Google handles authorization automatically:

1. **Script detects API usage** - Calling `CalendarApp` methods triggers the OAuth flow
2. **Consent screen appears** - Google asks: "This app wants to access your Google Calendar"
3. **You click "Allow"** - Google grants OAuth tokens to the script
4. **Google stores the tokens** - Tokens are securely stored and associated with your account + this script

After that first authorization, every execution uses those stored tokens automatically. You don't need to re-authorize unless:
- The script requests new scopes (e.g., adding Gmail access)
- You revoke access at [myaccount.google.com/permissions](https://myaccount.google.com/permissions)

### Requested OAuth Scopes

The script automatically requests these scopes based on the APIs used:

- `https://www.googleapis.com/auth/calendar` - Full calendar access (read/write)
- `https://www.googleapis.com/auth/calendar.events` - Event management
- `https://www.googleapis.com/auth/script.lockservice` - Execution locking

View the actual scopes in your project: **Apps Script Project → Project Settings → Scopes**

### Accessing Your Personal Calendar

The script accesses your personal Gmail calendar while running as your work account:

```javascript
const personalCalendar = CalendarApp.getCalendarById('your.personal.email@gmail.com');
```

This works because your personal calendar is **shared with your work account** (Step 4 in setup). The script uses your work account's sharing permissions to read the personal calendar.

### Triggers Use the Same Identity

When you set up time-driven or calendar triggers, they execute with **the same identity** as when you created them. The trigger stores the OAuth tokens and uses them for each execution. This means:

- **Calendar triggers** run as your work account
- **Time-driven triggers** run as your work account
- **Manual runs** run as your work account

### No API Keys or Secrets Needed

Unlike traditional API integrations that require:
- Google Cloud project setup
- OAuth client ID/secret
- Service account JSON keys
- Token refresh logic

Google Apps Script handles all of this for you:
- ✅ Google hosts the script
- ✅ Google manages OAuth tokens
- ✅ Google refreshes expired tokens automatically
- ✅ Google handles all OAuth flows

### Security Implications

- **Script editors**: Anyone with edit access to the script can modify it to run actions as you
- **Scope limits**: The script can only access what **you** can access
- **Account deactivation**: If your work account is deactivated, triggers stop working
- **Revoking access**: You can revoke permissions anytime at [myaccount.google.com/permissions](https://myaccount.google.com/permissions)

## Viewing Logs

To see what the script is doing:

1. In Google Apps Script editor, click **View** → **Logs** (or Ctrl+Enter)
2. Logs show:
   - Date range being synced
   - Number of events found
   - Actions taken (added, deleted, updated, skipped)
   - Execution time

## Troubleshooting

### Mailing list events showing up on work calendar

Events from mailing lists or calendar invitations you haven't accepted may appear on your personal calendar. The script now automatically filters these out:

- **Declined events** (`NO` response) - Skipped
- **Not responded** (`INVITED` status) - Skipped (common for mailing list events)
- **Accepted** (`YES`), **Maybe** (`MAYBE`), and **Owner** events - Synced normally

If you still see unwanted events, check that your personal calendar sharing settings are correct and that you haven't subscribed to any shared calendars you no longer want.

### "Could not access personal calendar"
- Verify `personalCalendarId` is correct (the email of your personal Google account)
- **Make sure you've shared your personal calendar with your work account** (see Step 4)
- Verify the work account can subscribe to the personal calendar in Google Calendar
- Try removing and re-adding the calendar share

### Events not syncing
- Check the logs to see if events are being skipped
- Verify `daysToSync` includes the day of week

### Phantom blocks appearing (no corresponding personal event)
Shared calendars you previously subscribed to can leave "ghost" events that still appear when querying your calendar. The script now uses `getOriginalCalendarId()` to filter out events that didn't originate from your primary personal calendar.

**If you still see unwanted events:**
1. Go to your personal Google Calendar
2. Find the shared calendar under "Other calendars"
3. Click ⋮ → "Settings and sharing" → "Unsubscribe"

Events from shared calendars will be automatically filtered out based on their original calendar ID.

### Which personal calendars are synced?
Only your **primary calendar** (the one matching your `personalCalendarId`) is synced. The script:
- Fetches events from the calendar specified by `personalCalendarId`
- Filters out events that originated from other calendars (shared calendars, delegated calendars, etc.) using `getOriginalCalendarId()`
- Only syncs events that were originally created in your primary calendar

Other calendars you own (like "car" or "vacation") are **not** synced unless explicitly configured as the `personalCalendarId`.

### "Script already running"
- This is normal - the lock prevents concurrent executions
- The next trigger will run successfully

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
