# Contributing

## Development

```
npm install
npm run build
npm test
npm run lint
npm run typecheck
```

To smoke-test the extension locally, run `npm run package` to produce a `.vsix` file, then install it in VS Code via **Extensions → Install from VSIX…**.

## CI

Every push to `main` and every pull request runs the full quality suite (lint, type-check, tests, build, package) across macOS, Ubuntu, and Windows on Node.js 20. All matrix combinations must pass before a PR can merge — branch protection points at the `all-checks` aggregator job.

## Releasing

1. Make sure all changes intended for the release are merged to `main`.
2. Update `CHANGELOG.md` with the release notes under a new `## [x.y.z]` heading.
3. Bump the version in `package.json` to `x.y.z` and commit (`chore: bump version to x.y.z`).
4. Push the commit to `main`, then push a tag:
   ```
   git tag vx.y.z
   git push origin vx.y.z
   ```
5. The release workflow creates a GitHub release automatically, attaches the `.vsix` as a release asset, and populates release notes from commits since the previous tag.
6. Download the `.vsix` from the GitHub release, then publish it to the marketplace:
   ```
   vsce publish --packagePath markdown-to-medium-vscode-x.y.z.vsix
   ```
   This requires a valid `VSCE_PAT` environment variable (Azure DevOps Personal Access Token with Marketplace publish scope).
