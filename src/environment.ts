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
    protected collection: vscode.EnvironmentVariableCollection;
    protected initialEnv: Map<string, string | undefined>;
    constructor(context: vscode.ExtensionContext) {
        this.initialEnv = new Map();
        this.collection = context.environmentVariableCollection;
        this.setupVscodeEnv();
        context.subscriptions.push(vscode.window.onDidOpenTerminal((terminal: vscode.Terminal) => {
            if (context.environmentVariableCollection.get('SETVARS_COMPLETED')) {
                vscode.commands.executeCommand('workbench.action.terminal.renameWithArg', { name: `Intel oneAPI: ${terminal.name}` });
            };
        }));
    }

    abstract setOneApiEnv(): Promise<void>;
    abstract unsetOneApiEnv(): void;

    protected async getEnvironment(): Promise<boolean | undefined> {
        const setvarsPath = await this.findSetvarsPath();
        if (!setvarsPath) {
            vscode.window.showInformationMessage(`Could not find path to setvars.${process.platform === 'win32' ? 'bat' : 'sh'}. Provide it yourself.`);
            const options: vscode.OpenDialogOptions = {
                canSelectMany: false,
                filters: {
                    'oneAPI setvars file': [process.platform === 'win32' ? 'bat' : 'sh'],
                }
            };

            const setVarsFileUri = await vscode.window.showOpenDialog(options);
            if (setVarsFileUri && setVarsFileUri[0]) {
                return await this.runSetvars(setVarsFileUri[0].fsPath);
            } else {
                vscode.window.showErrorMessage(`Path to setvars.${process.platform === 'win32' ? 'bat' : 'sh'} invalid, The oneAPI environment was not be applied.\n Please check setvars.${process.platform === 'win32' ? 'bat' : 'sh'} and try again.`, { modal: true });
                return false;
            }
        } else {
            vscode.window.showInformationMessage(`oneAPI environment script was found in the following path: ${setvarsPath}`);
            return await this.runSetvars(setvarsPath);
        }
    }

    private getSetvarsConfigPath(): string | undefined {
        const oneAPIConfiguration = vscode.workspace.getConfiguration();
        const setvarsConfigPath: string | undefined = oneAPIConfiguration.get("SETVARS_CONFIG");
        if (setvarsConfigPath && !existsSync(setvarsConfigPath)) {
            vscode.window.showErrorMessage('The path to the config file specified in SETVARS_CONFIG is not valid, so it is ignored');
            return undefined;
        }
        return setvarsConfigPath;
    }

    private async findSetvarsPath(): Promise<string | undefined> {
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

    private async runSetvars(fspath: string): Promise<boolean> {
        const setvarsConfigPath = this.getSetvarsConfigPath();
        let args = '';
        if (setvarsConfigPath) {
            vscode.window.showInformationMessage(`The config file found in ${setvarsConfigPath} is used`);
            args = `--config="${setvarsConfigPath}"`;
        }
        let cmd = process.platform === 'win32' ?
            `"${fspath}" ${args} > NULL && set` :
            `bash -c ". ${fspath} ${args}  > /dev/null && env -0"`;

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Setting up oneAPI environment...",
            cancellable: true
        }, async (_progress, token) => {
            token.onCancellationRequested(() => {
                this.collection.clear();
                return false; // if user click on CANCEL
            });
            await this.execSetvarsCatch(token, cmd);
        });
        await terminal_utils.checkExistingTerminals();
        return true;
    }

    private async execSetvarsCatch(token: vscode.CancellationToken, cmd: string): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            if (token.isCancellationRequested) {
                this.collection.clear();
                return;
            }
            let childProcess = exec(cmd)
                .on("close", (code, signal) => {
                    if (code || signal) {
                        this.collection.clear();
                        vscode.window.showErrorMessage(`Something went wrong! \n Error: ${code ? code : signal}. oneAPI environment not applied.`);
                    }
                    resolve();
                })
                .on("error", (err) => {
                    this.collection.clear();
                    vscode.window.showErrorMessage(`Something went wrong! \n Error: ${err} oneAPI environment not applied.`);
                    reject(err);
                });
            childProcess.stdout?.on("data", (d: string) => {
                let vars = d.split('\u0000');
                vars.forEach(async (l) => {
                    let e = l.indexOf('=');
                    let k = <string>l.substr(0, e);
                    let v = <string>l.substr((e + 1)).replace(`\r`, "");

                    if (k === "" || v === "") {
                        return;
                    }

                    if (process.env[k] !== v) {
                        if (!process.env[k]) {
                            this.collection.append(k, v);
                        } else {
                            this.collection.replace(k, v);
                        }
                    }
                    process.env[k] = v;
                });
            });
            token.onCancellationRequested(_ => childProcess.kill());
        });
    }

    private setupVscodeEnv(): void {
        Object.keys(process.env).forEach((k) => {
            this.initialEnv.set(k, process.env[k] as string);
        });
        this.collection.forEach((v, m) => {
            process.env[v] = m.value;
        });
        return;
    }

    protected async restoreVscodeEnv(): Promise<void> {
        this.collection.forEach((k) => {
            let oldVarValue = this.initialEnv.get(k);
            if (!oldVarValue) {
                delete process.env[k];
            } else {
                process.env[k] = oldVarValue;
            }
        });
        return;
    }
}

