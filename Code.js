/**
 * Personal to Work Calendar Sync
 *
 * Syncs busy time blocks from your personal Google Calendar to your work calendar.
 * One-way sync: Personal → Work
 *
 * Setup Instructions:
 * 1. Go to https://script.google.com/ (from your Work account)
 * 2. Create new project: "Personal Calendar Sync"
 * 3. Paste this code
 * 4. Update CONFIGURATION section below
 * 5. Run sync() once to grant permissions
 * 6. Set up triggers (see bottom of file)
 */

// ============================================================================
// CONFIGURATION - Modify these values for your setup
// ============================================================================

/** @type {Readonly<CalendarSyncConfig>} */
const CONFIG = Object.freeze({
  // Source calendar (your personal calendar email)
  personalCalendarId: 'your.personal.email@gmail.com',

  // How many days ahead to sync (past 1 day, future N days)
  daysInPast: 1,
  daysInFuture: 90,

  // Enable debug logging (set to true for troubleshooting)
  debugLogging: false,

  // The title shown on work calendar for blocked time
  blockedTimeTitle: 'Busy Personal Time',

  // Event color on work calendar (see color reference at end of file)
  // Use '2' for Sage/pale green, or see CalendarApp.EventColor constants
  eventColor: '2', // Sage/pale green

  // Events with these titles in personal calendar will be ignored (not synced)
  ignoredPersonalEventTitles: Object.freeze([
    'Busy w/ Work',
    'Work Meeting',
    // Add more titles to ignore here
  ]),

  // Whether to sync all-day events (vacation, holidays, etc.)
  syncAllDayEvents: true,

  // Days of week to sync (0=Sunday, 6=Saturday)
  // Set to [0,1,2,3,4,5,6] for all days, or [1,2,3,4,5] for weekdays only
  daysToSync: Object.freeze([0, 1, 2, 3, 4, 5, 6]), // All 7 days

  // Rate limiting: milliseconds to wait between calendar operations
  rateLimitDelayMs: 1000,

  // Lock timeout: max milliseconds to wait for script lock
  lockTimeoutMs: 1500,
});

// ============================================================================
// TYPES (for JSDoc/documentation purposes)
// ============================================================================

/**
 * @typedef {Object} CalendarSyncConfig
 * @property {string} personalCalendarId
 * @property {number} daysInPast
 * @property {number} daysInFuture
 * @property {string} blockedTimeTitle
 * @property {string} eventColor
 * @property {ReadonlyArray<string>} ignoredPersonalEventTitles
 * @property {boolean} syncAllDayEvents
 * @property {ReadonlyArray<number>} daysToSync
 * @property {number} rateLimitDelayMs
 * @property {number} lockTimeoutMs
 * @property {boolean} debugLogging
 */

/**
 * Log debug message if debug logging is enabled
 * @param {string} message
 * @returns {void}
 */
const debugLog = (message) => {
  if (CONFIG.debugLogging) {
    Logger.log(message);
  }
};

/**
 * @typedef {Object} DateRange
 * @property {Date} startDate
 * @property {Date} endDate
 */

/**
 * @typedef {Object} SyncStats
 * @property {number} deleted
 * @property {number} updated
 * @property {number} added
 * @property {number} skipped
 */

/**
 * @typedef {Object} CalendarEventMaps
 * @property {Map<string, GoogleAppsScript.Calendar.CalendarEvent[]>} workEvents
 * @property {Map<string, GoogleAppsScript.Calendar.CalendarEvent[]>} personalEvents
 */

// ============================================================================
// MAIN SYNC FUNCTION
// ============================================================================

/**
 * Main sync function - syncs personal calendar events to work calendar
 * @returns {void}
 */
