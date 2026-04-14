/**
 * Integration tests for the sync function
 */

const {
  resetAllMocks,
  MockCalendar,
  MockCalendarEvent,
} = require('./mocks/gas-mocks');

describe('sync integration', () => {
  let Code;
  let Logger;

  beforeEach(() => {
    resetAllMocks();
    jest.resetModules();

    // Load mocks first
    const mocks = require('./mocks/gas-mocks');
    Logger = mocks.MockLogger;

    // Load code with fresh mocks
    Code = require('../Code.js');

    // Setup test calendars
    const workCalendar = global.CalendarApp.getDefaultCalendar();
    const personalCalendar = new MockCalendar('Personal');
    global.CalendarApp._addCalendar(Code.CONFIG.personalCalendarId, personalCalendar);
  });

  test('should create blocked time events for new personal events', () => {
    const workCalendar = global.CalendarApp.getDefaultCalendar();
    const personalCalendar = global.CalendarApp.getCalendarById(Code.CONFIG.personalCalendarId);

    // Add a personal event
    const now = new Date();
    const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow
    startTime.setHours(10, 0, 0, 0);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later

    personalCalendar.createEvent('Personal Meeting', startTime, endTime);

    // Run sync
    Code.sync();

    // Verify blocked time event was created
    const workEvents = workCalendar.getAllEvents();
    expect(workEvents.length).toBe(1);
    expect(workEvents[0].getTitle()).toBe(Code.CONFIG.blockedTimeTitle);
    expect(workEvents[0].getColor()).toBe(Code.CONFIG.eventColor);
  });

  test('should not duplicate existing blocked time events', () => {
    const workCalendar = global.CalendarApp.getDefaultCalendar();
    const personalCalendar = global.CalendarApp.getCalendarById(Code.CONFIG.personalCalendarId);

    const now = new Date();
    const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    startTime.setHours(10, 0, 0, 0);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    // Add event to both calendars
    personalCalendar.createEvent('Personal Meeting', startTime, endTime);
    workCalendar.createEvent(Code.CONFIG.blockedTimeTitle, startTime, endTime, { color: Code.CONFIG.eventColor });

    // Run sync
    Code.sync();

    // Should only have one event
    const workEvents = workCalendar.getAllEvents();
    expect(workEvents.length).toBe(1);
  });

  test('should delete stale blocked time events', () => {
    const workCalendar = global.CalendarApp.getDefaultCalendar();

    const now = new Date();
    const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    startTime.setHours(10, 0, 0, 0);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    // Only add to work calendar (stale event)
    workCalendar.createEvent(Code.CONFIG.blockedTimeTitle, startTime, endTime, { color: Code.CONFIG.eventColor });

    // Run sync
    Code.sync();

    // Stale event should be deleted
    const workEvents = workCalendar.getAllEvents().filter(e => !e.isDeleted());
    expect(workEvents.length).toBe(0);
  });

  test('should skip events with ignored titles', () => {
    const workCalendar = global.CalendarApp.getDefaultCalendar();
    const personalCalendar = global.CalendarApp.getCalendarById(Code.CONFIG.personalCalendarId);

    const now = new Date();
    const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    startTime.setHours(10, 0, 0, 0);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    // Add an ignored event
    personalCalendar.createEvent('Busy w/ Work', startTime, endTime);

    // Run sync
    Code.sync();

    // No blocked time should be created
    const workEvents = workCalendar.getAllEvents();
    expect(workEvents.length).toBe(0);
  });

  test('should log sync completion stats', () => {
    const personalCalendar = global.CalendarApp.getCalendarById(Code.CONFIG.personalCalendarId);

    // Add a personal event
    const now = new Date();
    const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    startTime.setHours(10, 0, 0, 0);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    personalCalendar.createEvent('Personal Meeting', startTime, endTime);

    // Run sync
    Code.sync();

    // Check logs
    expect(Logger._hasLog('=== Sync complete ===')).toBe(true);
    expect(Logger._hasLog('Added: 1')).toBe(true);
  });

  test('should skip when lock cannot be acquired', () => {
    // Acquire lock first
    const lock = global.LockService.getScriptLock();
    lock.tryLock(1000);

    // Run sync - should skip
    Code.sync();

    // Check logs
    expect(Logger._hasLog('Script already running')).toBe(true);
  });
});
