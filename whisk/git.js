const exec = require('child_process').execSync;
const crypto = require('crypto');
const path = require('path');
const url = require('url');
const fs = require('fs');

const GitHubPathPattern = /^\/?[^/]+\/[^/]+(\/[^/]*)?$/;

function makeGitURL(repo) {
    if (!repo) {
        return null;
    }
    if (repo.match(GitHubPathPattern)) {
        if (repo.startsWith('/')) {
            repo = repo.substring(1);
        }
        if (repo.endsWith('/')) {
            repo = repo.substring(0, repo.length - 1);
        }
        repo = `https://github.com/${repo}`;
    }
    if (repo.startsWith('http://') || repo.startsWith('https://')) {
        let parsed = new url.URL(repo);
        let parts = parsed.pathname.split('/');
        if (parts.length > 4 || parts.length < 3) {
            return null;
        }
        if (parts.length === 3) {
            return [repo, null];
        }
        parsed.pathname = path.dirname(path.normalize(parsed.pathname));
        return [parsed.toString(), parts[3]];
    }
    return null;
}

function clone(repo, dir) {
    if (!repo) {
        throw new Error(`Invalid repo: ${repo}`);
    }
    const cmd = `git clone ${repo} ${dir}`;
    console.log(`Running: ${cmd}`);
    try {
        exec(cmd);
    } catch (e) {
        console.log(e);
        throw new Error(`Failed to clone ${repo}`);
    }

}

function checkout(dir, version, url) {
    if (version === 'HEAD') {
        version = getHeadSHA(url);
    }
    const cmd = `git checkout ${version}`;
    console.log(`Running: ${cmd}`);
    try {
        exec(cmd, { cwd: dir });
    } catch (e) {
        console.log(e);
        throw new Error(`Failed to checkout ${version}`);
    }
}

function fetch(dir, cooldown) {
    const stat = fs.statSync(dir);
    if (stat.mtimeMs > Date.now() - 1000 * 60 * cooldown) {
        // If the repo was updated in the last X minutes, don't fetch
        return;
    }
    fs.utimesSync(dir, Date.now(), Date.now());
    const cmd = `git fetch`;
    console.log(`Running: ${cmd}`);
    try {
        exec(cmd, { cwd: dir });
    } catch (e) {
        console.log(e);
        throw new Error(`Failed to checkout ${version}`);
    }
}

function getHeadSHA(url) {
    const cmd = `git ls-remote ${url} HEAD`;
    console.log(`Running: ${cmd}`);
    try {
        const output = exec(cmd).toString();
        const sha = output.split('\n')[1].split('\t')[0].trim();
        return sha;
    } catch (e) {
        console.log(e);
        throw new Error(`Failed to get HEAD SHA for ${url}`);
    }
}

function hashString(str) {
    // Create MD5 hash of the repo URL
    const hash = crypto.createHash('md5');
    hash.update(str);
    return hash.digest('hex');
}

function getCachedRepoDir(repo) {
    const hash = hashString(repo);
    return path.join(process.env.ROOT_DIR, `.whisk/cache/${hash}`);
}

exports.makeGitURL = makeGitURL;
exports.clone = clone;
exports.checkout = checkout;
exports.getCachedRepoDir = getCachedRepoDir;
exports.fetch = fetch;
exports.getHeadSHA = getHeadSHA;