export class SingleRootEnv extends OneApiEnv {
    constructor(context: vscode.ExtensionContext) {
        super(context);
    }

    async setOneApiEnv(): Promise<void> {
        if (!this.collection.get('SETVARS_COMPLETED')) {
            await this.getEnvironment();
        }
    };

    async unsetOneApiEnv(): Promise<void> {
        await this.restoreVscodeEnv();
        this.collection.clear();
        vscode.window.showInformationMessage("oneAPI environment removed successfully.");
    };
}

export class MultiRootEnv extends OneApiEnv {
    private storage: Storage;
    private activeDir: string | undefined;
    private statusBarItem: vscode.StatusBarItem;

    constructor(context: vscode.ExtensionContext) {
        super(context);
        this.storage = new Storage(context.workspaceState);
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);

        this.setActiveDir(this.storage.get("activeDir"));
        this.statusBarItem.show();
        this.checkActiveDirForRelevance();
        this.updateFoldersInStorage();

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
            if (await this.getEnvironment()) {
                if (this.activeDir) {
                    let activeEnv = new Map();
                    this.collection.forEach((k, m) => {
                        activeEnv.set(k, m.value);
                    });
                    await this.storage.writeEnvToExtensionStorage(this.activeDir, activeEnv);
                }
            }
        }
    };

    async unsetOneApiEnv(): Promise<void> {
        if (this.activeDir) {
            this.storage.writeEnvToExtensionStorage(this.activeDir, new Map());
        }
        await this.restoreVscodeEnv();
        this.collection.clear();
        vscode.window.showInformationMessage("oneAPI environment removed successfully.");
        return;
    };

    private async addEnv(folder: string): Promise<void> {
        await this.storage.writeEnvToExtensionStorage(folder, new Map());
    }

    private async removeEnv(folder: string): Promise<void> {
        if (this.activeDir === folder) {
            this.setActiveDir(undefined);
            await this.storage.set("activeDir", undefined);
            this.collection.clear();
        }
        await this.storage.writeEnvToExtensionStorage(folder, undefined);
    }

    private async switchEnv(): Promise<boolean> {
        let folder = await getworkspaceFolder();
        if (!folder || folder.uri.toString() === this.activeDir) {
            return false;
        }
        let activeDir = folder?.uri.toString();
        this.setActiveDir(activeDir);
        await this.storage.set("activeDir", activeDir);
        await this.applyEnv(activeDir);
        vscode.window.showInformationMessage(`Working directory selected: ${folder?.name}`);
        return true;
    }

    private async applyEnv(folder: string): Promise<boolean> {
        this.restoreVscodeEnv();
        this.collection.clear();
        let env = await this.storage.readEnvFromExtensionStorage(folder);
        if (!env || env.size === 0) {
            return false;
        }
        for (let keyValuePair of env) {
            this.collection.append(keyValuePair[0], keyValuePair[1]);
            process.env[keyValuePair[0]] = keyValuePair[1];
        }
        return true;
    }

    private setActiveDir(dir: string | undefined): void {
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

    private checkActiveDirForRelevance(): void {
        if (this.activeDir && !vscode.workspace.workspaceFolders?.find((el) => {
            if (el.uri.toString() === this.activeDir) { return true; }
        })) {
            this.collection.clear();
            this.storage.set("activeDir", undefined);
            this.storage.set(this.activeDir, undefined);
            this.setActiveDir(undefined);
        }
    }

    private updateFoldersInStorage(): void {
        vscode.workspace.workspaceFolders?.forEach(async folder => {
            let env = await this.storage.readEnvFromExtensionStorage(folder.uri.toString());
            if (!env) {
                await this.addEnv(folder.uri.toString());
            }
        });
    }
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
