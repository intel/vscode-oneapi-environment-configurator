/**
 * Copyright (c) Intel Corporation
 * Licensed under the MIT License. See the project root LICENSE
 * 
 * SPDX-License-Identifier: MIT
 */

'use strict';
import * as vscode from 'vscode';
import * as terminal_utils from './utils/terminal_utils';
import { execSync, exec } from 'child_process';
import { posix, join } from 'path';
import { existsSync } from 'fs';
import { Storage } from './utils/storage_utils';

export abstract class OneApiEnv {
    protected context: vscode.ExtensionContext;
    protected collection: vscode.EnvironmentVariableCollection;

    abstract setOneApiEnv(): Promise<void>;
    abstract unsetOneApiEnv(): void;
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.collection = context.environmentVariableCollection;

        context.subscriptions.push(vscode.window.onDidOpenTerminal((terminal: vscode.Terminal) => {
            if (context.environmentVariableCollection.get('SETVARS_COMPLETED')) {
                vscode.commands.executeCommand('workbench.action.terminal.renameWithArg', { name: `Intel oneAPI: ${terminal.name}` });
            };
        }));
    }
}

export class SingleRootEnv extends OneApiEnv {
    constructor(context: vscode.ExtensionContext) {
        super(context);
    }

    async setOneApiEnv(): Promise<void> {
        if (!this.collection.get('SETVARS_COMPLETED')) {
            if (terminal_utils.isTerminalAcceptable()) {
                getEnvironment(this.collection);
            }
        }
    };

    unsetOneApiEnv(): void {
        this.collection.clear();
        vscode.window.showInformationMessage("oneAPI environment removed successfully.");
    };
}

export class MultiRootEnv extends OneApiEnv {
    private storage: Storage;
    activeDir: string | undefined;
    private statusBarItem: vscode.StatusBarItem;

    constructor(context: vscode.ExtensionContext) {
        super(context);
        this.storage = new Storage(context.workspaceState);
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);

        this.setActiveDir(this.storage.storage.get("activeDir"));
        this.statusBarItem.show();
        this.checkActiveDirForRelevance();

        vscode.workspace.workspaceFolders?.forEach(async folder => {
            let env = await this.storage.readEnvFromExtensionStorage(folder.uri.toString());
            if (!env) {
                await this.addEnv(folder.uri.toString());
            }
        });
        context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(event => {
            for (let folder of event.added) {
                this.addEnv(folder.uri.toString());
            }
            for (let folder of event.removed) {
                this.removeEnv(folder.uri.toString());
            }
        }));
        context.subscriptions.push(vscode.commands.registerCommand('intel.oneAPIСonfigurator.switchEnv', () => this.switchEnv()));
    }

    async setOneApiEnv(): Promise<void> {
        if (!this.activeDir) {
            vscode.window.showInformationMessage("Select the directory for which the environment will be seted");
            if (await this.switchEnv() !== true) {
                vscode.window.showErrorMessage("No active directory selected. oneAPI environment not applied.");
                return;
            }
        }

        if (!this.collection.get('SETVARS_COMPLETED')) {
            if (terminal_utils.isTerminalAcceptable()) {
                await getEnvironment(this.collection);
            }
            if (this.activeDir) {
                let activeEnv = new Map();
                this.collection.forEach((k, m) => {
                    activeEnv.set(k, m.value);
                });
                await this.storage.writeEnvToExtensionStorage(this.activeDir, activeEnv);
            }
        }
    };

    unsetOneApiEnv(): void {
        if (this.activeDir) {
            this.storage.writeEnvToExtensionStorage(this.activeDir, new Map());
        }
        this.collection.clear();
        vscode.window.showInformationMessage("oneAPI environment removed successfully.");
        return;
    };

    async addEnv(folder: string): Promise<void> {
        await this.storage.writeEnvToExtensionStorage(folder, new Map());
    }

    async removeEnv(folder: string): Promise<void> {
        if (this.activeDir === folder) {
            this.setActiveDir(undefined);
            await this.storage.storage.update("activeDir", undefined);
            this.collection.clear();
        }
        await this.storage.writeEnvToExtensionStorage(folder, undefined);
    }

    async switchEnv(): Promise<boolean> {
        let folder = await getworkspaceFolder();
        if (!folder || folder.uri.toString() === this.activeDir) {
            return false;
        }
        let activeDir = folder?.uri.toString();
        this.setActiveDir(activeDir);
        await this.storage.storage.update("activeDir", activeDir);
        await this.applyEnv(activeDir);
        vscode.window.showInformationMessage(`Working directory selected: ${folder?.name}`);
        return true;
    }

    async applyEnv(folder: string): Promise<boolean> {
        this.collection.clear();
        let env = await this.storage.readEnvFromExtensionStorage(folder);
        if (!env || env.size === 0) {
            return false;
        }
        for (let keyValuePair of env) {
            this.collection.append(keyValuePair[0], keyValuePair[1]);
        }
        return true;
    }

    setActiveDir(dir: string | undefined): void {
        this.activeDir = dir;
        if (dir) {
            let activeDirUri = vscode.Uri.parse(dir);
            let activeDirName = vscode.workspace.getWorkspaceFolder(activeDirUri)?.name;
            if (activeDirName) {
                this.statusBarItem.text = "Active environment: ".concat(activeDirName);
            }
        }
        else {
            this.statusBarItem.text = "Active environment: ".concat("not selected");
        }
    }

    checkActiveDirForRelevance(): void {
        if (this.activeDir && !vscode.workspace.workspaceFolders?.find((el) => {
            if (el.uri.toString() === this.activeDir) { return true; }
        })) {
            this.collection.clear();
            this.storage.storage.update("activeDir", undefined);
            this.storage.storage.update(this.activeDir, undefined);
            this.setActiveDir(undefined);
        }
    }
}

