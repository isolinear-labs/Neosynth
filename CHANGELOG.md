# Changelog

## [Unreleased]

### Enhancements

### Bug Fixes
- fix(ssl) fixed a helmet bug that caused SSL errors when a env was defined as non-prod ([#24](https://github.com/isolinear-labs/Neosynth/pull/24))

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