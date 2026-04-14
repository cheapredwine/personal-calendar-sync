/**
 * Tests for getEventTimeKey function
 */

const { MockCalendarEvent } = require('./mocks/gas-mocks');

// Load the code under test
require('./mocks/gas-mocks');
const Code = require('../Code.js');

describe('getEventTimeKey', () => {
  test('should generate unique key from event times', () => {
    const start = new Date('2026-04-14T10:00:00Z');
    const end = new Date('2026-04-14T11:00:00Z');
    const event = new MockCalendarEvent('Meeting', start, end);

    const key = Code.getEventTimeKey(event);

    expect(key).toBe(`${start.getTime()}-${end.getTime()}`);
  });

  test('should generate different keys for different times', () => {
    const event1 = new MockCalendarEvent('Meeting 1', new Date('2026-04-14T10:00:00Z'), new Date('2026-04-14T11:00:00Z'));
    const event2 = new MockCalendarEvent('Meeting 2', new Date('2026-04-14T12:00:00Z'), new Date('2026-04-14T13:00:00Z'));

    const key1 = Code.getEventTimeKey(event1);
    const key2 = Code.getEventTimeKey(event2);

    expect(key1).not.toBe(key2);
  });

  test('should generate same key for events with same times', () => {
    const start = new Date('2026-04-14T10:00:00Z');
    const end = new Date('2026-04-14T11:00:00Z');

    const event1 = new MockCalendarEvent('Meeting A', start, end);
    const event2 = new MockCalendarEvent('Meeting B', start, end);

    const key1 = Code.getEventTimeKey(event1);
    const key2 = Code.getEventTimeKey(event2);

    expect(key1).toBe(key2);
  });
});
