const exec = require('child_process').execSync;
const crypto = require('crypto');
const path = require('path');
const url = require('url');
const fs = require('fs');
const {parse_status} = require('git-get-status');

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

function getGitStatus(dir) {
    const cmd = 'git status --porcelain -b';
    console.log(`Running: ${cmd}`);
    try {
        const output = exec(cmd, { cwd: dir }).toString();
        return parse_status(output);
    } catch (e) {
        console.log(e);
        throw new Error(`Failed to get git status for ${dir}`);
    }
};

function clone(repo, dir) {
    if (!repo) {
        throw new Error(`Invalid repo: ${repo}`);
    }
    const cmd = `git clone "${repo}" "${dir}"`;
    console.log(`Running: ${cmd}`);
    try {
        exec(cmd);
    } catch (e) {
        console.log(e);
        throw new Error(`Failed to clone ${repo}`);
    }

}

function checkout(dir, version) {
    if (version === 'HEAD') {
        version = getDefaultBranch(dir);
    }
    const cmd = `git checkout ${version} -q`;
    console.log(`Running: ${cmd}`);
    try {
        exec(cmd, { cwd: dir });
    } catch (e) {
        console.log(e);
        throw new Error(`Failed to checkout ${version}`);
    }
}

function fetch(dir, cooldown) {
    if (isOnCooldown(dir, cooldown)) {
        // If the repo was updated in the last X minutes, don't pull it
        return;
    }
    markModified(dir);
    const cmd = `git fetch`;
    console.log(`Running: ${cmd}`);
    try {
        exec(cmd, { cwd: dir });
    } catch (e) {
        console.log(e);
        throw new Error(`Failed to fetch`);
    }
}

function pull(dir, cooldown) {
    if (isOnCooldown(dir, cooldown)) {
        // If the repo was updated in the last X minutes, don't pull it
        return;
    }
    markModified(dir);
    const cmd = `git pull`;
    console.log(`Running: ${cmd}`);
    try {
        exec(cmd, { cwd: dir });
    } catch (e) {
        console.log(e);
        throw new Error(`Failed to pull`);
    }
}

// function getHeadSHA(url) {
//     const cmd = `git ls-remote ${url} HEAD`;
//     console.log(`Running: ${cmd}`);
//     try {
//         const output = exec(cmd).toString();
//         const sha = output.split('\n')[1].split('\t')[0].trim();
//         return sha;
//     } catch (e) {
//         console.log(e);
//         throw new Error(`Failed to get HEAD SHA for ${url}`);
//     }
// }

function getDefaultBranch(dir) {
    // git rev-parse --abbrev-ref origin/HEAD
    const cmd = `git rev-parse --abbrev-ref origin/HEAD`;
    console.log(`Running: ${cmd}`);
    try {
        return exec(cmd, { cwd: dir }).toString().trim().replace(/^origin\//, '');
    } catch (e) {
        console.log(e);
        throw new Error(`Failed to get default branch for ${dir}`);
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

function isOnCooldown(dir, cooldown) {
    const stat = fs.statSync(dir);
    return Date.now() - stat.mtimeMs < 1000 * 60 * cooldown;
}

function markModified(dir) {
    fs.utimesSync(dir, new Date(Date.now()), new Date(Date.now()));
}

exports.makeGitURL = makeGitURL;
exports.clone = clone;
exports.checkout = checkout;
exports.getCachedRepoDir = getCachedRepoDir;
exports.fetch = fetch;
// exports.getHeadSHA = getHeadSHA;
exports.pull = pull;
exports.getGitStatus = getGitStatus;
exports.getDefaultBranch = getDefaultBranch;
exports.isOnCooldown = isOnCooldown;