async function findSetvarsPath(): Promise<string | undefined> {
    try {
        // 1.check $PATH for setvars.sh
        let cmdParsePath = process.platform === 'win32' ?
            `pwsh -Command "$env:Path -split ';' | Select-String -Pattern 'oneapi$' | foreach{$_.ToString()} | ? {$_.trim() -ne '' }"` :
            "env | grep 'PATH' | sed 's/'PATH='//g; s/:/\\n/g'| awk '/oneapi$/'";
        let paths = execSync(cmdParsePath).toString().split('\n');
        paths.pop();
        paths.forEach(async function (onePath, index, pathList) {
            pathList[index] = posix.normalize(onePath.replace(`\r`, "")).split(/[\\\/]/g).join(posix.sep);;
        });

        if (paths.length > 0 && paths.length !== 1) {
            vscode.window.showInformationMessage("Found multiple paths to oneAPI environment script. Choose which one to use.");
            let tmp = await vscode.window.showQuickPick(paths);
            if (tmp) {
                return tmp;
            }
        } else {
            if (paths.length === 1) {
                return join(paths[0], `setvars.${process.platform === 'win32' ? 'bat' : 'sh'}`);
            }
        }
        // 2.check in $ONEAPI_ROOT
        if (existsSync(`${process.env.ONEAPI_ROOT}/setvars.${process.platform === 'win32' ? 'bat' : 'sh'}`)) {
            return `${process.env.ONEAPI_ROOT}/setvars.${process.platform === 'win32' ? 'bat' : 'sh'}`;
        }
        // 3.check in global installation path
        let globalSetvarsPath = process.platform === 'win32' ?
            `${process.env['ProgramFiles(x86)']}\\Intel\\oneAPI\\setvars.bat` :
            '/opt/intel/oneapi/setvars.sh';
        if (existsSync(globalSetvarsPath)) {
            return globalSetvarsPath;
        }
        if (process.platform !== 'win32') {
            {
                // 4.check in local installation path
                if (existsSync(`${process.env.HOME}/intel/oneapi/setvars.sh`)) {
                    return `${process.env.HOME}/intel/oneapi/setvars.sh`;
                }
                //5.check in local-custom installation path
                //Path does not require normalization because it is generated only for Linux
                let paths = execSync("find \"${HOME}\" -mindepth 3 -maxdepth 3 -name \"setvars.sh\"").toString().split('\n');
                paths.pop();
                if (paths.length > 0 && paths.length !== 1) {
                    vscode.window.showInformationMessage("Found multiple paths to oneAPI environment script. Choose which one to use.");
                    let tmp = await vscode.window.showQuickPick(paths);
                    if (tmp) {
                        return tmp;
                    }
                } else {
                    if (paths.length === 1) {
                        return paths[0];
                    }
                }
            }
        }
        return undefined;
    }
    catch (err) {
        console.error(err);
        return undefined;
    }
}

