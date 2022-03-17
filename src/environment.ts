/**
 * Copyright (c) Intel Corporation
 * Licensed under the MIT License. See the project root LICENSE
 *
 * SPDX-License-Identifier: MIT
 */

'use strict';
import * as vscode from 'vscode';
import { execSync, spawn } from 'child_process';
import { posix, join, parse } from 'path';
import { existsSync } from 'fs';
import { Storage } from './utils/storage_utils';
import { getPSexecutableName } from './utils/terminal_utils';

enum Labels {
    undefined = 'Default environment without oneAPI',
    defaultOneAPI = 'Default oneAPI config',
    skip = 'Skip'
}

type CmdForRunSetvars = {
    interpreter: string,
    arguments: string[]
};


export abstract class OneApiEnv {
    protected collection: vscode.EnvironmentVariableCollection;
    protected initialEnv: Map<string, string | undefined>;
    protected activeEnv: string;
    protected statusBarItem: vscode.StatusBarItem;
    protected powerShellExecName: string | undefined;

    private _setvarsConfigsPaths: string[] | undefined;
    private _oneAPIRootPath: string | undefined;

    public set setvarsConfigsPaths(configsPaths: string[] | undefined) {
        if (configsPaths?.length === 0 || configsPaths === undefined) {
            this._setvarsConfigsPaths = undefined;
        } else {
            configsPaths.forEach(async function (onePath, index, pathList) {
                pathList[index] = posix.normalize(onePath.replace(`\r`, "")).split(/[\\\/]/g).join(posix.sep);
            });
            this._setvarsConfigsPaths = configsPaths;
        }
    }

    public set oneAPIRootPath(rootPath: string | undefined) {
        if (rootPath?.length === 0 || rootPath === undefined) {
            this._oneAPIRootPath = undefined;
        } else {
            this._oneAPIRootPath = posix.normalize(rootPath.replace(`\r`, "")).split(/[\\\/]/g).join(posix.sep);
        }
    }

    constructor(context: vscode.ExtensionContext) {
        this.initialEnv = new Map();
        this.activeEnv = Labels.undefined;
        this.collection = context.environmentVariableCollection;
        this.collection.clear();
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
        this.powerShellExecName = getPSexecutableName();
        this.setupVscodeEnv();
        this.setEnvNameToStatusBar(undefined);
    }

    abstract initializeDefaultEnvironment(): Promise<void>;
    abstract initializeCustomEnvironment(): Promise<void>;
    abstract clearEnvironment(): void;
    abstract switchEnv(): Promise<boolean>;

    protected async getEnvironment(isDefault: boolean): Promise<boolean | undefined> {
        const setvarsPath = await this.findSetvarsPath();
        if (!setvarsPath) {
            const fileExtension = process.platform === 'win32' ? 'bat' : 'sh';
            vscode.window.showInformationMessage(`Could not find path to setvars.${fileExtension} or the path was not selected. Open settings and search for ONEAPI_ROOT to specify the path to the installation folder, then use the command palette to Initialize environment variables.`);
            const options: vscode.OpenDialogOptions = {
                canSelectMany: false,
                filters: {
                    'oneAPI setvars file': [fileExtension],
                }
            };

            const setVarsFileUri = await vscode.window.showOpenDialog(options);
            if (setVarsFileUri && setVarsFileUri[0]) {
                return await this.runSetvars(setVarsFileUri[0].fsPath, isDefault);
            } else {
                vscode.window.showErrorMessage(`Path to setvars.${fileExtension} is invalid.\n Open settings and search for ONEAPI_ROOT to specify the path to the installation folder, then use the command palette to Initialize environment variables.${fileExtension}.`, { modal: true });
                return false;
            }
        } else {
            vscode.window.showInformationMessage(`oneAPI environment script was found in the following path: ${setvarsPath}`);
            return await this.runSetvars(setvarsPath, isDefault);

        }
    }

