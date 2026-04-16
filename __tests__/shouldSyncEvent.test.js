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
    jest.resetModules();
    Code = require('../Code.js');
  });

  test('should return true for regular event on synced day', () => {
    const event = new MockCalendarEvent('Doctor Appointment', new Date('2026-04-13T10:00:00Z'), new Date('2026-04-13T11:00:00Z'));

    expect(Code.shouldSyncEvent(event)).toBe(true);
  });

  test('should return true for all-day events by default', () => {
    const event = new MockCalendarEvent('Vacation', new Date('2026-04-14T00:00:00Z'), new Date('2026-04-15T00:00:00Z'), { isAllDay: true });

    expect(Code.shouldSyncEvent(event)).toBe(true);
  });

  test('should return false for events marked as Free (transparent)', () => {
    const event = new MockCalendarEvent('Focus Time', new Date('2026-04-14T10:00:00Z'), new Date('2026-04-14T11:00:00Z'), { transparency: 'TRANSPARENT' });

    expect(Code.shouldSyncEvent(event)).toBe(false);
  });

  test('should return true for Busy events (opaque)', () => {
    const event = new MockCalendarEvent('Meeting', new Date('2026-04-14T10:00:00Z'), new Date('2026-04-14T11:00:00Z'), { transparency: 'OPAQUE' });

    expect(Code.shouldSyncEvent(event)).toBe(true);
  });

  test('should return true for invited events organized by others', () => {
    const event = new MockCalendarEvent('Full-Service Detail Package', new Date('2026-04-18T09:00:00Z'), new Date('2026-04-18T13:00:00Z'), {
      originalCalendarId: 'unknownorganizer@calendar.google.com',
      transparency: 'OPAQUE'
    });

    expect(Code.shouldSyncEvent(event)).toBe(true);
  });

  test('should return true for events with no originalCalendarId', () => {
    const event = new MockCalendarEvent('Legacy Event', new Date('2026-04-14T10:00:00Z'), new Date('2026-04-14T11:00:00Z'));

    expect(Code.shouldSyncEvent(event)).toBe(true);
  });

  test('should return true when originalCalendarId is undefined (not set)', () => {
    const event = new MockCalendarEvent('Event', new Date('2026-04-14T10:00:00Z'), new Date('2026-04-14T11:00:00Z'), {
      originalCalendarId: undefined
    });

    expect(Code.shouldSyncEvent(event)).toBe(true);
  });

  test('should return true for events from a different calendar (shared calendars are now synced)', () => {
    const event = new MockCalendarEvent('Shared Meeting', new Date('2026-04-14T10:00:00Z'), new Date('2026-04-14T11:00:00Z'), {
      originalCalendarId: 'other-calendar@example.com',
      transparency: 'OPAQUE'
    });

    expect(Code.shouldSyncEvent(event)).toBe(true);
  });
});