function getSetvarsConfigPath(): string | undefined {
    const oneAPIConfiguration = vscode.workspace.getConfiguration();
    const setvarsConfigPath: string | undefined = oneAPIConfiguration.get("SETVARS_CONFIG");
    return setvarsConfigPath;
}

async function getEnvironment(collection: vscode.EnvironmentVariableCollection): Promise<boolean | undefined> {
    const setvarsPath = await findSetvarsPath();
    if (!setvarsPath) {
        vscode.window.showInformationMessage(`Could not find path to setvars.${process.platform === 'win32' ? 'bat' : 'sh'}. Provide it yourself.`);
        const options: vscode.OpenDialogOptions = {
            canSelectMany: false,
            filters: {
                'oneAPI setvars file': [process.platform === 'win32' ? 'bat' : 'sh'],
            }
        };

        let setVarsFileUri = await vscode.window.showOpenDialog(options);
        if (setVarsFileUri && setVarsFileUri[0]) {
            return await runSetvars(setVarsFileUri[0].fsPath, collection);
        } else {
            vscode.window.showErrorMessage(`Path to setvars.${process.platform === 'win32' ? 'bat' : 'sh'} invalid, The oneAPI environment was not be applied.\n Please check setvars.${process.platform === 'win32' ? 'bat' : 'sh'} and try again.`, { modal: true });
            return false;
        }
    } else {
        vscode.window.showInformationMessage(`oneAPI environment script was found in the following path: ${setvarsPath}`);
        return await runSetvars(setvarsPath, collection);
    }
}

async function runSetvars(fspath: string, collection: vscode.EnvironmentVariableCollection): Promise<boolean> {
    const setvarsConfigPath = getSetvarsConfigPath();
    let args = '';
    if (setvarsConfigPath) {
        args = `--config="${setvarsConfigPath}"`;
    }
    let cmd = process.platform === 'win32' ?
        `"${fspath}" ${args} > NULL && set` :
        `bash -c ". ${fspath} ${args} > /dev/null && printenv"`;

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Setting up oneAPI environment...",
        cancellable: true
    }, async (_progress, token) => {
        token.onCancellationRequested(() => {
            collection.clear();
            return false; // if user click on CANCEL
        });
        await execSetvarsCatch(token, cmd, collection);
    });
    await terminal_utils.checkExistingTerminals();
    return true;
}

async function execSetvarsCatch(token: vscode.CancellationToken, cmd: string, collection: vscode.EnvironmentVariableCollection): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
        if (token.isCancellationRequested) {
            collection.clear();
            return;
        }
        let childProcess = exec(cmd)
            .on("close", (code, signal) => {
                if (code || signal) {
                    collection.clear();
                    vscode.window.showErrorMessage(`Something went wrong! \n Error: ${code ? code : signal}. oneAPI environment not applied.`);
                }
                resolve();
            })
            .on("error", (err) => {
                collection.clear();
                vscode.window.showErrorMessage(`Something went wrong! \n Error: ${err} oneAPI environment not applied.`);
                reject(err);
            });
        childProcess.stdout?.on("data", (d: string) => {
            let vars = d.split('\n');
            vars.forEach(async (l) => {
                let e = l.indexOf('=');
                let k = <string>l.substr(0, e);
                let v = <string>l.substr((e + 1)).replace(`\r`, "");

                if (k === "" || v === "") {
                    return;
                }

                if (process.env[k] !== v) {
                    if (!process.env[k]) {
                        collection.append(k, v);
                    } else {
                        collection.replace(k, v);
                    }
                }
            });
        });
        token.onCancellationRequested(_ => childProcess.kill());
    });
}

async function getworkspaceFolder(): Promise<vscode.WorkspaceFolder | undefined> {
    if (vscode.workspace.workspaceFolders?.length === 1) {
        return vscode.workspace.workspaceFolders[0];
    }
    let selection = await vscode.window.showWorkspaceFolderPick();
    if (!selection) {
        vscode.window.showErrorMessage("Cannot find the working directory!", { modal: true });
        vscode.window.showInformationMessage("Please add one or more working directories and try again.");
        return undefined; // for unit tests
    }
    return selection;
}
