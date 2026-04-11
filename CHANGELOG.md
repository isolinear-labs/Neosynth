# Changelog

## [Unreleased]

### Enhancements

### Bug Fixes
- (frontend/resume) fixed mobile Resume playing from the wrong track/position — playlist now loads directly on the saved track, seeks before `play()` is called, resulting in a much smoother Resume experience ([#55](https://github.com/isolinear-labs/Neosynth/pull/55))

### Docs

### Dependencies
- Bump `express-rate-limit` from 8.3.1 to 8.3.2 ([#51](https://github.com/isolinear-labs/Neosynth/pull/51))
- Bump `joi` from 18.1.1 to 18.1.2 ([#51](https://github.com/isolinear-labs/Neosynth/pull/51))
- Bump `stefanzweifel/git-auto-commit-action` from 5 to 7 ([#49](https://github.com/isolinear-labs/Neosynth/pull/49))
- Bump `actions/checkout` from 4 to 6 ([#50](https://github.com/isolinear-labs/Neosynth/pull/50))
- Bump `dotenv` from 17.3.1 to 17.4.1 ([#54](https://github.com/isolinear-labs/Neosynth/pull/54))
- Bump `mongoose` from 9.3.3 to 9.4.1 ([#54](https://github.com/isolinear-labs/Neosynth/pull/54))
- Bump `eslint` from 10.1.0 to 10.2.0 ([#53](https://github.com/isolinear-labs/Neosynth/pull/53), [#52](https://github.com/isolinear-labs/Neosynth/pull/52))

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