# Contributing to Personal Calendar Sync

Thank you for your interest in contributing! This project is a Google Apps Script for syncing personal calendar busy time to work calendars.

## Development Setup

Since this is a Google Apps Script project, development is done directly in the [Google Apps Script editor](https://script.google.com/).

### Local Development (Optional)

For local editing and version control, you can use [clasp](https://github.com/google/clasp):

```bash
# Install clasp globally
npm install -g @google/clasp

# Login to Google Apps Script
clasp login

# Clone the project (if you have the script ID)
clasp clone <SCRIPT_ID>

# Or push local changes
clasp push
```

## Code Style

- Use modern JavaScript (ES6+) idioms
- Prefer `const` and arrow functions for pure functions
- Use `Object.freeze()` for immutable configuration
- Add JSDoc comments for type documentation
- Keep functions small and focused on a single responsibility

## Submitting Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation changes
- `style:` — Code style changes (formatting, etc.)
- `refactor:` — Code refactoring
- `test:` — Adding or updating tests
- `chore:` — Maintenance tasks

## Testing

Since this is a Google Apps Script project, testing is manual:

1. Copy the code to your Google Apps Script project
2. Update the `CONFIG` section with your test calendar
3. Run the `sync()` function and check the logs
4. Verify events are synced correctly

## Reporting Issues

When reporting bugs, please include:

- Description of the issue
- Steps to reproduce
- Expected behavior
- Actual behavior
- Logs from the Google Apps Script execution (View → Logs)

## Feature Requests

We welcome feature requests! Please open an issue describing:

- The use case
- Proposed solution
- Any alternatives you've considered

## Code of Conduct

Be respectful and constructive in all interactions.
