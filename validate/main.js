import CartoApp, { HostType } from "@minecraft/creator-tools/app/CartoApp.js";

import { createRequire } from "module";
const require = createRequire(import.meta.url);
function defaultImport(mod) {
  return mod && mod.default ? mod.default : mod;
}
const StorageUtilitiesModule = require("@minecraft/creator-tools/storage/StorageUtilities");
const StorageUtilities = defaultImport(StorageUtilitiesModule);
const LocalEnvironmentModule = require("@minecraft/creator-tools/local/LocalEnvironment");
const LocalEnvironment = defaultImport(LocalEnvironmentModule);
const ClUtilsModule = require("@minecraft/creator-tools/cli/ClUtils.js");
const ClUtils = defaultImport(ClUtilsModule);
const { OutputType, TaskType } = ClUtilsModule;
const { InfoItemType } = require("@minecraft/creator-tools/info/IInfoItemData.js");
import { exec } from "child_process";
import fs from 'fs';
let executeTask;
try {
  // Let's reuse the expose function to get the executeTask function.
  require("threads/worker").expose = (fn) => {
    executeTask = fn;
  };
} catch (e) {
  // ignore if this fails
}
require("@minecraft/creator-tools/cli/TaskWorker.js");

const AnnoyanceNone = "none";
const AnnoyanceAlert = "alert";

const LevelMap = {
  "error": InfoItemType.error,
  "warning": InfoItemType.warning,
  "info": InfoItemType.info,
}

const FieldMap = {
  "level": "iTp",
  "error": "gId",
  "id": "gIx",
  // All other fields are the same.
}

const defaultSettings = {
  suite: "addon",
  annoyance: AnnoyanceNone,
  failOnError: false,
  logOverrides: [],
};
const settings = Object.assign(
  {},
  defaultSettings,
  (JSON.parse(process.argv[2] || "{}") || {}),
);

function windowsAlert(message, title = "Alert") {
  // Check if the OS is Windows
  if (process.platform !== "win32") {
    return;
  }
  const psCommand =
    `[void][System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms');` +
    `[System.Windows.Forms.MessageBox]::Show('${message}', '${title}')`;
  exec(
    `powershell -NoProfile -Command "${psCommand}"`,
    (err, stdout, stderr) => {
      if (err) console.error(err);
    }
  );
}

CartoApp.hostType = HostType.toolsNodejs;

let carto;
let mainProject;
let localEnv;
let suite = settings.suite;
let exclusionList;
let outputType;

let executionTaskType = TaskType.noCommand;

let inputFolder = "./";
let outputFolder = "./mct-output/";

// Clean output folder
fs.rmSync(outputFolder, { recursive: true, force: true });

localEnv = new LocalEnvironment(true);

(async () => {
  carto = ClUtils.getCarto(localEnv);

  if (!carto) {
    return;
  }

  await carto.load();

  carto.onStatusAdded.subscribe(ClUtils.handleStatusAdded);

  await loadProjects();

  await validate();
})();

async function loadProjects() {
  if (!carto || !carto.ensureLocalFolder) {
    throw new Error("Not properly configured.");
  }

  const additionalFiles = [];

  const workFolder = await ClUtils.getMainWorkFolder(
    executionTaskType,
    inputFolder,
    outputFolder
  );

  const name = StorageUtilities.getLeafName(workFolder.fullPath);

  // just assume this folder is a big single project then.
  mainProject = {
    ctorProjectName: name,
    accessoryFiles: additionalFiles.slice(),
    localFolderPath: workFolder.fullPath,
  };
}

async function validate() {
  if (!carto || !localEnv) {
    return;
  }

  const result = await executeTask({
    task: TaskType.validate,
    project: mainProject,
    arguments: {
      suite: suite,
      exclusionList: exclusionList,
      outputMci: outputType === OutputType.noReports ? true : false,
      outputType: outputType,
    },
    outputFolder: outputFolder,
    inputFolder: inputFolder,
    displayInfo: localEnv.displayInfo,
    displayVerbose: localEnv.displayVerbose,
  });
  if (result !== undefined) {
    // Apply log overrides based on settings.logOverrides
    if (settings.logOverrides && settings.logOverrides.length) {
      for (const ovr of settings.logOverrides) {
        const { match, override: ov } = ovr;
        for (const item of result[0].infoSetData.items) {
          let matched = true;
          for (const [key, val] of Object.entries(match)) {
            const field = FieldMap[key] || key;
            let itemVal = item[field];
            let matchVal = val;
            if (key === 'level') {
              matchVal = typeof matchVal === 'string' ? LevelMap[matchVal] : matchVal;
            }
            if (itemVal !== matchVal) {
              matched = false;
              break;
            }
          }
          if (!matched) continue;
          for (const [key, val] of Object.entries(ov)) {
            const field = FieldMap[key] || key;
            let newVal = val;
            if (key === 'level') {
              newVal = typeof newVal === 'string' ? LevelMap[newVal] : newVal;
            }
            item[field] = newVal;
          }
        }
      }
    }
    let hasErrors = false;
    const groupedErrors = new Map();
    result[0].infoSetData.items
      .filter(
        (item) =>
          item.iTp === InfoItemType.error &&
          (!item.p || !item.p.startsWith("/data/"))
      )
      .forEach((x) => {
        const key =
          result[0].infoSetData.info.summary[x.gId][x.gIx].defaultMessage;
        let arr = groupedErrors.get(key);
        if (!arr) {
          arr = [];
          groupedErrors.set(key, arr);
        }
        if (x.p) {
          if (x.d) {
            arr.push(x.p + " (" + x.d + ")");
          } else {
            arr.push(x.p);
          }
        } else if (x.d) {
          arr.push(x.d);
        }
        hasErrors = true;
      });
    for (const [key, value] of groupedErrors) {
      console.error(key + ":");
      for (const item of value) {
        console.error("\t" + item);
        if (settings.annoyance === AnnoyanceAlert) {
          windowsAlert(key + ": " + item, key);
        }
      }
    }
    if (hasErrors && settings.failOnError) {
      process.exit(1);
    }
  }
}
