const process = require("process");
const fs = require("fs");
const path = require("path");
const { Settings } = require("./models.js");
const { clone, checkout, getCachedRepoDir, makeGitURL, fetch } = require("./git.js");
const { whiskIt } = require("./whisk.js");

// Big-ass try catch, to hide stack traces, when not in debug mode
const args = process.argv.slice(2);
const settings = new Settings(JSON.parse(args[0]));
settings.debug = settings.debug | process.env.DEBUG;
try {

    // Ensure that the data directory exists
    if (!fs.existsSync(path.join(process.env.ROOT_DIR, `.whisk/cache`))) {
        fs.mkdirSync(path.join(process.env.ROOT_DIR, `.whisk/cache`), { recursive: true });
        fs.writeFileSync(path.join(process.env.ROOT_DIR, `.whisk/cache/.gitignore`), "cache");
    }

    // Copy all modules
    for (const module of settings.modules) {
        const dir = getCachedRepoDir(module.name, module.version);
        const data = makeGitURL(module.name);
        if (!data) {
            console.log(`Invalid repo: ${module.name}`);
            continue;
        }
        const [url, target] = data;
        if (!fs.existsSync(dir)) {
            clone(url, dir);
            checkout(dir, module.version);
        } else {
            try {
                fetch(dir);
                checkout(dir, module.version);
            } catch (e) {
                console.log(`Failed to checkout ${module.version} for ${module.name}`);
                console.log("Removing cache and cloning again...");
                fs.rmSync(dir, { recursive: true });
                clone(url, dir);
                checkout(dir, module.version);
            }
        }
        if (target) {
            if (!fs.existsSync(path.join(dir, target))) {
                throw new Error(`Module ${module.name} does not have a target directory ${target}`);
            }
            whiskIt(path.join(dir, target), settings, module);
        } else {
            whiskIt(dir, settings, module);
        }
    }
} catch (e) {
    if (settings.debug) {
        console.error(e);
    } else {
        console.error(e.message);
    }
    process.exit(1);
}
