import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const rootDir = process.env.ROOT_DIR || process.cwd();
const outputDir = path.join('data', 'git_metadata');
const outputFile = path.join(outputDir, 'meta.json');

function runGit(command) {
    try {
        const result = execSync(command, {
            cwd: rootDir,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
            env: process.env,
        }).trim();
        return result.length ? result : null;
    } catch (error) {
        return null;
    }
}

const info = {};
const commit = runGit('git rev-parse HEAD');
if (commit) {
    info.commit = commit;
}
const tag = runGit('git describe --tags --exact-match');
if (tag) {
    info.tag = tag;
}
const branch = runGit('git rev-parse --abbrev-ref HEAD');
if (branch && branch !== 'HEAD') {
    info.branch = branch;
}
const status = runGit('git status --short');
if (status !== null) {
    info.dirty = status.length > 0;
}

if (!Object.prototype.hasOwnProperty.call(info, 'commit')) {
    console.warn('git_metadata: Unable to determine current git commit. Skipping write.');
    process.exit(0);
}

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputFile, JSON.stringify(info, null, 4) + '\n');
console.log('git_metadata: wrote ' + path.relative(rootDir, outputFile));
