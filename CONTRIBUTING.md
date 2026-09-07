# Contributing to SouthRail

Thanks for helping improve SouthRail. Please open an issue before a large change so its scope and design can be agreed.

## Development workflow

1. Branch from the repository's default branch and keep each change focused.
2. Preserve the capability-oriented backend packages; put cross-cutting concerns under `shared` only when they are genuinely shared.
3. Never commit `.env`, credentials, tokens, personal data, generated build output or `node_modules`.
4. Add or update tests for behavior changes. Do not silently change REST/DTO contracts or database scripts.
5. Run the relevant checks:

   ```bash
   cd backend && mvn test
   cd ../frontend && npm ci && npm run lint && npm run build
   git diff --check
   ```

6. Use a clear commit message and complete the pull-request checklist.

## Reports and pull requests

Bug reports should include reproduction steps, expected/actual behavior, relevant logs with secrets removed, and environment details. Pull requests should explain intent, testing, API/schema impact and any rollout considerations. Keep refactoring separate from functional changes whenever practical.

## Security

Do not publish exploitable vulnerabilities or credentials in an issue. Contact the repository owner privately to coordinate a fix.
