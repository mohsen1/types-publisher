"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const yargs = require("yargs");
const parser = require("./lib/definition-parser");
const common_1 = require("./lib/common");
const logging_1 = require("./util/logging");
const util_1 = require("./util/util");
const fsp = require("fs-promise");
if (!module.parent) {
    const singleName = yargs.argv.single;
    util_1.done((singleName ? single(singleName, common_1.Options.defaults) : main(common_1.Options.defaults)));
}
function processDir(name, options) {
    return __awaiter(this, void 0, void 0, function* () {
        let data;
        let outcome;
        const info = yield parser.getTypingInfo(name, options);
        const logs = info.logs;
        if (info.kind === "success") {
            data = info.data;
            outcome = `Succeeded (${info.data.kind})`;
        }
        else {
            data = undefined;
            outcome = `Failed (${common_1.RejectionReason[info.rejectionReason]})`;
        }
        return { data, logs, outcome };
    });
}
function filterPaths(paths, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const fullPaths = paths
            .filter(s => s[0] !== "." && s[0] !== "_" && s !== "node_modules" && s !== "scripts")
            .sort();
        // Remove non-folders
        return util_1.filterAsyncOrdered(fullPaths, (s) => __awaiter(this, void 0, void 0, function* () { return (yield fsp.stat(common_1.definitelyTypedPath(s, options))).isDirectory(); }));
    });
}
function main(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const [summaryLog, summaryLogResult] = logging_1.logger();
        const [detailedLog, detailedLogResult] = logging_1.quietLogger();
        summaryLog("# Typing Publish Report Summary");
        summaryLog(`Started at ${(new Date()).toUTCString()}`);
        // TypesData
        const paths = yield fsp.readdir(options.definitelyTypedPath);
        const folders = yield filterPaths(paths, options);
        summaryLog(`Found ${folders.length} typings folders in ${options.definitelyTypedPath}`);
        const outcomes = {};
        const [warningLog, warningLogResult] = logging_1.logger();
        const typings = {};
        for (const s of folders) {
            const result = yield processDir(s, options);
            // Record outcome
            outcomes[result.outcome] = (outcomes[result.outcome] || 0) + 1;
            detailedLog(`# ${s}`);
            // Push warnings
            if (result.logs.errors.length > 0) {
                warningLog(` * ${s}`);
                result.logs.errors.forEach(w => {
                    warningLog(`   * ${w}`);
                    detailedLog(`**Warning**: ${w}`);
                });
            }
            if (result.data !== undefined) {
                typings[s] = result.data;
            }
            // Flush detailed log
            result.logs.infos.forEach(e => detailedLog(e));
        }
        summaryLog("\r\n### Overall Results\r\n");
        summaryLog(" * Pass / fail");
        const outcomeKeys = Object.keys(outcomes);
        outcomeKeys.sort();
        outcomeKeys.forEach(k => {
            summaryLog(`   * ${k}: ${outcomes[k]}`);
        });
        summaryLog("\r\n### Warnings\r\n");
        logging_1.moveLogs(summaryLog, warningLogResult());
        yield Promise.all([
            logging_1.writeLog("parser-log-summary.md", summaryLogResult()),
            logging_1.writeLog("parser-log-details.md", detailedLogResult()),
            common_1.writeDataFile(common_1.typesDataFilename, typings)
        ]);
    });
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = main;
function single(singleName, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const result = yield processDir(singleName, options);
        const typings = { [singleName]: result.data };
        yield common_1.writeDataFile(common_1.typesDataFilename, typings);
        console.log(result);
    });
}
//# sourceMappingURL=parse-definitions.js.map