/**
 * Tests for getDateRange function
 */

const { resetAllMocks } = require('./mocks/gas-mocks');

// Load the code under test - must load mocks first
require('./mocks/gas-mocks');
const Code = require('../Code.js');

describe('getDateRange', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  test('should return correct date range based on CONFIG', () => {
    // Mock Date to have a predictable "now"
    const mockNow = new Date('2026-04-14T12:00:00Z');
    jest.useFakeTimers().setSystemTime(mockNow);

    const result = Code.getDateRange();

    // Calculate expected dates using the same logic as the function
    // CONFIG.daysInPast = 1, CONFIG.daysInFuture = 90
    const expectedStart = new Date(mockNow);
    expectedStart.setDate(expectedStart.getDate() - 1);
    expectedStart.setHours(0, 0, 0, 0);

    const expectedEnd = new Date(mockNow);
    expectedEnd.setDate(expectedEnd.getDate() + 90);
    expectedEnd.setHours(23, 59, 59, 999);

    expect(result.startDate.getTime()).toBe(expectedStart.getTime());
    expect(result.endDate.getTime()).toBe(expectedEnd.getTime());

    jest.useRealTimers();
  });

  test('start date should be at beginning of day', () => {
    const mockNow = new Date('2026-04-14T15:30:45.500Z');
    jest.useFakeTimers().setSystemTime(mockNow);

    const { startDate } = Code.getDateRange();

    expect(startDate.getHours()).toBe(0);
    expect(startDate.getMinutes()).toBe(0);
    expect(startDate.getSeconds()).toBe(0);
    expect(startDate.getMilliseconds()).toBe(0);

    jest.useRealTimers();
  });

  test('end date should be at end of day', () => {
    const mockNow = new Date('2026-04-14T15:30:45.500Z');
    jest.useFakeTimers().setSystemTime(mockNow);

    const { endDate } = Code.getDateRange();

    expect(endDate.getHours()).toBe(23);
    expect(endDate.getMinutes()).toBe(59);
    expect(endDate.getSeconds()).toBe(59);
    expect(endDate.getMilliseconds()).toBe(999);

    jest.useRealTimers();
  });
});
