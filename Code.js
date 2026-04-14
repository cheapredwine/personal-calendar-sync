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

const CONFIG = {
  // Source calendar (your personal calendar email)
  personalCalendarId: 'your.personal.email@gmail.com',
  
  // How many days ahead to sync (past 1 day, future N days)
  daysInPast: 1,
  daysInFuture: 30,
  
  // The title shown on work calendar for blocked time
  blockedTimeTitle: 'Busy Personal Time',
  
  // Event color on work calendar (see color reference at end of file)
  eventColor: '3', // Grape/purple
  
  // Events with these titles in personal calendar will be ignored (not synced)
  ignoredPersonalEventTitles: [
    'Busy w/ Work',
    'Work Meeting',
    // Add more titles to ignore here
  ],
  
  // Whether to sync all-day events
  syncAllDayEvents: false,
  
  // Days of week to sync (0=Sunday, 6=Saturday)
  // Set to [0,1,2,3,4,5,6] for all days, or [1,2,3,4,5] for weekdays only
  daysToSync: [0, 1, 2, 3, 4, 5, 6], // All 7 days
  
  // Rate limiting: milliseconds to wait between calendar operations
  rateLimitDelayMs: 1000,
  
  // Lock timeout: max milliseconds to wait for script lock
  lockTimeoutMs: 1500,
};

// ============================================================================
// MAIN SYNC FUNCTION
// ============================================================================

/**
 * Main sync function - syncs personal calendar events to work calendar
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
    const startTime = new Date();
    
    // Get calendars
    const workCalendar = CalendarApp.getDefaultCalendar();
    const personalCalendar = CalendarApp.getCalendarById(CONFIG.personalCalendarId);
    
    if (!personalCalendar) {
      throw new Error(`Could not access personal calendar: ${CONFIG.personalCalendarId}`);
    }
    
    // Calculate date range
    const { startDate, endDate } = getDateRange();
    Logger.log(`Syncing events from ${startDate.toDateString()} to ${endDate.toDateString()}`);
    
    // Fetch events from both calendars
    const workEvents = getCalendarEventsMap(workCalendar, startDate, endDate);
    const personalEvents = getCalendarEventsMap(personalCalendar, startDate, endDate);
    
    Logger.log(`Found ${Object.keys(workEvents).length} work events, ${Object.keys(personalEvents).length} personal events`);
    
    // Sync: remove stale blocks, update existing, add new
    const stats = {
      deleted: 0,
      updated: 0,
      added: 0,
      skipped: 0,
    };
    
    removeStaleBlockedTimeEvents(workEvents, personalEvents, stats);
    addNewBlockedTimeEvents(workCalendar, workEvents, personalEvents, stats);
    
    const elapsed = ((new Date() - startTime) / 1000).toFixed(1);
    Logger.log('=== Sync complete ===');
    Logger.log(`Added: ${stats.added}, Deleted: ${stats.deleted}, Updated: ${stats.updated}, Skipped: ${stats.skipped}`);
    Logger.log(`Elapsed time: ${elapsed}s`);
    
  } catch (error) {
    Logger.log(`ERROR: ${error.message}`);
    throw error;
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate the date range for syncing based on configuration
 */
function getDateRange() {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - CONFIG.daysInPast);
  startDate.setHours(0, 0, 0, 0); // Start of day
  
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + CONFIG.daysInFuture);
  endDate.setHours(23, 59, 59, 999); // End of day
  
  return { startDate, endDate };
}

/**
 * Fetch events from a calendar and return as a map keyed by time range
 * Key format: "startTimeMs-endTimeMs"
 */
function getCalendarEventsMap(calendar, startDate, endDate) {
  const events = calendar.getEvents(startDate, endDate);
  const eventMap = {};
  
  for (const event of events) {
    const timeKey = getEventTimeKey(event);
    eventMap[timeKey] = event;
  }
  
  return eventMap;
}

/**
 * Generate a unique key for an event based on its time range
 */
function getEventTimeKey(event) {
  const startMs = event.getStartTime().getTime();
  const endMs = event.getEndTime().getTime();
  return `${startMs}-${endMs}`;
}

/**
 * Check if a personal event should be synced based on configuration
 */
function shouldSyncEvent(event) {
  // Check if event title is in ignore list
  if (CONFIG.ignoredPersonalEventTitles.includes(event.getTitle())) {
    return false;
  }
  
  // Check if all-day events should be synced
  if (event.isAllDayEvent() && !CONFIG.syncAllDayEvents) {
    return false;
  }
  
  // Check day of week
  const dayOfWeek = event.getStartTime().getDay();
  if (!CONFIG.daysToSync.includes(dayOfWeek)) {
    return false;
  }
  
  return true;
}

/**
 * Remove blocked time events from work calendar that no longer exist in personal calendar
 */
function removeStaleBlockedTimeEvents(workEvents, personalEvents, stats) {
  for (const [timeKey, workEvent] of Object.entries(workEvents)) {
    // Only process events that we created (have our blocked time title)
    if (workEvent.getTitle() !== CONFIG.blockedTimeTitle) {
      continue;
    }
    
    // If this time slot no longer exists in personal calendar, delete it
    if (!personalEvents[timeKey]) {
      Logger.log(`Deleting stale event: ${timeKey}`);
      workEvent.deleteEvent();
      stats.deleted++;
      Utilities.sleep(CONFIG.rateLimitDelayMs);
    } else {
      // Event still exists, ensure color is correct
      if (workEvent.getColor() !== CONFIG.eventColor) {
        Logger.log(`Updating color for event: ${timeKey}`);
        workEvent.setColor(CONFIG.eventColor);
        stats.updated++;
        Utilities.sleep(CONFIG.rateLimitDelayMs);
      }
    }
  }
}

/**
 * Add new blocked time events to work calendar for personal events
 */
function addNewBlockedTimeEvents(workCalendar, workEvents, personalEvents, stats) {
  for (const [timeKey, personalEvent] of Object.entries(personalEvents)) {
    // Skip if event shouldn't be synced based on filters
    if (!shouldSyncEvent(personalEvent)) {
      stats.skipped++;
      continue;
    }
    
    // Skip if already exists in work calendar (any event at this time)
    if (workEvents[timeKey]) {
      continue;
    }
    
    // Create new blocked time event
    Logger.log(`Creating new blocked time: ${personalEvent.getTitle()} (${timeKey})`);
    const newEvent = workCalendar.createEvent(
      CONFIG.blockedTimeTitle,
      personalEvent.getStartTime(),
      personalEvent.getEndTime()
    );
    newEvent.setColor(CONFIG.eventColor);
    newEvent.removeAllReminders();
    stats.added++;
    Utilities.sleep(CONFIG.rateLimitDelayMs);
  }
}

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
Available color codes (use in CONFIG.eventColor):
'0' - No color (default)
'1' - Lavender
'2' - Sage
'3' - Grape (purple)
'4' - Flamingo (pink)
'5' - Banana (yellow)
'6' - Tangerine (orange)
'7' - Peacock (light blue)
'8' - Graphite (gray)
'9' - Blueberry (blue)
'10' - Basil (green)
'11' - Tomato (red)

Reference: https://developers.google.com/apps-script/reference/calendar/event-color
*/
