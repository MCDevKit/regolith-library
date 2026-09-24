import { createRequire } from "module";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

// @minecraft/creator-tools ships its library as CommonJS under lib/, so we
// pull the pieces we need via require() and unwrap the default exports.
const require = createRequire(import.meta.url);
const lib = (mod) => {
  const m = require("@minecraft/creator-tools/lib/" + mod);
  return m && m.default ? m.default : m;
};

const ClUtils = lib("cli/ClUtils.js");
const CreatorToolsHost = lib("app/CreatorToolsHost.js");
const { HostType } = require("@minecraft/creator-tools/lib/app/CreatorToolsHost.js");
const { TaskType } = require("@minecraft/creator-tools/lib/cli/ClUtils.js");
const LocalEnvironment = lib("local/LocalEnvironment.js");
const ImageCodecNode = lib("local/ImageCodecNode.js");
const StorageUtilities = lib("storage/StorageUtilities.js");
const ProjectInfoSet = lib("info/ProjectInfoSet.js");
const { ResourceConsumptionConstraint } = require("@minecraft/creator-tools/lib/info/ProjectInfoSet.js");
const ProjectInfoUtilities = lib("info/ProjectInfoUtilities.js");
const { InfoItemType } = require("@minecraft/creator-tools/lib/info/IInfoItemData.js");

const AnnoyanceNone = "none";
const AnnoyanceAlert = "alert";

const LevelMap = {
  error: InfoItemType.error,
  warning: InfoItemType.warning,
  info: InfoItemType.info,
  recommendation: InfoItemType.recommendation,
};

const FieldMap = {
  level: "iTp",
  error: "gId",
  id: "gIx",
  // All other fields are the same.
};

const defaultSettings = {
  suite: "addon",
  exclusions: [],
  annoyance: AnnoyanceNone,
  failOnError: false,
  logOverrides: [],
  outputFolder: "./mct-output/",
};
const settings = Object.assign({}, defaultSettings, JSON.parse(process.argv[2] || "{}") || {});

