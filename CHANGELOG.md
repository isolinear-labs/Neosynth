# Changelog

## [Unreleased]

### Enhancements

### Bug Fixes

### Docs

### Dependencies
- Bump `mongoose` from 9.6.3 to 9.7.3 ([#97](https://github.com/isolinear-labs/Neosynth/pull/97), [#103](https://github.com/isolinear-labs/Neosynth/pull/103), [#108](https://github.com/isolinear-labs/Neosynth/pull/108))
- Bump `sanitize-html` from 2.17.4 to 2.17.5 ([#97](https://github.com/isolinear-labs/Neosynth/pull/97))
- Bump `eslint` from 10.4.1 to 10.5.0 ([#96](https://github.com/isolinear-labs/Neosynth/pull/96), [#95](https://github.com/isolinear-labs/Neosynth/pull/95))
- Bump `form-data` from 4.0.5 to 4.0.6 ([#98](https://github.com/isolinear-labs/Neosynth/pull/98))
- Bump `js-yaml` from 4.1.0 to 4.2.0 — resolves CVE-2026-53550 (moderate DoS; pinned via `overrides` to also patch the transitive copy from `jest`) ([#99](https://github.com/isolinear-labs/Neosynth/pull/99))
- Bump `brace-expansion` from 5.0.5 to 5.0.6 — resolves CVE-2026-45149 (ReDoS) ([#99](https://github.com/isolinear-labs/Neosynth/pull/99))
- Bump `joi` from 18.2.1 to 18.2.3 ([#103](https://github.com/isolinear-labs/Neosynth/pull/103))
- Bump `trufflesecurity/trufflehog` from 3.95.5 to 3.95.6 ([#102](https://github.com/isolinear-labs/Neosynth/pull/102))
- Bump `zizmorcore/zizmor-action` from 0.5.6 to 0.5.7 ([#101](https://github.com/isolinear-labs/Neosynth/pull/101))
- Bump `actions/checkout` from 6.0.3 to 7.0.0 ([#100](https://github.com/isolinear-labs/Neosynth/pull/100))

## [v1.2.1] - 2026-06-04

### Bug Fixes
- (backend/featureFlags) Replace deprecated `new: true` with `returnDocument: 'after'` in `findByIdAndUpdate` for Mongoose 9.6.1 compatibility ([#88](https://github.com/isolinear-labs/Neosynth/pull/88))
- (backend) Add MongoDB connection retry with exponential backoff on startup — prevents the app from hanging permanently when the database is temporarily unavailable ([#89](https://github.com/isolinear-labs/Neosynth/pull/89))
- (backend/deployment) Add `/ready` readiness probe endpoint; update k8s and Docker Compose to hold traffic until DB is connected and migrations complete ([#89](https://github.com/isolinear-labs/Neosynth/pull/89))

### Docs
- (docs) Updated `DEVELOPMENT.md` and `deployments/README.md` with newly supported environemnt variables: `DB_MAX_RETRIES`, `DB_RETRY_DELAY_MS` and `BYPASS_MIGRATIONS` ([#89](https://github.com/isolinear-labs/Neosynth/pull/89))

### Dependencies
- Bump `helmet` from 8.1.0 to 8.2.0 ([#84](https://github.com/isolinear-labs/Neosynth/pull/84))
- Bump `eslint` from 10.4.0 to 10.4.1 ([#87](https://github.com/isolinear-labs/Neosynth/pull/87), [#92](https://github.com/isolinear-labs/Neosynth/pull/92))
- Bump `actions/checkout` from 6.0.2 to 6.0.3 ([#90](https://github.com/isolinear-labs/Neosynth/pull/90))
- Bump `trufflesecurity/trufflehog` from 3.95.3 to 3.95.5 ([#91](https://github.com/isolinear-labs/Neosynth/pull/91))

## [v1.2.0] - 2026-05-24

### Enhancements
- feat(frontend/mobile): Added `client_error_logging` feature flag and client logger module — captures audio interruption and page lifecycle events and forwards them to the backend logs ([#81](https://github.com/isolinear-labs/Neosynth/pull/81))

 - feat(admin): Revampted the CSS for the Admin Page - brining the page closer to the theming of the rest of the app ([#82](https://github.com/isolinear-labs/Neosynth/pull/82))

### Dependencies
- Bump `express-rate-limit` from 8.3.2 to 8.5.2 ([#64](https://github.com/isolinear-labs/Neosynth/pull/64), [#68](https://github.com/isolinear-labs/Neosynth/pull/68), [#73](https://github.com/isolinear-labs/Neosynth/pull/73), [#78](https://github.com/isolinear-labs/Neosynth/pull/78))
- Bump `ip-address` from 10.1.0 to 10.2.0 ([#73](https://github.com/isolinear-labs/Neosynth/pull/73))
- Bump `eslint` from 10.2.1 to 10.4.0 ([#67](https://github.com/isolinear-labs/Neosynth/pull/67), [#66](https://github.com/isolinear-labs/Neosynth/pull/66), [#76](https://github.com/isolinear-labs/Neosynth/pull/76), [#77](https://github.com/isolinear-labs/Neosynth/pull/77))
- Bump `joi` from 18.1.2 to 18.2.1 ([#68](https://github.com/isolinear-labs/Neosynth/pull/68))
- Bump `mongoose` from 9.5.0 to 9.6.2 ([#68](https://github.com/isolinear-labs/Neosynth/pull/68), [#75](https://github.com/isolinear-labs/Neosynth/pull/75))
- Bump `flatted` from 3.3.3 to 3.4.2 ([#71](https://github.com/isolinear-labs/Neosynth/pull/71))
- Bump `postcss` from 8.5.6 to 8.5.14 ([#72](https://github.com/isolinear-labs/Neosynth/pull/72))
- Bump `jest` from 30.3.0 to 30.4.2 ([#74](https://github.com/isolinear-labs/Neosynth/pull/74))
- Bump `sanitize-html` from 2.17.3 to 2.17.4 ([#78](https://github.com/isolinear-labs/Neosynth/pull/78))
- Bump `qs` from 6.15.0 to 6.15.2 ([#79](https://github.com/isolinear-labs/Neosynth/pull/79))

## [v1.1.0] - 2026-04-20

### Enhancements
- feat(docker): added support for `APP_VERSION` and `BUILD_STATUS` build args to stamp app at image build time. Build example: `BUILD_STATUS=$(git rev-parse --short HEAD)` ([#57](https://github.com/isolinear-labs/Neosynth/pull/57))
- feat(frontend/mobile): Revamped iOS background audio controls: pause now works on first press, play reliably resumes and pauses. This allows external audio control devices, such as airpods, to correctly push commands to the player ([#56](https://github.com/isolinear-labs/Neosynth/pull/56))

### Bug Fixes
- fix(frontend/resume): fixed mobile Resume playing from the wrong track/position — playlist now loads directly on the saved track, seeks before `play()` is called, resulting in a much smoother Resume experience ([#55](https://github.com/isolinear-labs/Neosynth/pull/55))
- fix(migration): convert Mongoose pre-save hooks to async to resolve next is not a function on fresh deployments  ([#59](https://github.com/isolinear-labs/Neosynth/pull/59))

### Dependencies
- Bump `express-rate-limit` from 8.3.1 to 8.3.2 ([#51](https://github.com/isolinear-labs/Neosynth/pull/51))
- Bump `joi` from 18.1.1 to 18.1.2 ([#51](https://github.com/isolinear-labs/Neosynth/pull/51))
- Bump `stefanzweifel/git-auto-commit-action` from 5 to 7 ([#49](https://github.com/isolinear-labs/Neosynth/pull/49))
- Bump `actions/checkout` from 4 to 6 ([#50](https://github.com/isolinear-labs/Neosynth/pull/50))
- Bump `dotenv` from 17.3.1 to 17.4.2 ([#54](https://github.com/isolinear-labs/Neosynth/pull/54), [#58](https://github.com/isolinear-labs/Neosynth/pull/58))
- Bump `mongoose` from 9.3.3 to 9.5.0 ([#54](https://github.com/isolinear-labs/Neosynth/pull/54), [#62](https://github.com/isolinear-labs/Neosynth/pull/62))
- Bump `eslint` from 10.1.0 to 10.2.1 ([#53](https://github.com/isolinear-labs/Neosynth/pull/53), [#52](https://github.com/isolinear-labs/Neosynth/pull/52), [#61](https://github.com/isolinear-labs/Neosynth/pull/61), [#60](https://github.com/isolinear-labs/Neosynth/pull/60))
- Bump `sanitize-html` from 2.17.2 to 2.17.3 ([#62](https://github.com/isolinear-labs/Neosynth/pull/62))

## [v1.0.4] - 2026-03-28

### Bug Fixes
- (frontend/playlist) fixed playlistId not being set when saving playlists, preventing resume from loading full playlist context ([#30](https://github.com/isolinear-labs/Neosynth/pull/30))
- (backend/models) removed duplicate schema indexes on fields already declared with `unique: true` ([#46](https://github.com/isolinear-labs/Neosynth/pull/46))

### Dependencies
- (backend) upgraded Express 4 to Express 5 ([#41](https://github.com/isolinear-labs/Neosynth/pull/41))
- (backend/server) updated catch-all route to Express 5 wildcard syntax `/{*path}` ([#41](https://github.com/isolinear-labs/Neosynth/pull/41))
- (backend) upgraded express-rate-limit from  7.5.0 to 8.3.1 ([#43](https://github.com/isolinear-labs/Neosynth/pull/43))
- (backend) migrated express-rate-limit `max` option to `limit` for v8 compatibility ([#43](https://github.com/isolinear-labs/Neosynth/pull/43))
- (backend/ci) scoped npm security audit to production dependencies only, patched dev transitive vulnerabilities ([#44](https://github.com/isolinear-labs/Neosynth/pull/44))
- (backend/middleware) added error cause chaining to encryption and session auth for ESLint 10 compliance ([#45](https://github.com/isolinear-labs/Neosynth/pull/45))

## [v1.0.3a] - 2025-11-21

### Bug Fixes
- fix(helmnet) fixed an issue where tracks will not play in non-prod environments that were not using HTTPS ([#28](https://github.com/isolinear-labs/Neosynth/pull/28))

## [v1.0.3] - 2025-11-20

### Enhancements

### Bug Fixes
- fix(ssl) fixed a helmet bug that caused SSL errors when a env was defined as non-prod ([#24](https://github.com/isolinear-labs/Neosynth/pull/24))
- fix(helmnet)  fixed security headers and CSP directives for non-production HTTP environments ([#27](https://github.com/isolinear-labs/Neosynth/pull/27))

### Dependencies

## [v1.0.2a] - 2025-10-15

### Enhancements
- (admin/ff) removed the already released themes from the admin feature flag system  ([#12](https://github.com/isolinear-labs/Neosynth/pull/12))
- (admin/ff) removed the verbose console logging and moved it behind feature flag 'console_debug_logging'
- (backend/migration) added support for database migration mechanism  ([#13](https://github.com/isolinear-labs/Neosynth/pull/13))
- (frontend/links) added a link to our new subreddit ([#17](https://github.com/isolinear-labs/Neosynth/pull/17))
- (admin/ff) cleaned up feature flag logging to be more concise ([#17](https://github.com/isolinear-labs/Neosynth/pull/17))
- (backend/caching) implemented composite hash-based cache busting for CSS and JS assets ([#18](https://github.com/isolinear-labs/Neosynth/pull/18))
- (backend/caching) reduced static asset cache TTL from 24 hours to 1 hour for faster update propagation  ([#18](https://github.com/isolinear-labs/Neosynth/pull/18))

### Bug Fixes
- (mobile/resume) fixed race condition when resuming a track ([#16](https://github.com/isolinear-labs/Neosynth/pull/16))
- (mobile/css) fixed the mobile footer alignment after the reddit button was added ([#18](https://github.com/isolinear-labs/Neosynth/pull/18))
- (frontend/playlist) removed the playlist item '.' prefix that was preventing quick keyboard list navigation ([#19](https://github.com/isolinear-labs/Neosynth/pull/19))


## [v1.0.1] - 2025-9-30

### Enhancements

- (node/package-lock) added package-lock.json to version control  ([#8](https://github.com/isolinear-labs/Neosynth/pull/8))

### Bug Fixes

- (mobile/footer) corrected the mobile footer alignment to compensate for newly added Github button  ([#9](https://github.com/isolinear-labs/Neosynth/pull/9))

### Dependencies

## [v1.0.0] - 2025-09-28

Initial release of NeoSynth!