function sync() {
  const lock = LockService.getScriptLock();
  const lockAcquired = lock.tryLock(CONFIG.lockTimeoutMs);

  if (!lockAcquired) {
    Logger.log('Script already running. Skipping this execution.');
    return;
  }

  try {
    Logger.log('=== Starting calendar sync ===');
    const startTime = Date.now();

    const { workCalendar, personalCalendar } = getCalendars();

    if (!personalCalendar) {
      Logger.log(`ERROR: Could not access personal calendar: ${CONFIG.personalCalendarId}`);
      Logger.log('Make sure your personal calendar is shared with your work account');
      return;
    }
    const { startDate, endDate } = getDateRange();

    Logger.log(`Syncing events from ${startDate.toDateString()} to ${endDate.toDateString()}`);

    const eventMaps = fetchEventMaps(workCalendar, personalCalendar, startDate, endDate);
    Logger.log(`Found ${eventMaps.workEvents.size} work events, ${eventMaps.personalEvents.size} personal events`);

    const stats = createSyncStats();
    synchronizeEvents(workCalendar, eventMaps, stats);

    logCompletionStats(stats, startTime);

  } catch (error) {
    Logger.log(`ERROR: ${error?.message ?? 'Unknown error'}`);
    throw error;
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// CORE SYNC OPERATIONS
// ============================================================================

/**
 * Get calendar instances
 * Note: This will trigger OAuth authorization if the personal calendar hasn't been accessed before
 * @returns {{workCalendar: GoogleAppsScript.Calendar.Calendar, personalCalendar: GoogleAppsScript.Calendar.Calendar}}
 */
const getCalendars = () => {
  const workCalendar = CalendarApp.getDefaultCalendar();
  const personalCalendar = CalendarApp.getCalendarById(CONFIG.personalCalendarId);

  // Note: personalCalendar may be null here if not shared, but calling getEvents()
  // on it will trigger the authorization dialog. We check for null in fetchEventMaps
  // after the auth flow has a chance to complete.

  return { workCalendar, personalCalendar };
};

/**
 * Fetch events from both calendars and build lookup maps
 * @param {GoogleAppsScript.Calendar.Calendar} workCalendar
 * @param {GoogleAppsScript.Calendar.Calendar} personalCalendar
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {CalendarEventMaps}
 */
const fetchEventMaps = (workCalendar, personalCalendar, startDate, endDate) => ({
  workEvents: buildEventMap(workCalendar.getEvents(startDate, endDate)),
  personalEvents: buildEventMap(personalCalendar.getEvents(startDate, endDate)),
});

/**
 * Build a Map of events keyed by their time range
 * @param {GoogleAppsScript.Calendar.CalendarEvent[]} events
 * @returns {Map<string, GoogleAppsScript.Calendar.CalendarEvent>}
 */
const buildEventMap = (events) => {
  const map = new Map();
  for (const event of events) {
    const key = getEventTimeKey(event);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(event);
  }
  return map;
};

/**
 * Execute the sync algorithm
 * @param {GoogleAppsScript.Calendar.Calendar} workCalendar
 * @param {{workEvents: Map<string, GoogleAppsScript.Calendar.CalendarEvent[]>, personalEvents: Map<string, GoogleAppsScript.Calendar.CalendarEvent[]>}} eventMaps
 * @param {SyncStats} stats
 * @returns {void}
 */
const synchronizeEvents = (workCalendar, { workEvents, personalEvents }, stats) => {
  removeStaleBlockedTimeEvents(workEvents, personalEvents, stats);
  addNewBlockedTimeEvents(workCalendar, workEvents, personalEvents, stats);
};

/**
 * Create initial sync statistics object
 * @returns {SyncStats}
 */
const createSyncStats = () => ({
  deleted: 0,
  updated: 0,
  added: 0,
  skipped: 0,
});

/**
 * Log completion statistics
 * @param {SyncStats} stats
 * @param {number} startTimeMs
 * @returns {void}
 */
const logCompletionStats = (stats, startTimeMs) => {
  const elapsed = ((Date.now() - startTimeMs) / 1000).toFixed(1);
  Logger.log('=== Sync complete ===');
  Logger.log(`Added: ${stats.added}, Deleted: ${stats.deleted}, Updated: ${stats.updated}, Skipped: ${stats.skipped}`);
  Logger.log(`Elapsed time: ${elapsed}s`);
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate the date range for syncing based on configuration
 * @returns {DateRange}
 */
const getDateRange = () => {
  const now = new Date();

  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - CONFIG.daysInPast);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + CONFIG.daysInFuture);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
};

/**
 * Generate a unique key for an event based on its time range
 * @param {GoogleAppsScript.Calendar.CalendarEvent} event
 * @returns {string}
 */
const getEventTimeKey = (event) => {
  const startMs = event.getStartTime().getTime();
  const endMs = event.getEndTime().getTime();
  return `${startMs}-${endMs}`;
};

/**
 * Check if a personal event should be synced based on configuration
 * @param {GoogleAppsScript.Calendar.CalendarEvent} event
 * @returns {boolean}
 */
const shouldSyncEvent = (event) => {
  const title = event.getTitle();
  const isAllDay = event.isAllDayEvent();
  const dayOfWeek = event.getStartTime().getDay();

  // getTransparency returns an enum, not a string - compare using CalendarApp.Transparency
  const transparency = event.getTransparency ? event.getTransparency() : null;
  const isTransparent = transparency === CalendarApp.Transparency.TRANSPARENT;

  // Check if event title is in ignore list
  if (CONFIG.ignoredPersonalEventTitles.includes(title)) {
    return false;
  }

  // Skip events marked as "Free" (transparent) - they don't block time
  if (isTransparent) {
    return false;
  }

  // Check if all-day events should be synced
  if (isAllDay && !CONFIG.syncAllDayEvents) {
    return false;
  }

  // Check day of week
  if (!CONFIG.daysToSync.includes(dayOfWeek)) {
    return false;
  }
  return true;
};

/**
 * Remove blocked time events from work calendar that no longer exist in personal calendar
 * @param {Map<string, GoogleAppsScript.Calendar.CalendarEvent[]>} workEvents
 * @param {Map<string, GoogleAppsScript.Calendar.CalendarEvent[]>} personalEvents
 * @param {SyncStats} stats
 * @returns {void}
 */
const removeStaleBlockedTimeEvents = (workEvents, personalEvents, stats) => {
  for (const [timeKey, workEventList] of workEvents) {
    // Find all blocked time events at this timeKey (there could be multiple if we created duplicates)
    const blockedTimeEvents = workEventList.filter(e => e.getTitle() === CONFIG.blockedTimeTitle);

    if (blockedTimeEvents.length === 0) {
      continue;
    }

    const personalEventList = personalEvents.get(timeKey);
    // Check if ANY personal event at this time should be synced
    const hasValidPersonalEvent = personalEventList?.some(e => shouldSyncEvent(e));

    if (!hasValidPersonalEvent) {
      // Personal event was deleted, marked FREE, or filtered out - delete ALL blocked times at this slot
      for (const workEvent of blockedTimeEvents) {
        const startTime = workEvent.getStartTime();
        const endTime = workEvent.getEndTime();
        const timeStr = `${startTime.toLocaleString()} - ${endTime.toLocaleString()}`;
        Logger.log(`Deleting stale blocked time: ${timeStr}`);
        workEvent.deleteEvent();
        stats.deleted++;
        Utilities.sleep(CONFIG.rateLimitDelayMs);
      }
    } else {
      // Event still exists, ensure color is correct on all blocked times
      for (const workEvent of blockedTimeEvents) {
        if (workEvent.getColor() !== CONFIG.eventColor) {
          const startTime = workEvent.getStartTime();
          const endTime = workEvent.getEndTime();
          const timeStr = `${startTime.toLocaleString()} - ${endTime.toLocaleString()}`;
          Logger.log(`Updating color for blocked time: ${timeStr}`);
          workEvent.setColor(CONFIG.eventColor);
          stats.updated++;
          Utilities.sleep(CONFIG.rateLimitDelayMs);
        }
      }
    }
  }
};

/**
 * Add new blocked time events to work calendar for personal events
 * @param {GoogleAppsScript.Calendar.Calendar} workCalendar
 * @param {Map<string, GoogleAppsScript.Calendar.CalendarEvent[]>} workEvents
 * @param {Map<string, GoogleAppsScript.Calendar.CalendarEvent[]>} personalEvents
 * @param {SyncStats} stats
 * @returns {void}
 */
const addNewBlockedTimeEvents = (workCalendar, workEvents, personalEvents, stats) => {
  for (const [timeKey, personalEventList] of personalEvents) {
    // Filter events that should be synced
    const syncableEvents = personalEventList.filter(e => shouldSyncEvent(e));

    if (syncableEvents.length === 0) {
      stats.skipped += personalEventList.length;
      continue;
    }

    // Skip if there's already ANY work event at this time
    // (includes our blocked time events OR manually copied events)
    const workEventList = workEvents.get(timeKey) || [];
    if (workEventList.length > 0) {
      // Check if it's our blocked time or a manually copied event with same title
      const hasBlockedTime = workEventList.some(e => e.getTitle() === CONFIG.blockedTimeTitle);
      const hasMatchingEvent = workEventList.some(e => 
        syncableEvents.some(pe => pe.getTitle() === e.getTitle())
      );
      if (hasBlockedTime || hasMatchingEvent) {
        stats.skipped += syncableEvents.length;
        continue;
      }
    }

    // Create one blocked time for all events at this time slot
    // Use the first event's time for the blocked event
    const representativeEvent = syncableEvents[0];
    const title = representativeEvent.getTitle() || '(private or no title)';
    const startTime = representativeEvent.getStartTime();
    const endTime = representativeEvent.getEndTime();
    const timeStr = `${startTime.toLocaleString()} - ${endTime.toLocaleString()}`;
    Logger.log(`Creating new blocked time: "${title}" at ${timeStr}`);

    const newEvent = workCalendar.createEvent(
      CONFIG.blockedTimeTitle,
      startTime,
      endTime
    );

    newEvent.setColor(CONFIG.eventColor);
    newEvent.removeAllReminders();
    stats.added++;

    Utilities.sleep(CONFIG.rateLimitDelayMs);
  }
};

// ============================================================================
// TRIGGER SETUP INSTRUCTIONS
// ============================================================================

/*
After pasting this code and updating the CONFIGURATION section:

1. Run the sync() function once manually to grant calendar permissions

2. Set up automatic triggers:
   Click the clock icon (Triggers) → Add Trigger

   TRIGGER 1 (Calendar Updates):
   - Function: sync
   - Deployment: Head
   - Event source: From calendar
   - Calendar details: Calendar updated
   - Calendar owner email: your.personal.email@gmail.com
   - Failure notification: Daily

   TRIGGER 2 (Daily Backup):
   - Function: sync
   - Deployment: Head
   - Event source: Time-driven
   - Type: Day timer
   - Time of day: Midnight to 1am
   - Failure notification: Daily

3. Optional: Add an hourly trigger for more frequent syncing
   - Function: sync
   - Deployment: Head
   - Event source: Time-driven
   - Type: Hour timer
   - Every: 1 hour
   - Failure notification: Daily
*/

// ============================================================================
// EVENT COLOR REFERENCE
// ============================================================================

/*
Google Calendar Event Colors Reference:

ID   | Name      | Visual Color
-----|-----------|------------------
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

To use in CONFIG.eventColor, simply use the ID as a string, e.g.:
  eventColor: '3', // Grape (purple)

Reference: https://developers.google.com/apps-script/reference/calendar/event-color
*/

// ============================================================================
// EXPORTS FOR TESTING (Node.js only - ignored by Google Apps Script)
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    sync,
    CONFIG,
    getDateRange,
    getEventTimeKey,
    shouldSyncEvent,
    buildEventMap,
    createSyncStats,
    getCalendars,
    fetchEventMaps,
    synchronizeEvents,
    removeStaleBlockedTimeEvents,
    addNewBlockedTimeEvents,
  };
}
