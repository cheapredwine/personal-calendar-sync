/**
 * Debug Script - Dump event details for troubleshooting
 *
 * Paste this into a SEPARATE Google Apps Script project (or add to your
 * existing one). Run dumpEvent() or dumpAllEvents() from the script editor.
 *
 * Update the CONFIG below to match your personal calendar ID.
 */

const DEBUG_CONFIG = {
  personalCalendarId: 'your.personal.email@gmail.com',
};

function dumpEvent() {
  const cal = CalendarApp.getCalendarById(DEBUG_CONFIG.personalCalendarId);
  if (!cal) {
    Logger.log('ERROR: Could not access calendar: ' + DEBUG_CONFIG.personalCalendarId);
    return;
  }

  const start = new Date('2026-04-18T00:00:00');
  const end = new Date('2026-04-18T23:59:59');
  const events = cal.getEvents(start, end);

  Logger.log(`Found ${events.length} events on April 18, 2026\n`);

  for (let i = 0; i < events.length; i++) {
    Logger.log(`--- Event ${i + 1} ---`);
    logEventDetails(events[i]);
    Logger.log('');
  }
}

function dumpAllEvents() {
  const cal = CalendarApp.getCalendarById(DEBUG_CONFIG.personalCalendarId);
  if (!cal) {
    Logger.log('ERROR: Could not access calendar: ' + DEBUG_CONFIG.personalCalendarId);
    return;
  }

  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setDate(end.getDate() + 90);
  end.setHours(23, 59, 59, 999);

  const events = cal.getEvents(start, end);

  Logger.log(`Found ${events.length} events from ${start.toDateString()} to ${end.toDateString()}\n`);

  for (let i = 0; i < events.length; i++) {
    Logger.log(`--- Event ${i + 1}/${events.length} ---`);
    logEventDetails(events[i]);
    Logger.log('');
  }
}

function dumpCalendars() {
  Logger.log('=== All accessible calendars ===\n');
  const calendars = CalendarApp.getAllCalendars();
  for (const cal of calendars) {
    Logger.log(`ID: ${cal.getId()}`);
    Logger.log(`Name: ${cal.getName()}`);
    Logger.log(`Description: ${cal.getDescription() || '(none)'}`);
    Logger.log(`Color: ${cal.getColor()}`);
    Logger.log(`TimeZone: ${cal.getTimeZone()}`);
    Logger.log(`IsOwnedByMe: ${cal.isOwnedByMe()}`);
    Logger.log(`IsHidden: ${cal.isHidden()}`);
    Logger.log('---');
  }
}

function logEventDetails(event) {
  Logger.log(`Title: ${event.getTitle()}`);
  Logger.log(`Start: ${event.getStartTime().toISOString()}`);
  Logger.log(`End: ${event.getEndTime().toISOString()}`);
  Logger.log(`All Day: ${event.isAllDayEvent()}`);
  Logger.log(`Location: ${event.getLocation() || '(none)'}`);
  Logger.log(`Description: ${event.getDescription() || '(none)'}`);
  Logger.log(`Color: ${event.getColor()}`);
  Logger.log(`Transparency: ${event.getTransparency ? event.getTransparency() : 'N/A'}`);
  Logger.log(`Original Calendar ID: ${event.getOriginalCalendarId()}`);
  Logger.log(`Is Owned By Me: ${event.isOwnedByMe()}`);
  Logger.log(`Creator: ${event.getCreators().join(', ')}`);
  Logger.log(`Visibility: ${event.getVisibility()}`);
  Logger.log(`Status: ${event.getStatus ? event.getStatus() : 'N/A'}`);

  const guests = event.getGuestList();
  if (guests.length > 0) {
    Logger.log(`Guests (${guests.length}):`);
    for (const guest of guests) {
      Logger.log(`  - ${guest.getEmail()} (status: ${guest.getGuestStatus()})`);
    }
  } else {
    Logger.log('Guests: (none)');
  }

  try {
    const eventType = event.getEventType ? event.getEventType() : 'N/A';
    Logger.log(`Event Type: ${eventType}`);
  } catch (e) {
    Logger.log(`Event Type: (not available - ${e.message})`);
  }

  try {
    const tagKeys = event.getAllTagKeys ? event.getAllTagKeys() : [];
    Logger.log(`Tag Keys: ${tagKeys.length > 0 ? tagKeys.join(', ') : '(none)'}`);
  } catch (e) {
    Logger.log(`Tag Keys: (not available - ${e.message})`);
  }
}