    private async getSetvarsConfigPath(): Promise<string | undefined> {
        if (this._setvarsConfigsPaths) {
            const options: vscode.InputBoxOptions = {
                placeHolder: `Please select which configuration file you want to use:`
            };
            const optinosItems: vscode.QuickPickItem[] = [];
            this._setvarsConfigsPaths.forEach(async function (onePath) {
                optinosItems.push({
                    label: parse(onePath).base,
                    description: onePath
                });
            });
            optinosItems.push({
                label: Labels.skip,
                description: 'Do not apply the configuration file.'
            });
            const tmp = await vscode.window.showQuickPick(optinosItems, options);
            if (!tmp || tmp?.label === Labels.skip) {
                return undefined;
            }
            if (tmp?.description) {
                if (!existsSync(tmp?.description)) {
                    vscode.window.showErrorMessage(`Could not find the ${tmp?.label} file on the path ${tmp?.description} .  Open settings and search for SETVARS_CONFIG to specify the path to your custom configuration file.`);
                    return undefined;
                }
                return tmp?.description;
            }
        }
        const tmp = await vscode.window.showInformationMessage(`No setvars_config files are specified in the settings. Open settings and search for SETVARS_CONFIG to specify the path to your custom configuration file.`, `Open settings`, `Learn more about SETVARS_CONFIG`);
        if (tmp === `Open settings`) {
            await vscode.commands.executeCommand('workbench.action.openSettings', `@ext:intel-corporation.oneapi-environment-configurator`);
        }
        if (tmp === `Learn more about SETVARS_CONFIG`) {
            vscode.env.openExternal(vscode.Uri.parse(process.platform === "win32" ?
                "https://www.intel.com/content/www/us/en/develop/documentation/oneapi-programming-guide/top/oneapi-development-environment-setup/use-the-setvars-script-with-windows/use-a-config-file-for-setvars-bat-on-windows.html"
                : 'https://www.intel.com/content/www/us/en/develop/documentation/oneapi-programming-guide/top/oneapi-development-environment-setup/use-the-setvars-script-with-linux-or-macos/use-a-config-file-for-setvars-sh-on-linux-or-macos.html'));
        }
        return undefined;
    }

