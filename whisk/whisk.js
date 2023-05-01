const glob = require('glob');
const path = require('path');
const fs = require('fs');
const { WhiskConfig } = require('./models.js');

function filterFiles(directory, includePatterns, excludePatterns, callback) {
    const includedFiles = new Set();

    const processPattern = (pattern, isExclude, done) => {
        glob(pattern, { cwd: directory }, (err, files) => {
            if (err) {
                done(err);
                return;
            }

            files.forEach((file) => {
                if (isExclude) {
                    includedFiles.delete(file);
                } else {
                    includedFiles.add(file);
                }
            });

            done();
        });
    };

    const processPatterns = (patterns, isExclude, done) => {
        let remaining = patterns.length;

        if (remaining === 0) {
            done();
            return;
        }

        patterns.forEach((pattern) => {
            processPattern(pattern, isExclude, (err) => {
                if (err) {
                    done(err);
                    return;
                }

                remaining--;

                if (remaining === 0) {
                    done();
                }
            });
        });
    };

    processPatterns(includePatterns, false, (err) => {
        if (err) {
            callback(err);
            return;
        }

        processPatterns(excludePatterns, true, (err) => {
            if (err) {
                callback(err);
                return;
            }

            callback(null, Array.from(includedFiles));
        });
    });
}

function isPathWithin(child, ...parents) {
    for (const parent of parents) {
        if (child.startsWith(parent)) {
            return true;
        }
    }
    return false;
}

function whiskIt(dir, settings, module) {
    let debug = settings.debug;
    let whiskConfig;
    if (fs.existsSync(path.join(dir, 'whisk.json'))) {
        whiskConfig = new WhiskConfig(JSON.parse(fs.readFileSync(path.join(dir, 'whisk.json'))));
    } else {
        whiskConfig = new WhiskConfig({});
    }
    filterFiles(dir, whiskConfig.include, whiskConfig.exclude, (err, files) => {
        if (err) {
            throw new Error(err);
        }

        if (files.includes('config.json')) {
            const config = JSON.parse(fs.readFileSync(path.join(dir, 'config.json')));
            // Setup default paths
            let bp = './packs/BP';
            let rp = './packs/RP';
            let dataPath = './packs/data';
            if (config.packs) {
                if (config.packs.behaviorPack) {
                    bp = config.packs.behaviorPack;
                }
                if (config.packs.resourcePack) {
                    rp = config.packs.resourcePack;
                }
            }
            if (config.regolith && config.regolith.dataPath) {
                dataPath = config.regolith.dataPath;
            }
            bp = path.normalize(path.join(dir, bp));
            rp = path.normalize(path.join(dir, rp));
            dataPath = path.normalize(path.join(dir, dataPath));
            // Check filters
            if (config.regolith && fs.existsSync(path.join(process.env.ROOT_DIR, 'config.json'))) {
                if (config.regolith.filterDefinitions && config.regolith.profiles && config.regolith.profiles.default && config.regolith.profiles.default.filters) {
                    const projectConfig = JSON.parse(fs.readFileSync(path.join(process.env.ROOT_DIR, 'config.json')));
                    let projectUsedFilters = [];
                    for (const filter of Object.keys(projectConfig.regolith.filterDefinitions)) {
                        if (projectConfig.regolith.filterDefinitions[filter].url && Object.keys(projectConfig.regolith.profiles).some((p) => projectConfig.regolith.profiles[p].filters && projectConfig.regolith.profiles[p].filters.some((f) => f.filter === filter))) {
                            projectUsedFilters.push(filter);
                        }
                    }
                    let missingFilters = [];
                    for (const filter of Object.keys(config.regolith.filterDefinitions)) {
                        if (config.regolith.filterDefinitions[filter].url && config.regolith.profiles.default.filters.some((f) => f.filter === filter)) {
                            if (!projectUsedFilters.includes(filter)) {
                                missingFilters.push(filter);
                            }
                        }
                    }
                    if (missingFilters.length > 0) {
                        throw new Error(`Missing filters: ${missingFilters.join(', ')}`);
                    }
                }
            }
            // Copy files
            for (const file of files) {
                if (fs.statSync(path.join(dir, file)).isDirectory()) {
                    continue;
                }
                const absPath = path.normalize(path.join(dir, file));
                if (isPathWithin(absPath, bp, rp, dataPath)) {
                    if (debug) {
                        console.log(`Copying ${module.name}:${file}`);
                    }
                    let targetPath;
                    // Fix this code
                    if (isPathWithin(absPath, bp)) {
                        targetPath = path.join('BP', absPath.replace(bp, ''))
                    } else if (isPathWithin(absPath, rp)) {
                        targetPath = path.join('RP', absPath.replace(rp, ''))
                    } else if (isPathWithin(absPath, dataPath)) {
                        targetPath = path.join('data', absPath.replace(dataPath, ''))
                    }
                    if (debug) {
                        console.log(`Target path ${targetPath}`);
                    }
                    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
                    fs.copyFileSync(absPath, targetPath);
                }
            }
        }
    });
}

exports.whiskIt = whiskIt;
