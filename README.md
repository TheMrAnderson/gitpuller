# GitPuller

A Node.js cross-platform CLI tool to automatically pull updates for specified development branches in multiple git repositories, configurable per repository.

## Installation

1. Ensure Node.js is installed.
2. Clone or download this project.
3. Run `npm install` to install dependencies (including ESLint for linting).

## Development

- Run `npm run lint` to check code style with ESLint.
- Run `npm run lint:fix` to automatically fix linting issues.
- The project uses `.editorconfig` for consistent formatting. Ensure your editor supports it.

## Usage

After installing globally (`npm install -g @themranderson/gitpuller`), run:

```bash
gitpuller
```

Or locally:

```bash
npm start
# or
node index.js
```

To specify a custom config file:

```bash
gitpuller --config /path/to/my-config.json
```

For help:

```bash
gitpuller --help
```

## Publishing

This package is automatically published to npm via GitHub Actions on pushes to the `master` branch as `@themranderson/gitpuller`. To set up publishing:

1. Create an npm account if you don't have one.
2. Generate an access token with publish permissions.
3. Add the token as `NPM_TOKEN` in your repository's secrets (Settings > Secrets and variables > Actions).

## Configuration

Edit `config.json`:

- `rootPath`: The root directory containing your git repositories.
- `repos`: An object mapping repository folder names to their development branch names.
- `additionalRepos` (optional): An array of objects with `path` and `branch` for repos outside `rootPath`.
- `switchToBranch` (optional): Boolean, default `false`. If `true`, switch to the configured branch if not already on it (with stashing and popping).

Example:

```json
{
  "rootPath": "/path/to/your/repos",
  "switchToBranch": true,
  "repos": {
    "my-repo": "main",
    "another-repo": "develop"
  },
  "additionalRepos": [
    {
      "path": "/full/path/to/repo/folder",
      "branch": "main"
    }
  ]
}
```

## Usage

Run the tool:

```bash
npm start
```

Or:

```bash
node index.js
```

The tool will:

- Scan for git repositories under `rootPath` (up to depth 2).
- For each repository listed in `repos`, switch to the specified branch (stashing changes if necessary), pull updates if available, and switch back.

## Behavior

- Only configured repositories are processed.
- If you're already on the development branch, it will pull if there are remote changes.
- If on a different branch, it stashes local changes, switches to the dev branch, pulls, switches back, and pops the stash.
- Errors are logged but don't stop processing other repos.

## Cross-Platform

Works on Windows, Linux, and macOS, using Node.js built-in modules.