/**
 * Tests for createSyncStats function
 */

// Load the code under test
require('./mocks/gas-mocks');
const Code = require('../Code.js');

describe('createSyncStats', () => {
  test('should return stats object with all counters at zero', () => {
    const stats = Code.createSyncStats();

    expect(stats).toEqual({
      deleted: 0,
      updated: 0,
      added: 0,
      skipped: 0,
    });
  });

  test('should return a new object each call', () => {
    const stats1 = Code.createSyncStats();
    const stats2 = Code.createSyncStats();

    expect(stats1).not.toBe(stats2);
    expect(stats1).toEqual(stats2);
  });
});
