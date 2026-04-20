# Personal Calendar Sync - Agent Notes

## Project Overview

This is a Google Apps Script that syncs busy time blocks from a personal Google Calendar to a work calendar. It's a one-way sync (Personal → Work) that creates "Busy Personal Time" blocks on the work calendar.

**Repository:** `/Users/jsherron/src/personal-calendar-sync`

## Architecture

### Main Files

- **Code.js** - Main Google Apps Script (495 lines)
  - Configuration object at the top (lines 21-51)
  - Core sync logic in `sync()` function (line 110)
  - Event filtering in `shouldSyncEvent()` (line 276)

- **README.md** - User-facing documentation
- **package.json** - Node.js dependencies (jest for testing)

### Key Functions

| Function | Purpose | Location |
|----------|---------|----------|
| `sync()` | Main entry point, handles locking and orchestration | Line 110 |
| `shouldSyncEvent()` | Filters events based on various criteria | Line 276 |
| `fetchEventMaps()` | Fetches events from both calendars | Line 178 |
| `synchronizeEvents()` | Main sync algorithm | Line 208 |
| `removeStaleBlockedTimeEvents()` | Deletes old blocked time events | Line 309 |
| `addNewBlockedTimeEvents()` | Creates new blocked time events | Line 363 |

### Event Filtering Logic (`shouldSyncEvent`)

The function filters out events based on:

1. **Transparency** - Events marked "Free" (TRANSPARENT) are skipped
2. **All-day events** - Skipped if `CONFIG.syncAllDayEvents` is false
3. **Day of week** - Only syncs days in `CONFIG.daysToSync`
4. **Guest status** - NEW: Skips declined (NO) and not-responded (INVITED) events

**Guest Status Values:**
- `CalendarApp.GuestStatus.OWNER` - Synced (user created the event)
- `CalendarApp.GuestStatus.YES` - Synced (user accepted)
- `CalendarApp.GuestStatus.MAYBE` - Synced (user tentatively accepted)
- `CalendarApp.GuestStatus.NO` - **Skipped** (user declined)
- `CalendarApp.GuestStatus.INVITED` - **Skipped** (user hasn't responded - mailing list events)

## Testing

### Running Tests

```bash
npm test              # Run all tests
npm run test:watch    # Run in watch mode
npm run test:coverage # Run with coverage report
```

### Test Files

- `__tests__/shouldSyncEvent.test.js` - Tests for event filtering logic
- `__tests__/sync.test.js` - Integration tests for sync flow
- `__tests__/mocks/gas-mocks.js` - Mock Google Apps Script APIs
- `__tests__/getDateRange.test.js` - Date range calculation tests
- `__tests__/getEventTimeKey.test.js` - Event key generation tests
- `__tests__/buildEventMap.test.js` - Event map building tests
- `__tests__/createSyncStats.test.js` - Stats object tests

### Mock Structure

The `MockCalendarEvent` class supports these options:
```javascript
new MockCalendarEvent(title, startTime, endTime, {
  color: '0',                    // Event color ID
  isAllDay: false,               // Whether it's an all-day event
  transparency: 'OPAQUE',        // 'TRANSPARENT' for Free, 'OPAQUE' for Busy
  originalCalendarId: null,      // Calendar that created the event
  myStatus: null,                // GuestStatus value (YES, NO, MAYBE, INVITED, OWNER)
})
```

## Configuration Options

All config is in the `CONFIG` object at the top of Code.js:

```javascript
{
  personalCalendarId: 'your.personal.email@gmail.com',
  daysInPast: 1,
  daysInFuture: 90,
  debugLogging: false,
  blockedTimeTitle: 'Busy Personal Time',
  eventColor: '2', // Sage/pale green
  syncAllDayEvents: true,
  daysToSync: [0, 1, 2, 3, 4, 5, 6], // All days
  rateLimitDelayMs: 1000,
  lockTimeoutMs: 1500,
}
```

## Common Issues & Solutions

### Mailing List Events Showing Up

**Problem:** Events from mailing list invitations appear on work calendar even though user hasn't accepted them.

**Solution:** The code now filters by `getMyStatus()`:
- Events with status `INVITED` (not responded) are skipped
- Events with status `NO` (declined) are skipped

See `shouldSyncEvent()` function around line 300 in Code.js.

### Phantom/Ghost Events from Shared Calendars

**Problem:** Events from previously subscribed shared calendars still appear.

**Solution:** The code checks `getOriginalCalendarId()` to filter events that originated from other calendars. Users should also unsubscribe from unwanted shared calendars in Google Calendar settings.

## Development Notes

- Google Apps Script uses a specific runtime - code must be compatible
- Tests run in Node.js using mocks that simulate the GAS API
- The `sync()` function uses `LockService` to prevent concurrent executions
- Rate limiting is implemented via `Utilities.sleep()` between API calls

## Deployment

This is a Google Apps Script project. To deploy:

1. Copy `Code.js` contents to https://script.google.com/ (work account)
2. Update CONFIG section with personal calendar email
3. Run once to grant permissions
4. Set up triggers (calendar updates + daily backup)

See README.md for detailed setup instructions.
