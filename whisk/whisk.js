const glob = require("glob");
const path = require("path");
const fs = require("fs");
const { WhiskConfig } = require("./models.js");
const ts = require("typescript");

const JsonFileExtensions = [".json", ".material", ".templ", ".modl"];

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

/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 * Author: https://stackoverflow.com/a/34749873
 */
function isObject(item) {
  return item && typeof item === "object" && !Array.isArray(item);
}

/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 * Author: https://stackoverflow.com/a/34749873
 */
function mergeDeep(target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeDeep(target, ...sources);
}

function printDiagnostics(diagnostics) {
  diagnostics.forEach((diagnostic) => {
    if (diagnostic.file) {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start
      );
      const message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        "\n"
      );
      console.log(
        `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
      );
    } else {
      console.log(
        ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
      );
    }
  });
}

function whiskIt(dir, settings, module) {
  let debug = settings.debug;
  let whiskConfig;
  if (fs.existsSync(path.join(dir, "whisk.json"))) {
    whiskConfig = new WhiskConfig(
      JSON.parse(stripComments(fs.readFileSync(path.join(dir, "whisk.json"))))
    );``
  } else {
    whiskConfig = new WhiskConfig({});
  }
  // Map of path patterns to destinations
  const patterns = Object.keys(whiskConfig.copyToSource);
  for (const pattern of patterns) {
    const destination = whiskConfig.copyToSource[pattern];
    if (debug) {
    console.log('Destination: ' + destination);
    }
    const projectRoot = process.env.ROOT_DIR;
    filterFiles(dir, [pattern], [], (err, files) => {
      if (err) {
        throw new Error(err);
      }
      if (debug) {
        console.log('Files to copy: ', files);
      }
      files.forEach((file) => {
        const targetPath = path.join(projectRoot, destination, makeRelative(file, pattern));
        if (debug) {
          console.log('Target path: ' + targetPath);
        }
        if (fs.existsSync(targetPath)) {
          const existing = fs
            .readFileSync(targetPath, "utf8")
            .replaceAll("\r\n", "\n");
          const newJson = fs
            .readFileSync(path.join(dir, file), "utf8")
            .replaceAll("\r\n", "\n");
          if (existing !== newJson) {
            console.log(`Updating ${targetPath}`);
            fs.writeFileSync(targetPath, newJson);
          }
        } else {
          fs.mkdirSync(path.dirname(targetPath), { recursive: true });
          fs.copyFileSync(path.join(dir, file), targetPath);
        }
      });
    });
  }
  filterFiles(dir, whiskConfig.include, whiskConfig.exclude, (err, files) => {
    if (err) {
      throw new Error(err);
    }

    if (files.includes("config.json")) {
      const config = JSON.parse(
        stripComments(fs.readFileSync(path.join(dir, "config.json")))
      );
      // Setup default paths
      let bp = "./packs/BP";
      let rp = "./packs/RP";
      let dataPath = "./packs/data";
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
      if (
        config.regolith &&
        fs.existsSync(path.join(process.env.ROOT_DIR, "config.json"))
      ) {
        if (
          config.regolith.filterDefinitions &&
          config.regolith.profiles &&
          config.regolith.profiles.default &&
          config.regolith.profiles.default.filters
        ) {
          const projectConfig = JSON.parse(
            stripComments(
              fs.readFileSync(path.join(process.env.ROOT_DIR, "config.json"))
            )
          );
          let projectUsedFilters = [];
          for (const filter of Object.keys(
            projectConfig.regolith.filterDefinitions
          )) {
            if (
              projectConfig.regolith.filterDefinitions[filter].url &&
              Object.keys(projectConfig.regolith.profiles).some(
                (p) =>
                  projectConfig.regolith.profiles[p].filters &&
                  projectConfig.regolith.profiles[p].filters.some(
                    (f) => f.filter === filter
                  )
              )
            ) {
              projectUsedFilters.push(filter);
            }
          }
          let missingFilters = [];
          for (const filter of Object.keys(config.regolith.filterDefinitions)) {
            if (
              config.regolith.filterDefinitions[filter].url &&
              config.regolith.profiles.default.filters.some(
                (f) => f.filter === filter
              )
            ) {
              if (!projectUsedFilters.includes(filter)) {
                missingFilters.push(filter);
              }
            }
          }
          if (missingFilters.length > 0) {
            throw new Error(`Missing filters: ${missingFilters.join(", ")}`);
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
            targetPath = path.join("BP", absPath.replace(bp, ""));
          } else if (isPathWithin(absPath, rp)) {
            targetPath = path.join("RP", absPath.replace(rp, ""));
          } else if (isPathWithin(absPath, dataPath)) {
            targetPath = path.join("data", absPath.replace(dataPath, ""));
          }
          if (debug) {
            console.log(`Target path ${targetPath}`);
          }
          fs.mkdirSync(path.dirname(targetPath), { recursive: true });
          if (fs.existsSync(targetPath)) {
            if (JsonFileExtensions.includes(path.extname(targetPath))) {
              // Load both files as JSON and merge them
              console.log(`Merging ${targetPath} and ${absPath}`);
              const targetJson = JSON.parse(
                stripComments(fs.readFileSync(targetPath, "utf8"))
              );
              const sourceJson = JSON.parse(
                stripComments(fs.readFileSync(absPath, "utf8"))
              );
              mergeDeep(targetJson, sourceJson);
              fs.writeFileSync(targetPath, JSON.stringify(targetJson, null, 4));
            } else {
              console.log(`Skipping ${targetPath}, as it already exists`);
            }
          } else {
            fs.copyFileSync(absPath, targetPath);
          }
        }
      }
    }
  });
}

function stripComments(input) {
  // Convert the input to a string (handles numbers, objects, etc.)
  const str = String(input);

  return str.replace(
    /("(?:(?:\\.)|[^"\\])*")|('(?:(?:\\.)|[^'\\])*')|(\/\*[\s\S]*?\*\/)|(\/\/.*$)/gm,
    (match, doubleQuoted, singleQuoted, blockComment, lineComment) => {
      // If the match is a string literal, return it unchanged.
      if (doubleQuoted || singleQuoted) {
        return match;
      }
      // Otherwise, it’s a comment – remove it.
      return "";
    }
  );
}

function getBaseFromPattern(pattern) {
  // Look for the first occurrence of a wildcard character
  const wildcardIndex = pattern.search(/[*?]/);
  if (wildcardIndex === -1) {
    // No wildcards: return the directory portion of the pattern
    const lastSlashIndex = pattern.lastIndexOf('/');
    return lastSlashIndex === -1 ? '' : pattern.slice(0, lastSlashIndex + 1);
  } else {
    // There is a wildcard.
    // Take the substring before the wildcard and then find the last slash.
    const beforeWildcard = pattern.slice(0, wildcardIndex);
    const lastSlashIndex = beforeWildcard.lastIndexOf('/');
    return lastSlashIndex === -1 ? '' : pattern.slice(0, lastSlashIndex + 1);
  }
}

function makeRelative(filePath, pattern) {
  const base = getBaseFromPattern(pattern);
  // If filePath starts with the base, remove it.
  return filePath.startsWith(base) ? filePath.slice(base.length) : filePath;
}

exports.whiskIt = whiskIt;
