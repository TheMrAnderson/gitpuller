#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let configPath = 'config.json';
if (process.argv[2] === '--config' && process.argv[3]) {
  configPath = process.argv[3];
} else if (process.argv[2] === '--help' || process.argv[2] === '-h') {
  console.log('Usage: node index.js [--config <config.json>]');
  process.exit(0);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const rootPath = config.rootPath;
const repoBranchOverrides = config.repos || {};
const excludedRepos = new Set((config.excludeRepos || []).map(repo => repo.toLowerCase()));
const additionalRepos = config.additionalRepos || [];
const switchToBranch = config.switchToBranch === true; // default false

function getGitRepos(basePath) {
  let repos = [];
  function scan(dir) {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {

          if (item === '.git') {
            repos.push(path.dirname(fullPath));
            return;
          } else if (!['node_modules', '.git', '$RECYCLE.BIN', 'System Volume Information', 'Temp', 'tmp', 'Windows', 'Program Files', 'ProgramData'].some(exclude => fullPath.includes(exclude))) {
            const depth = fullPath.split(path.sep).length - basePath.split(path.sep).length;
            if (depth <= 2) {
              scan(fullPath);
            }
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }
  scan(basePath);
  return repos;
}

function getConfiguredBranch(repoName) {
  const configKey = Object.keys(repoBranchOverrides).find(
    key => key.toLowerCase() === repoName.toLowerCase()
  );
  return configKey ? repoBranchOverrides[configKey] : null;
}

function getStandardBranch(repoPath) {
  const options = { cwd: repoPath, stdio: 'pipe' };
  const branches = execSync('git branch --format="%(refname:short)"', options)
    .toString()
    .split('\n')
    .map(branch => branch.trim());

  return ['main', 'master'].find(branch => branches.includes(branch)) || null;
}

function getBranch(repoName, repoPath) {
  return getConfiguredBranch(repoName) || getStandardBranch(repoPath);
}

function isExcludedRepo(repoName) {
  return excludedRepos.has(repoName.toLowerCase());
}

function handleRepo(name, repoPath, branch) {
  if (!branch) {
    process.stdout.write(`Skipping ${name}: no branch configured and no main/master branch found\n`);
    return;
  }

  process.stdout.write(`Handling ${name}...`);
  const options = { cwd: repoPath, stdio: 'pipe' };
  try {
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', options).toString().trim();
    const remotes = execSync('git remote', options).toString().trim();
    if (!remotes) {
      process.stdout.write(' has no remotes, skipping\n');
      return;
    }

    if (!switchToBranch && currentBranch !== branch) {
      process.stdout.write(` not on ${branch} branch, skipping\n`);
      return;
    }

    let stashed = false;

    if (currentBranch !== branch) {
      const status = execSync('git status --porcelain', options).toString();

      if (status.trim()) {
        execSync('git stash save --include-untracked', options);
        stashed = true;
      }
      execSync(`git checkout ${branch}`, options);
    }
    execSync('git remote update', options);
    const statusUno = execSync('git status -uno', options).toString();
    let statusMessage = 'up to date';
    if (!statusUno.includes('up to date')) {
      execSync(`git pull origin ${branch}`, options);
      statusMessage = 'pulled changes';
    }
    if (currentBranch !== branch) {
      execSync(`git checkout ${currentBranch}`, options);
      if (stashed) {
        execSync('git stash pop', options);
      }
    }
    process.stdout.write(` ${statusMessage}\n`);
  } catch (e) {
    console.error(`Error in ${name}: ${e.message}`);
  }
}

console.log('GitPuller starting...');
const repoList = getGitRepos(rootPath);

console.log(`Found ${repoList.length} repos`);
for (const repo of repoList) {
  const repoName = path.basename(repo);
  if (isExcludedRepo(repoName)) {
    console.log(`Skipping ${repoName}: excluded by config`);
    continue;
  }
  handleRepo(repoName, repo, getBranch(repoName, repo));
}

for (const addRepo of additionalRepos) {
  const repoPath = addRepo.path;
  const repoName = path.basename(repoPath);
  if (isExcludedRepo(repoName)) {
    console.log(`Skipping ${repoName}: excluded by config`);
    continue;
  }
  if (fs.existsSync(path.join(repoPath, '.git'))) {
    handleRepo(repoName, repoPath, addRepo.branch || getBranch(repoName, repoPath));
  } else {
    console.log(`Skipping ${repoName}: not a git repository`);
  }
}

console.log('Finished');
