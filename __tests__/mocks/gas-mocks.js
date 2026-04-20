/**
 * Mock Google Apps Script APIs for testing
 */

// ============================================================================
// Mock Calendar Event
// ============================================================================

class MockCalendarEvent {
  constructor(title, startTime, endTime, options = {}) {
    this._title = title;
    this._startTime = new Date(startTime);
    this._endTime = new Date(endTime);
    this._color = options.color || '0';
    this._isAllDay = options.isAllDay || false;
    this._transparency = options.transparency || 'OPAQUE';
    this._originalCalendarId = options.originalCalendarId || null;
    this._myStatus = options.myStatus || null;
    this._reminders = [];
  }

  getTitle() {
    return this._title;
  }

  getStartTime() {
    return new Date(this._startTime);
  }

  getEndTime() {
    return new Date(this._endTime);
  }

  getColor() {
    return this._color;
  }

  setColor(color) {
    this._color = color;
  }

  isAllDayEvent() {
    return this._isAllDay;
  }

  getTransparency() {
    return this._transparency;
  }

  removeAllReminders() {
    this._reminders = [];
  }

  deleteEvent() {
    this._deleted = true;
  }

  isDeleted() {
    return this._deleted || false;
  }

  getOriginalCalendarId() {
    return this._originalCalendarId;
  }

  getMyStatus() {
    return this._myStatus;
  }
}

// ============================================================================
// Mock Calendar
// ============================================================================

class MockCalendar {
  constructor(name = 'Test Calendar', id = null) {
    this._name = name;
    this._id = id;
    this._events = [];
  }

  getEvents(startTime, endTime) {
    return this._events.filter(event => {
      const eventStart = event.getStartTime().getTime();
      const eventEnd = event.getEndTime().getTime();
      const rangeStart = startTime.getTime();
      const rangeEnd = endTime.getTime();
      return eventStart < rangeEnd && eventEnd > rangeStart;
    });
  }

  createEvent(title, startTime, endTime, options = {}) {
    const eventOptions = {
      ...options,
      originalCalendarId: this._id,
    };
    const event = new MockCalendarEvent(title, startTime, endTime, eventOptions);
    this._events.push(event);
    return event;
  }

  addEvent(event) {
    this._events.push(event);
  }

  clearEvents() {
    this._events = [];
  }

  getAllEvents() {
    return [...this._events];
  }
}

// ============================================================================
// Mock CalendarApp
// ============================================================================

const MockCalendarApp = {
  _defaultCalendar: new MockCalendar('Default'),
  _calendarsById: new Map(),

  getDefaultCalendar() {
    return this._defaultCalendar;
  },

  getCalendarById(id) {
    return this._calendarsById.get(id) || null;
  },

  // Test helpers
  _reset() {
    this._defaultCalendar = new MockCalendar('Default');
    this._calendarsById.clear();
  },

  _addCalendar(id, calendar) {
    this._calendarsById.set(id, calendar);
  },

  EventColor: Object.freeze({
    PALE_BLUE: '0',
    PALE_GREEN: '1',
    MAUVE: '2',
    PALE_RED: '3',
    YELLOW: '4',
    ORANGE: '5',
    CYAN: '6',
    GRAY: '7',
    BLUE: '8',
    GREEN: '9',
    RED: '10',
    BLACK: '11',
    GRAPE: '3',
  }),

  GuestStatus: Object.freeze({
    YES: 'yes',
    NO: 'no',
    MAYBE: 'maybe',
    INVITED: 'invited',
    OWNER: 'owner',
  }),
};

// ============================================================================
// Mock Lock Service
// ============================================================================

class MockLock {
  constructor() {
    this._locked = false;
  }

  tryLock(timeoutMs) {
    if (this._locked) {
      return false;
    }
    this._locked = true;
    return true;
  }

  releaseLock() {
    this._locked = false;
  }

  hasLock() {
    return this._locked;
  }
}

const MockLockService = {
  _scriptLock: new MockLock(),

  getScriptLock() {
    return this._scriptLock;
  },

  // Test helpers
  _reset() {
    this._scriptLock = new MockLock();
  },
};

// ============================================================================
// Mock Logger
// ============================================================================

const MockLogger = {
  _logs: [],

  log(message) {
    this._logs.push(String(message));
    // Uncomment to see logs during tests:
    // console.log(`[GAS] ${message}`);
  },

  // Test helpers
  _reset() {
    this._logs = [];
  },

  _getLogs() {
    return [...this._logs];
  },

  _hasLog(pattern) {
    return this._logs.some(log => log.includes(pattern));
  },
};

// ============================================================================
// Mock Utilities
// ============================================================================

const MockUtilities = {
  _sleepCalls: [],

  sleep(milliseconds) {
    this._sleepCalls.push(milliseconds);
    // In tests, we don't actually sleep
  },

  // Test helpers
  _reset() {
    this._sleepCalls = [];
  },

  _getSleepCalls() {
    return [...this._sleepCalls];
  },
};

// ============================================================================
// Setup Global Mocks
// ============================================================================

global.CalendarApp = MockCalendarApp;
global.LockService = MockLockService;
global.Logger = MockLogger;
global.Utilities = MockUtilities;

// ============================================================================
// Reset Function
// ============================================================================

function resetAllMocks() {
  MockCalendarApp._reset();
  MockLockService._reset();
  MockLogger._reset();
  MockUtilities._reset();
}

module.exports = {
  MockCalendarEvent,
  MockCalendar,
  MockCalendarApp,
  MockLock,
  MockLockService,
  MockLogger,
  MockUtilities,
  resetAllMocks,
};