    private async findSetvarsPath(): Promise<string | undefined> {
        try {
            // 0. Check oneAPI Root Path from setting.json
            if (this._oneAPIRootPath) {
                const pathToSetvars = join(this._oneAPIRootPath, `setvars.${process.platform === 'win32' ? 'bat' : 'sh'}`);

                if (existsSync(pathToSetvars)) {
                    return pathToSetvars;
                } else {
                    vscode.window.showErrorMessage('Could not find the setvars script using the path specified in the settings for ONEAPI_ROOT. Select continue to search for setvars automatically. Select skip to specify the location manually: open settings search for ONEAPI_ROOT to specify the path to the installation folder.');
                    const options: vscode.InputBoxOptions = {
                        placeHolder: `Could not find setvars at the path specified in ONEAPI_ROOT.`
                    };
                    const optinosItems: vscode.QuickPickItem[] = [];
                    optinosItems.push({
                        label: 'Continue',
                        description: 'Try to find setvars automatically.'
                    });
                    optinosItems.push({
                        label: 'Skip setvars search',
                        description: 'Open settings and change ONEAPI_ROOT to specify the installation folder.'
                    });

                    const tmp = await vscode.window.showQuickPick(optinosItems, options);
                    if (tmp?.label !== 'Continue') {
                        return undefined;
                    }
                }
            }

            // 1.check $PATH for setvars.sh
            const cmdParsePath = process.platform === 'win32' ?
                `${this.powerShellExecName} -Command "$env:Path -split ';' | Select-String -Pattern 'oneapi$' | foreach{$_.ToString()} | ? {$_.trim() -ne '' }"` :
                "env | grep 'PATH' | sed 's/'PATH='//g; s/:/\\n/g'| awk '/oneapi$/'";
            const paths = execSync(cmdParsePath).toString().split('\n');
            paths.pop();
            paths.forEach(async function (onePath, index, pathList) {
                pathList[index] = posix.normalize(onePath.replace(`\r`, "")).split(/[\\\/]/g).join(posix.sep);
            });

            if (paths.length > 0 && paths.length !== 1) {
                const options: vscode.InputBoxOptions = {
                    placeHolder: `Found multiple paths to oneAPI environment script (setvars). Choose which one to use:`
                };
                const tmp = await vscode.window.showQuickPick(paths, options);
                if (!tmp) {
                    return undefined;
                }
                return tmp;

            } else {
                if (paths.length === 1) {
                    return join(paths[0], `setvars.${process.platform === 'win32' ? 'bat' : 'sh'}`);
                }
            }
            // 2.check in $ONEAPI_ROOT
            const setvarsFromOneapiRoot = join(`${process.env.ONEAPI_ROOT}`, `setvars.${process.platform === 'win32' ? 'bat' : 'sh'}`);
            if (existsSync(setvarsFromOneapiRoot)) {
                return setvarsFromOneapiRoot;
            }
            // 3.check in global installation path
            const globalSetvarsPath = process.platform === 'win32' ?
                join(`${process.env['ProgramFiles(x86)']}`, `Intel`, `oneAPI`, `setvars.bat`) :
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
                    const paths = execSync("find \"${HOME}\" -mindepth 3 -maxdepth 3 -name \"setvars.sh\"").toString().split('\n');
                    paths.pop();
                    if (paths.length > 0 && paths.length !== 1) {
                        const options: vscode.InputBoxOptions = {
                            placeHolder: `Found multiple paths to oneAPI environment script (setvars). Choose which one to use:`
                        };
                        const tmp = await vscode.window.showQuickPick(paths, options);
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

    private async runSetvars(fspath: string, isDefault: boolean): Promise<boolean> {
        let args = '';
        if (!isDefault) {
            const setvarsConfigPath = await this.getSetvarsConfigPath();
            if (setvarsConfigPath) {
                this.activeEnv = parse(setvarsConfigPath).base;
                vscode.window.showInformationMessage(`Environment set using the config file found in ${setvarsConfigPath}.`);
                args = `--config="${setvarsConfigPath}"`;
            } else {
                return false;
            }
        } else {
            this.activeEnv = Labels.defaultOneAPI;
        }

        const cmd: CmdForRunSetvars =
            process.platform === 'win32' ?
                {
                    interpreter: 'cmd.exe',
                    arguments: args ?
                        ['/c', `""${fspath}" ${args} && set"`] :
                        ['/c', `""${fspath}" && set"`]
                } :
                {
                    interpreter: 'bash',
                    arguments: ['-c', `. "${fspath}" ${args} > /dev/null && env -0`]
                };


        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Setting up the oneAPI environment...",
            cancellable: true
        }, async (_progress, token) => {
            token.onCancellationRequested(() => {
                this.collection.clear();
                return false; // if user click on CANCEL
            });

            await this.execSetvarsCatch(token, cmd);
        });

        this.setEnvNameToStatusBar(this.activeEnv);
        return true;
    }

    private async execSetvarsCatch(token: vscode.CancellationToken, cmd: CmdForRunSetvars): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            if (token.isCancellationRequested) {
                this.collection.clear();
                return;
            }
            const childProcess = spawn(cmd.interpreter, cmd.arguments, { windowsVerbatimArguments: true })
                .on("close", (code, signal) => {
                    if (code || signal) {
                        this.collection.clear();
                        vscode.window.showErrorMessage(`Error: ${code ? code : signal}. Open settings and search for SETVARS and change the value of SETVARS_CONFIG to specify your custom configuration file, or change the value of ONEAPI_ROOT to specify your installation folder.`);
                    }
                    resolve();
                })
                .on("error", (err) => {
                    this.collection.clear();
                    vscode.window.showErrorMessage(`Error: ${err} oneAPI environment not applied. Open settings and search for SETVARS and change the value of SETVARS_CONFIG to specify your custom configuration file, or change the value of ONEAPI_ROOT to specify your installation folder`);
                    vscode.window.showErrorMessage(`Something went wrong!\n Error: ${err} oneAPI environment not applied.`);
                    reject(err);
                });

            childProcess.stdout.setEncoding('utf8');
            childProcess.stdout?.on("data", (d: string) => {
                const separator = process.platform === 'win32' ? '\n' : '\u0000';
                const vars = d.split(separator);
                vars.forEach(async (l) => {
                    const e = l.indexOf('=');
                    const k = <string>l.substr(0, e);
                    const v = <string>l.substr((e + 1)).replace(`\r`, "");

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
            childProcess.stderr?.on('data', function (data: string) {
                vscode.window.showErrorMessage(data);
            });
            token.onCancellationRequested(() => childProcess.kill());
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
            const oldVarValue = this.initialEnv.get(k);
            if (!oldVarValue) {
                delete process.env[k];
            } else {
                process.env[k] = oldVarValue;
            }
        });
        return;
    }

    protected setEnvNameToStatusBar(envName: string | undefined): void {
        if (!envName || envName === Labels.undefined) {
            this.statusBarItem.text = "Active environment: ".concat("not selected");
        }
        else {
            this.statusBarItem.text = "Active environment: ".concat(envName);
        }
        this.statusBarItem.show();
    }

    protected checkPlatform(): boolean {
        if ((process.platform !== 'win32') && (process.platform !== 'linux')) {
            vscode.window.showErrorMessage("Failed to activate the 'Environment Configurator for Intel oneAPI Toolkits' extension. The extension is only supported on Linux and Windows.", { modal: true });
            return false;
        }
        return true;
    }
}

export class MultiRootEnv extends OneApiEnv {
    private storage: Storage;
    private envCollection: string[];

    constructor(context: vscode.ExtensionContext) {
        super(context);
        this.storage = new Storage(context.workspaceState);
        this.envCollection = [];
        this.envCollection.push(this.activeEnv);
        const activeEnvCollection = new Map();
        this.collection.forEach((k, m) => {
            activeEnvCollection.set(k, m.value);
        });
        this.storage.writeEnvToExtensionStorage(this.activeEnv, activeEnvCollection);
    }

    async initializeDefaultEnvironment(): Promise<void> {
        if (!this.checkPlatform()) {
            return;
        }
        await this.initializeEnvironment(true);
    }

    async initializeCustomEnvironment(): Promise<void> {
        if (!this.checkPlatform()) {
            return;
        }
        await this.initializeEnvironment(false);
    }
    async initializeEnvironment(isDefault: boolean): Promise<void> {
        if (process.platform === 'win32' && !this.powerShellExecName) {
            vscode.window.showErrorMessage('Failed to determine powershell version. The environment will not be set.', { modal: true });
            return;
        }
        if (this.initialEnv.get("SETVARS_COMPLETED")) {
            await vscode.window.showWarningMessage("The oneAPI environment has already been initialized outside of the configurator, which may interfere with environment management in Visual Studio Code. Do not initialize the oneAPI product environment before running Visual Studio Code.", { modal: true });
            return;
        }

        if (this.collection.get('SETVARS_COMPLETED')) {
            this.restoreVscodeEnv();
        }

        if (await this.getEnvironment(isDefault)) {
            if (!this.envCollection.includes(this.activeEnv)) {
                this.envCollection.push(this.activeEnv);
            }
            else {
                vscode.window.showInformationMessage(`The environment of the same name is already exist. ${this.activeEnv} environment was redefined`);
            }
            const activeEnvCollection = new Map();
            this.collection.forEach((k, m) => {
                activeEnvCollection.set(k, m.value);
            });
            await this.storage.writeEnvToExtensionStorage(this.activeEnv, activeEnvCollection);

        }
    }

    async clearEnvironment(): Promise<void> {
        if (!this.checkPlatform()) {
            return;
        }
        if (this.activeEnv === Labels.undefined) {
            vscode.window.showInformationMessage("Environment variables were not configured, so environment is not set. No further action needed.");
            return;
        }
        await this.restoreVscodeEnv();
        await this.removeEnv(this.activeEnv);
        vscode.window.showInformationMessage("oneAPI environment has been successfully removed.");
        return;
    }

    async switchEnv(): Promise<boolean> {
        if (!this.checkPlatform()) {
            return false;
        }
        if (this.envCollection.length < 2) {
            const tmp = await vscode.window.showInformationMessage(`Alternate environment is not available. Open settings and search for SETVARS_CONFIG to specify the path to your custom configuration file.`, `Open settings.`, `Learn more about SETVARS_CONFIG.`);
            if (tmp === `Open settings.`) {
                await vscode.commands.executeCommand('workbench.action.openSettings', `@ext:intel-corporation.oneapi-environment-configurator`);
            }
            if (tmp === `Learn more about SETVARS_CONFIG.`) {
                vscode.env.openExternal(vscode.Uri.parse(process.platform === "win32" ?
                    "https://www.intel.com/content/www/us/en/develop/documentation/oneapi-programming-guide/top/oneapi-development-environment-setup/use-the-setvars-script-with-windows/use-a-config-file-for-setvars-bat-on-windows.html"
                    : 'https://www.intel.com/content/www/us/en/develop/documentation/oneapi-programming-guide/top/oneapi-development-environment-setup/use-the-setvars-script-with-linux-or-macos/use-a-config-file-for-setvars-sh-on-linux-or-macos.html'));
            }
            return false;
        }
        const optinosItems: vscode.QuickPickItem[] = [];
        const options: vscode.InputBoxOptions = {
            placeHolder: `Select the config file to be used to set the environment:`
        };
        this.envCollection.forEach(async function (oneEnv) {
            optinosItems.push({
                label: oneEnv,
                description: oneEnv === Labels.defaultOneAPI ? "To initialize the default oneAPI environment" : oneEnv === Labels.undefined ? "To initialize the environment without oneAPI" : `To initialize the oneAPI environment using the ${oneEnv} file`
            });
        });
        optinosItems.push({
            label: Labels.skip,
            description: 'Do not change the environment.'
        });
        const env = await vscode.window.showQuickPick(optinosItems, options);
        if (!env || env?.label === Labels.skip) {
            return false;
        }
        this.setEnvNameToStatusBar(env.label);
        this.activeEnv = env.label;
        await this.applyEnv(env.label);
        return true;
    }

    private async addEnv(env: string | undefined): Promise<void> {
        await this.storage.writeEnvToExtensionStorage(env, new Map());
    }

    private async removeEnv(env: string): Promise<void> {
        await this.storage.set(env, undefined);
        this.collection.clear();
        const nameToDel = this.activeEnv;
        this.envCollection = this.envCollection.filter(function (item) {
            return item !== nameToDel;
        });
        await this.storage.writeEnvToExtensionStorage(env, undefined);
        this.activeEnv = Labels.undefined;
        this.setEnvNameToStatusBar(undefined);
    }

    private async applyEnv(envName: string): Promise<boolean> {
        this.restoreVscodeEnv();
        this.collection.clear();
        const env = await this.storage.readEnvFromExtensionStorage(envName);
        if (!env || env.size === 0) {
            return false;
        }
        for (const keyValuePair of env) {
            this.collection.append(keyValuePair[0], keyValuePair[1]);
            process.env[keyValuePair[0]] = keyValuePair[1];
        }
        return true;
    }

    private async updateEnvsInStorage(envName: string): Promise<void> {
        const env = await this.storage.readEnvFromExtensionStorage(envName);
        if (!env) {
            await this.addEnv(this.activeEnv);
        }
    }
}
