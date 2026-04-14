/**
 * Tests for buildEventMap function
 */

const { MockCalendarEvent } = require('./mocks/gas-mocks');

// Load the code under test
require('./mocks/gas-mocks');
const Code = require('../Code.js');

describe('buildEventMap', () => {
  test('should return empty Map for empty events array', () => {
    const result = Code.buildEventMap([]);

    expect(result.size).toBe(0);
  });

  test('should build Map with event time keys', () => {
    const events = [
      new MockCalendarEvent('Event 1', new Date('2026-04-14T10:00:00Z'), new Date('2026-04-14T11:00:00Z')),
      new MockCalendarEvent('Event 2', new Date('2026-04-14T12:00:00Z'), new Date('2026-04-14T13:00:00Z')),
    ];

    const result = Code.buildEventMap(events);

    expect(result.size).toBe(2);
    expect(result.has(Code.getEventTimeKey(events[0]))).toBe(true);
    expect(result.has(Code.getEventTimeKey(events[1]))).toBe(true);
    expect(result.get(Code.getEventTimeKey(events[0]))).toEqual([events[0]]);
  });

  test('should handle events with same time key (stores all events in array)', () => {
    const start = new Date('2026-04-14T10:00:00Z');
    const end = new Date('2026-04-14T11:00:00Z');

    const event1 = new MockCalendarEvent('Event A', start, end);
    const event2 = new MockCalendarEvent('Event B', start, end);

    const result = Code.buildEventMap([event1, event2]);

    expect(result.size).toBe(1);
    expect(result.get(Code.getEventTimeKey(event1))).toEqual([event1, event2]);
  });
});
