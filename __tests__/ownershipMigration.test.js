/**
 * Tests for the one-time legacy ownership migration.
 *
 * Blocked events created before v1.5.0 carry no syncMarker in their
 * description, so the marker-gated cleanup pass never considered them stale.
 * When a personal event was moved or deleted, the old blocked time stayed on
 * the work calendar forever. The migration adopts those legacy events once
 * (by appending the marker to their description) so normal cleanup applies.
 */

const {
  resetAllMocks,
  MockCalendar,
  MockCalendarEvent,
  MockPropertiesService,
} = require('./mocks/gas-mocks');

describe('legacy ownership migration', () => {
  let Code;
  let Logger;
  let PropertiesService;

  beforeEach(() => {
    resetAllMocks();
    jest.resetModules();

    const mocks = require('./mocks/gas-mocks');
    Logger = mocks.MockLogger;
    PropertiesService = mocks.MockPropertiesService;

    Code = require('../Code.js');

    const personalCalendar = new MockCalendar('Personal', Code.CONFIG.personalCalendarId);
    global.CalendarApp._addCalendar(Code.CONFIG.personalCalendarId, personalCalendar);
  });

  const getWorkCalendar = () => global.CalendarApp.getDefaultCalendar();
  const getPersonalCalendar = () =>
    global.CalendarApp.getCalendarById(Code.CONFIG.personalCalendarId);

  const makeTime = (hoursOffset = 0) => {
    const startTime = new Date();
    startTime.setDate(startTime.getDate() + 2);
    startTime.setHours(10 + hoursOffset, 0, 0, 0);
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    return { startTime, endTime };
  };

  const aliveEvents = (workCalendar) =>
    workCalendar.getAllEvents().filter(e => !e.isDeleted());

  describe('adoption', () => {
    test('adopts an unmarked blocked time event by appending the marker', () => {
      const workCalendar = getWorkCalendar();
      const { startTime, endTime } = makeTime();

      workCalendar.createEvent(Code.CONFIG.blockedTimeTitle, startTime, endTime, {
        color: Code.CONFIG.eventColor,
      });

      const stats = { adopted: 0, deleted: 0, updated: 0, added: 0, skipped: 0 };
      Code.adoptLegacyBlockedTimeEvents(
        Code.buildEventMap(workCalendar.getAllEvents()),
        stats
      );

      const event = workCalendar.getAllEvents()[0];
      expect(stats.adopted).toBe(1);
      expect(event.isDeleted()).toBe(false);
      expect(event.getDescription()).toContain(Code.CONFIG.syncMarker);
    });

    test('preserves an existing description when adopting', () => {
      const workCalendar = getWorkCalendar();
      const { startTime, endTime } = makeTime();

      workCalendar.createEvent(Code.CONFIG.blockedTimeTitle, startTime, endTime, {
        description: 'handwritten note',
      });

      const stats = { adopted: 0, deleted: 0, updated: 0, added: 0, skipped: 0 };
      Code.adoptLegacyBlockedTimeEvents(
        Code.buildEventMap(workCalendar.getAllEvents()),
        stats
      );

      const description = workCalendar.getAllEvents()[0].getDescription();
      expect(description).toContain('handwritten note');
      expect(description).toContain(Code.CONFIG.syncMarker);
    });

    test('never adopts events with other titles', () => {
      const workCalendar = getWorkCalendar();
      const { startTime, endTime } = makeTime();

      workCalendar.createEvent('Team Meeting', startTime, endTime, {
        description: 'important agenda',
      });

      const stats = { adopted: 0, deleted: 0, updated: 0, added: 0, skipped: 0 };
      Code.adoptLegacyBlockedTimeEvents(
        Code.buildEventMap(workCalendar.getAllEvents()),
        stats
      );

      const event = workCalendar.getAllEvents()[0];
      expect(stats.adopted).toBe(0);
      expect(event.getDescription()).toBe('important agenda');
    });

    test('does not adopt when Script Properties is unavailable (fail-safe)', () => {
      jest.resetModules();
      delete global.PropertiesService;
      Code = require('../Code.js');

      const workCalendar = getWorkCalendar();
      const { startTime, endTime } = makeTime();

      workCalendar.createEvent(Code.CONFIG.blockedTimeTitle, startTime, endTime);

      const stats = { adopted: 0, deleted: 0, updated: 0, added: 0, skipped: 0 };
      Code.adoptLegacyBlockedTimeEvents(
        Code.buildEventMap(workCalendar.getAllEvents()),
        stats
      );

      const event = workCalendar.getAllEvents()[0];
      expect(stats.adopted).toBe(0);
      expect(event.getDescription()).toBe('');
    });
  });

  describe('moved event regression', () => {
    test('cleans up a legacy blocked event when the personal event is moved', () => {
      const workCalendar = getWorkCalendar();
      const personalCalendar = getPersonalCalendar();
      const { startTime: t1Start, endTime: t1End } = makeTime();

      // Legacy state: unmarked block (pre-v1.5.0) backing a live personal event
      const legacyBlock = workCalendar.createEvent(
        Code.CONFIG.blockedTimeTitle, t1Start, t1End, { color: '3' }
      );
      personalCalendar.createEvent('Dentist', t1Start, t1End);

      Code.sync();

      // First sync adopts the legacy block and performs normal maintenance
      expect(legacyBlock.isDeleted()).toBe(false);
      expect(legacyBlock.getDescription()).toContain(Code.CONFIG.syncMarker);
      expect(legacyBlock.getColor()).toBe(Code.CONFIG.eventColor);

      // Move the personal event to a new time
      personalCalendar.clearEvents();
      const { startTime: t2Start, endTime: t2End } = makeTime(4);
      personalCalendar.createEvent('Dentist', t2Start, t2End);

      Code.sync();

      // The old block is gone; exactly one marked block remains, at the new time
      expect(legacyBlock.isDeleted()).toBe(true);
      const remaining = aliveEvents(workCalendar);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].getTitle()).toBe(Code.CONFIG.blockedTimeTitle);
      expect(remaining[0].getStartTime().getTime()).toBe(t2Start.getTime());
      expect(remaining[0].getDescription()).toBe(Code.CONFIG.syncMarker);
    });

    test('cleans up an already-stale legacy blocked event in a single sync', () => {
      const workCalendar = getWorkCalendar();
      const { startTime, endTime } = makeTime();

      // Stale legacy block with no personal event behind it (the reported bug)
      const staleBlock = workCalendar.createEvent(
        Code.CONFIG.blockedTimeTitle, startTime, endTime
      );

      Code.sync();

      expect(staleBlock.isDeleted()).toBe(true);
      expect(aliveEvents(workCalendar)).toHaveLength(0);
      expect(Code.hasOwnershipMigrationRun()).toBe(true);
    });
  });

  describe('migration runs exactly once', () => {
    test('does not adopt unmarked events after the migration has run', () => {
      const workCalendar = getWorkCalendar();
      const { startTime, endTime } = makeTime();

      // Complete the migration, then simulate a manual same-title event
      Code.markOwnershipMigrationDone();
      const manualEvent = workCalendar.createEvent(
        Code.CONFIG.blockedTimeTitle, startTime, endTime
      );

      Code.sync();

      expect(manualEvent.isDeleted()).toBe(false);
      expect(manualEvent.getDescription()).toBe('');
    });

    test('does not set the flag when the sync fails, and recovers on retry', () => {
      const workCalendar = getWorkCalendar();
      const { startTime, endTime } = makeTime();

      const staleBlock = workCalendar.createEvent(
        Code.CONFIG.blockedTimeTitle, startTime, endTime
      );
      const originalDelete = MockCalendarEvent.prototype.deleteEvent.bind(staleBlock);
      staleBlock.deleteEvent = () => {
        throw new Error('Simulated API failure');
      };

      expect(() => Code.sync()).toThrow('Simulated API failure');

      // Adoption happened but the flag was not persisted
      expect(staleBlock.getDescription()).toContain(Code.CONFIG.syncMarker);
      expect(staleBlock.isDeleted()).toBe(false);
      expect(Code.hasOwnershipMigrationRun()).toBe(false);

      // Retry: adoption is idempotent, cleanup completes, flag is set
      staleBlock.deleteEvent = originalDelete;

      Code.sync();

      expect(staleBlock.isDeleted()).toBe(true);
      expect(Code.hasOwnershipMigrationRun()).toBe(true);
    });

    test('adopted events backed by live personal events are kept and managed', () => {
      const workCalendar = getWorkCalendar();
      const personalCalendar = getPersonalCalendar();
      const { startTime, endTime } = makeTime();

      const legacyBlock = workCalendar.createEvent(
        Code.CONFIG.blockedTimeTitle, startTime, endTime
      );
      personalCalendar.createEvent('Personal Meeting', startTime, endTime);

      Code.sync();

      // Adopted, not deleted, and corrected by normal maintenance
      expect(legacyBlock.isDeleted()).toBe(false);
      expect(legacyBlock.getDescription()).toContain(Code.CONFIG.syncMarker);
      expect(legacyBlock.getColor()).toBe(Code.CONFIG.eventColor);
      expect(aliveEvents(workCalendar)).toHaveLength(1);
    });

    test('still completes the sync if the migration flag cannot be persisted', () => {
      const workCalendar = getWorkCalendar();
      const { startTime, endTime } = makeTime();

      const staleBlock = workCalendar.createEvent(
        Code.CONFIG.blockedTimeTitle, startTime, endTime
      );

      // Make the flag write fail after a fully successful sync
      const props = PropertiesService.getScriptProperties();
      const originalSetProperty = props.setProperty.bind(props);
      props.setProperty = () => {
        throw new Error('Quota exceeded');
      };

      expect(() => Code.sync()).not.toThrow();
      expect(staleBlock.isDeleted()).toBe(true);
      expect(Code.hasOwnershipMigrationRun()).toBe(false);

      // Next sync re-runs the migration safely and persists the flag
      props.setProperty = originalSetProperty;
      Code.sync();

      expect(
        PropertiesService.getScriptProperties().getProperty(Code.OWNERSHIP_MIGRATION_FLAG)
      ).toBe('true');
    });

    test('repairs a legacy timed block for an all-day personal event after adoption', () => {
      const workCalendar = getWorkCalendar();
      const personalCalendar = getPersonalCalendar();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 2);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 2);

      // Pre-v1.5.0 bug: all-day source event produced a timed block
      const legacyBlock = workCalendar.createEvent(
        Code.CONFIG.blockedTimeTitle, startDate, endDate
      );
      personalCalendar.createAllDayEvent('Conference', startDate, endDate);

      Code.sync();

      // Adopted, then repaired to all-day with the marker intact
      expect(legacyBlock.isDeleted()).toBe(true);
      const remaining = aliveEvents(workCalendar);
      expect(remaining).toHaveLength(1);
      expect(remaining[0].isAllDayEvent()).toBe(true);
      expect(remaining[0].getDescription()).toBe(Code.CONFIG.syncMarker);
    });

    test('marked stale events continue to be cleaned after the migration', () => {
      const workCalendar = getWorkCalendar();
      const { startTime, endTime } = makeTime();

      Code.markOwnershipMigrationDone();
      const markedStale = workCalendar.createEvent(
        Code.CONFIG.blockedTimeTitle, startTime, endTime,
        { description: Code.CONFIG.syncMarker }
      );

      Code.sync();

      expect(markedStale.isDeleted()).toBe(true);
    });
  });
});
