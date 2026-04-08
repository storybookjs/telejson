## Release Process

- Use Changesets for release notes, versioning, and release PRs.
- Add release notes in `.changeset/*.md` for every publishable change.
- The release workflow runs on `master` and publishes through `changesets/action` with the Storybook bot app token.
- Preview packages are published from `publish-preview.yml` with `pkg-pr-new`.
- Keep `publishConfig.provenance` enabled for npm trusted publishing.
