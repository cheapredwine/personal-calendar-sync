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
    const event = new MockCalendarEvent('Doctor Appointment', new Date('2026-04-13T10:00:00Z'), new Date('2026-04-13T11:00:00Z'));

    expect(Code.shouldSyncEvent(event)).toBe(true);
  });

  test('should return false for ignored event titles', () => {
    const event = new MockCalendarEvent('Busy w/ Work', new Date('2026-04-14T10:00:00Z'), new Date('2026-04-14T11:00:00Z'));

    expect(Code.shouldSyncEvent(event)).toBe(false);
  });

  test('should return true for all-day events by default', () => {
    const event = new MockCalendarEvent('Vacation', new Date('2026-04-14T00:00:00Z'), new Date('2026-04-15T00:00:00Z'), { isAllDay: true });

    expect(Code.shouldSyncEvent(event)).toBe(true);
  });
});
