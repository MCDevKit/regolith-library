class Module {
    constructor(json) {
        if (!this.name) {
            throw new Error("Module name must be specified");
        }
        this.name = json.name;
        this.version = json.version ?? "HEAD";
    }
}

class Settings {
    constructor(json) {
        this.modules = json.modules ?? [];
        this.debug = json.debug ?? false;
        this.fetchDelay = json.fetchDelay ?? 5;
    }
}

class WhiskConfig {
    constructor(json) {
        this.include = json.include ?? ['**/*'];
        this.exclude = json.exclude ?? [];
    }
}

exports.Settings = Settings;
exports.Module = Module;
exports.WhiskConfig = WhiskConfig;