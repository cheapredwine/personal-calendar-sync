/**
 * Tests for shouldSyncEvent function
 */

const { resetAllMocks, MockCalendarEvent } = require('./mocks/gas-mocks');

// Load the code under test
require('./mocks/gas-mocks');

describe('shouldSyncEvent', () => {
  let Code;

  beforeEach(() => {
    resetAllMocks();
    // Clear module cache to get fresh CONFIG
    jest.resetModules();
    Code = require('../Code.js');
  });

  test('should return true for regular event on synced day', () => {
    // Monday April 13, 2026 is day 1
    const event = new MockCalendarEvent('Doctor Appointment', new Date('2026-04-13T10:00:00Z'), new Date('2026-04-13T11:00:00Z'), {
      originalCalendarId: Code.CONFIG.personalCalendarId
    });

    expect(Code.shouldSyncEvent(event, Code.CONFIG.personalCalendarId)).toBe(true);
  });

  test('should return true for all-day events by default', () => {
    const event = new MockCalendarEvent('Vacation', new Date('2026-04-14T00:00:00Z'), new Date('2026-04-15T00:00:00Z'), { isAllDay: true, originalCalendarId: Code.CONFIG.personalCalendarId });

    expect(Code.shouldSyncEvent(event, Code.CONFIG.personalCalendarId)).toBe(true);
  });

  test('should return false for events marked as Free (transparent)', () => {
    const event = new MockCalendarEvent('Focus Time', new Date('2026-04-14T10:00:00Z'), new Date('2026-04-14T11:00:00Z'), { transparency: 'TRANSPARENT', originalCalendarId: Code.CONFIG.personalCalendarId });

    expect(Code.shouldSyncEvent(event, Code.CONFIG.personalCalendarId)).toBe(false);
  });

  test('should return true for Busy events (opaque)', () => {
    const event = new MockCalendarEvent('Meeting', new Date('2026-04-14T10:00:00Z'), new Date('2026-04-14T11:00:00Z'), { transparency: 'OPAQUE', originalCalendarId: Code.CONFIG.personalCalendarId });

    expect(Code.shouldSyncEvent(event, Code.CONFIG.personalCalendarId)).toBe(true);
  });

  test('should return false for events from other calendars (shared calendars)', () => {
    const event = new MockCalendarEvent('Shared Meeting', new Date('2026-04-14T10:00:00Z'), new Date('2026-04-14T11:00:00Z'), { originalCalendarId: 'other-calendar@example.com' });

    expect(Code.shouldSyncEvent(event, Code.CONFIG.personalCalendarId)).toBe(false);
  });

  test('should return true for events with no originalCalendarId (backwards compatibility)', () => {
    const event = new MockCalendarEvent('Legacy Event', new Date('2026-04-14T10:00:00Z'), new Date('2026-04-14T11:00:00Z'));

    expect(Code.shouldSyncEvent(event, Code.CONFIG.personalCalendarId)).toBe(true);
  });

  test('should return true when originalCalendarId is undefined (not set)', () => {
    const event = new MockCalendarEvent('Event', new Date('2026-04-14T10:00:00Z'), new Date('2026-04-14T11:00:00Z'), {
      originalCalendarId: undefined
    });

    expect(Code.shouldSyncEvent(event, Code.CONFIG.personalCalendarId)).toBe(true);
  });

  test('should filter out events when originalCalendarId does not match personalCalendarId', () => {
    // This documents the expected behavior: events from different calendars are filtered
    const realCalendarId = 'real.person@example.com';
    const differentCalendarId = 'other.calendar@example.com';

    // Event from a different calendar (e.g., shared calendar)
    const event = new MockCalendarEvent('Shared Meeting', new Date('2026-04-14T10:00:00Z'), new Date('2026-04-14T11:00:00Z'), {
      originalCalendarId: differentCalendarId,
      transparency: 'OPAQUE'
    });

    // Should be filtered out when checked against realCalendarId
    expect(Code.shouldSyncEvent(event, realCalendarId)).toBe(false);

    // Should be allowed when checked against its own calendar ID
    expect(Code.shouldSyncEvent(event, differentCalendarId)).toBe(true);
  });
});
