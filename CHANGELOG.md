# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-04-20

### Added
- Guest status filtering to skip unaccepted calendar invitations
- `AGENTS.md` - Project documentation for AI agents

### Changed
- `shouldSyncEvent()` now checks `event.getMyStatus()` to filter by response status
- Events with status `INVITED` (not responded) are now skipped
- Events with status `NO` (declined) are now skipped
- Updated mocks to support `getMyStatus()` and `CalendarApp.GuestStatus`

## [1.3.0] - 2026-04-15

### Added
- Filter events by original calendar ID using `getOriginalCalendarId()`
- Events from shared/delegated calendars are now automatically excluded from sync
- Only events originally created in your primary personal calendar are synced

### Changed
- `shouldSyncEvent()` now requires `personalCalendarId` parameter to validate event origin
- Updated `synchronizeEvents()`, `removeStaleBlockedTimeEvents()`, and `addNewBlockedTimeEvents()` to pass calendar ID

## [1.2.0] - 2026-04-14

### Added
- Jest test suite with comprehensive unit and integration tests
- Mock implementations for Google Apps Script APIs (`CalendarApp`, `LockService`, `Logger`, `Utilities`)
- Test coverage for core functions: `getDateRange`, `getEventTimeKey`, `shouldSyncEvent`, `buildEventMap`, `createSyncStats`
- Integration tests for the main `sync()` function
- `npm test` script for running tests locally

## [1.1.0] - 2026-04-14

### Changed
- Modernized JavaScript code with ES6+ idioms
  - Converted to arrow functions for pure functions
  - Used `Object.freeze()` for immutable configuration and arrays
  - Replaced plain objects with `Map` for event lookups (better performance)
  - Added comprehensive JSDoc type annotations
  - Used `CalendarApp.EventColor` enum instead of magic strings
  - Extracted smaller, focused utility functions
  - Used `Date.now()` instead of `new Date()` for timestamps

### Added
- `CONTRIBUTING.md` - Contribution guidelines
- `CHANGELOG.md` - This changelog
- Type definitions via JSDoc for better IDE support

## [1.0.0] - 2026-04-14

### Added
- Initial release of Personal Calendar Sync
- One-way sync from personal to work calendar
- Configurable date range (past/future days)
- Smart filtering by event title, all-day status, and day of week
- Event color customization
- Rate limiting to prevent API quota issues
- Script lock mechanism to prevent concurrent execution
- Comprehensive logging and statistics
- Multiple trigger support (calendar updates, time-driven)

### Features
- O(n) sync algorithm with event deduplication
- Automatic cleanup of stale blocked time events
- Color update for existing events
- Detailed sync statistics (added, deleted, updated, skipped)