function windowsAlert(message, title = "Alert") {
  if (process.platform !== "win32") {
    return;
  }
  const escape = (s) => String(s).replace(/'/g, "''");
  const psCommand =
    `[void][System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms');` +
    `[System.Windows.Forms.MessageBox]::Show('${escape(message)}', '${escape(title)}')`;
  exec(`powershell -NoProfile -Command "${psCommand}"`, (err) => {
    if (err) console.error(err);
  });
}

function toLevel(value) {
  return typeof value === "string" ? LevelMap[value] : value;
}

function applyLogOverrides(items) {
  for (const { match, override } of settings.logOverrides || []) {
    if (!match || !override) continue;
    for (const item of items) {
      let matched = true;
      for (const [key, val] of Object.entries(match)) {
        const field = FieldMap[key] || key;
        const expected = key === "level" ? toLevel(val) : val;
        if (item[field] !== expected) {
          matched = false;
          break;
        }
      }
      if (!matched) continue;
      for (const [key, val] of Object.entries(override)) {
        const field = FieldMap[key] || key;
        item[field] = key === "level" ? toLevel(val) : val;
      }
    }
  }
}

function writeReports(outputFolder, baseName, pis, pisData, suffix) {
  fs.mkdirSync(outputFolder, { recursive: true });
  const base = path.join(outputFolder, StorageUtilities.ensureFileNameIsSafe(baseName) + suffix);
  fs.writeFileSync(base + ".report.html", pis.getReportHtml(baseName, undefined, undefined));
  fs.writeFileSync(base + ".csv", ProjectInfoSet.CommonCsvHeader + "\n" + pis.getItemCsvLines().join("\n"));
  const data = Object.assign({}, pisData, { index: undefined });
  fs.writeFileSync(base + ".mcr.json", JSON.stringify(data, null, 2));
}

function metaState(project, pis, suite) {
  return {
    projectContainerName: project.containerName,
    projectPath: project.projectFolder?.storageRelativePath,
    projectName: project.name,
    projectTitle: project.title,
    infoSetData: pis.getDataObject(),
    suite: suite,
  };
}

async function runValidation() {
  const inputFolder = process.cwd();
  const outputFolder = settings.outputFolder ? path.resolve(inputFolder, settings.outputFolder) : undefined;

  if (outputFolder) {
    fs.rmSync(outputFolder, { recursive: true, force: true });
  }

  const localEnv = new LocalEnvironment(true);

  CreatorToolsHost.hostType = HostType.toolsNodejs;
  CreatorToolsHost.decodePng = ImageCodecNode.decodePng;
  CreatorToolsHost.encodeToPng = ImageCodecNode.encodeToPng;

  // The library resolves bundled data (res/, data/) relative to its own
  // location, which only works for the bundled CLI. Point it at the package
  // root explicitly so schemas and forms load from disk.
  const packageRoot = path.dirname(require.resolve("@minecraft/creator-tools/package.json"));
  const creatorTools = ClUtils.getCreatorTools(localEnv, packageRoot);
  if (!creatorTools) {
    throw new Error("Could not initialize Minecraft Creator Tools.");
  }

  await creatorTools.load();
  creatorTools.onStatusAdded.subscribe(ClUtils.handleStatusAdded);

  const workFolder = await ClUtils.getMainWorkFolder(TaskType.validate, inputFolder, undefined);
  const name = StorageUtilities.getLeafName(workFolder.fullPath);

  const project = ClUtils.createProject(creatorTools, {
    ctorProjectName: name,
    localFolderPath: workFolder.fullPath,
    accessoryFiles: [],
  });
  project.readOnlySafety = true;

  await project.inferProjectItemsFromFiles();

  const suiteName = String(settings.suite || "default");
  const exclusions = Array.isArray(settings.exclusions)
    ? settings.exclusions
    : String(settings.exclusions || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  const suite = ProjectInfoSet.getSuiteFromString(suiteName);
  const pis = new ProjectInfoSet(
    project,
    suite,
    exclusions.length ? exclusions : undefined,
    undefined,
    undefined,
    undefined,
    true
  );
  pis.constrainResourceConsumption = ResourceConsumptionConstraint.medium;

  await pis.generateForProject();

  const states = [metaState(project, pis, suite)];

  if (outputFolder) {
    writeReports(outputFolder, project.containerName, pis, states[0].infoSetData, "");
  }

  // "all" mirrors the CLI: run the default suite plus every derived suite
  // (addon if the project is an add-on, sharing, and currentplatform).
  if (suiteName.toLowerCase() === "all") {
    const derived = await ProjectInfoUtilities.getDerivedStates(project, states[0].infoSetData);
    states.push(...derived);
  }

  pis.disconnectFromProject();
  project.dispose();

  return states;
}

// Regolith's data/ folder is not part of the pack, so anything reported
// against it (either by pack path or by absolute path) is noise.
const dataFolderPrefix = path.join(process.cwd(), "data") + path.sep;
function isRegolithDataItem(item) {
  if (item.p && item.p.startsWith("/data/")) return true;
  if (typeof item.d === "string" && item.d.startsWith(dataFolderPrefix)) return true;
  return false;
}

function report(states) {
  let hasErrors = false;
  const groupedErrors = new Map();

  for (const state of states) {
    const data = state.infoSetData;
    const items = data.items || [];

    applyLogOverrides(items);

    for (const item of items) {
      // testCompleteFail items are just per-test summaries ("Found N errors in
      // X check"), the actual errors are listed separately, so skip them.
      const isError = item.iTp === InfoItemType.error || item.iTp === InfoItemType.internalProcessingError;
      if (!isError) continue;
      if (isRegolithDataItem(item)) continue;

      const key = ProjectInfoSet.getEffectiveMessageFromData(data, item) || item.gId + ":" + item.gIx;
      let arr = groupedErrors.get(key);
      if (!arr) {
        arr = [];
        groupedErrors.set(key, arr);
      }
      if (item.p) {
        arr.push(item.d !== undefined ? item.p + " (" + item.d + ")" : item.p);
      } else if (item.d !== undefined) {
        arr.push(String(item.d));
      }
      hasErrors = true;
    }
  }

  for (const [key, value] of groupedErrors) {
    console.error(key + ":");
    for (const item of value) {
      console.error("\t" + item);
      if (settings.annoyance === AnnoyanceAlert) {
        windowsAlert(key + ": " + item, key);
      }
    }
  }

  return hasErrors;
}

(async () => {
  let hasErrors = false;
  try {
    const states = await runValidation();
    hasErrors = report(states);
  } catch (e) {
    console.error(e && e.stack ? e.stack : String(e));
    process.exit(1);
  }
  if (hasErrors && settings.failOnError) {
    process.exit(1);
  }
})();
