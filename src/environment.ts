/**
 * Copyright (c) Intel Corporation
 * Licensed under the MIT License. See the project root LICENSE
 *
 * SPDX-License-Identifier: MIT
 */

'use strict';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { execSync, spawn } from 'child_process';
import { posix, join, parse } from 'path';
import { existsSync, readdirSync } from 'fs';


import { Storage } from './utils/storage_utils';
import { getPSexecutableName, notifyUserToReloadStaleTerminals } from './utils/terminal_utils';
import messages from './messages';

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
            configsPaths.forEach(async function(onePath, index, pathList) {
                pathList[index] = posix.normalize(onePath.replace('\r', '')).split(/[\\\/]/g).join(posix.sep);
            });
            this._setvarsConfigsPaths = configsPaths;
        }
    }

    public get setvarsConfigsPaths() {
        return this._setvarsConfigsPaths;
    }

    public set oneAPIRootPath(rootPath: string | undefined) {
        if (rootPath?.length === 0 || rootPath === undefined) {
            this._oneAPIRootPath = undefined;
        } else {
            this._oneAPIRootPath = posix.normalize(rootPath.replace('\r', '')).split(/[\\\/]/g).join(posix.sep);
        }
    }

    public get oneAPIRootPath() {
        return this._oneAPIRootPath;
    }

    constructor(context: vscode.ExtensionContext) {
        this.initialEnv = new Map();
        this.activeEnv = messages.defaultEnv;
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
    abstract configureIntelCompilerForCMake(): Promise<void>;
    
    protected async getEnvironment(isDefault: boolean): Promise<boolean | undefined> {
        let envScripts = await this.findEnvScript('setvars');

        if (isDefault) {
            const oneapiVars = await this.findEnvScript('oneapi-vars');
            // Explicitly check if user pressed Esc key
            if (oneapiVars.length > 0 && oneapiVars[0] === messages.escapeKey) return false;
            envScripts = envScripts.concat(oneapiVars);
        }
        if (envScripts.length === 0) {
            const fileExtension = process.platform === 'win32' ? 'bat' : 'sh';
            const option = await vscode.window.showErrorMessage(
                messages.errorEnvScriptPath(fileExtension),
                messages.installToolkit, messages.setPathToEnvScript);
            if (option === messages.installToolkit) {
                vscode.env.openExternal(vscode.Uri.parse(
                    messages.toolkitsLink));
                return false;
            } else if (option === messages.setPathToEnvScript) {
                const options: vscode.OpenDialogOptions = {
                    canSelectMany: false,
                    filters: {
                        'oneAPI environmnet script': [fileExtension]
                    }
                };
                const setVarsFileUri = await vscode.window.showOpenDialog(options);

                if (setVarsFileUri && setVarsFileUri[0]) {
                    return await this.runSetvars(setVarsFileUri[0].fsPath, isDefault);
                } else {
                    vscode.window.showErrorMessage(messages.errorSetvarsPath(fileExtension), { modal: true });
                    return false;
                }
            }
            return false;
        } else {
            let envScriptToUse = null;
            if (envScripts.length > 1) {
                const options: vscode.InputBoxOptions = {
                    placeHolder: messages.multipleEnvScriptPaths
                };
                while (!envScriptToUse) {
                    envScriptToUse = await vscode.window.showQuickPick(envScripts, options);
                }
            } else {
                envScriptToUse = envScripts[0];
            }
            vscode.window.showInformationMessage(messages.envScriptFound(envScriptToUse));
            return await this.runSetvars(envScriptToUse, isDefault);
        }
    }

    private async getSetvarsConfigPath(): Promise<string | undefined> {
        if (this._setvarsConfigsPaths) {
            const options: vscode.InputBoxOptions = {
                placeHolder: messages.selectConfigFile
            };
            const optinosItems: vscode.QuickPickItem[] = [];

            this._setvarsConfigsPaths.forEach(async function(onePath) {
                optinosItems.push({
                    label: parse(onePath).base,
                    description: onePath
                });
            });
            optinosItems.push({
                label: messages.skip,
                description: messages.notApplyConfigFile
            });
            const tmp = await vscode.window.showQuickPick(optinosItems, options);

            if (!tmp || tmp.label === messages.skip) {
                return undefined;
            }
            if (tmp.description) {
                if (!existsSync(tmp.description)) {
                    vscode.window.showErrorMessage(messages.errorConfigFile(tmp));
                    return undefined;
                }
                return tmp.description;
            }
        }
        const tmp = await vscode.window.showInformationMessage(messages.customConfigFile, messages.openSettings, messages.learnConfig);

        if (tmp === messages.openSettings) {
            await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:intel-corporation.oneapi-environment-configurator');
        }
        if (tmp === messages.learnConfig) {
            vscode.env.openExternal(vscode.Uri.parse(process.platform === 'win32'
                ? messages.learnConfigLinkWin
                : messages.learnConfigLinkLinMac));
        }
        return undefined;
    }

    private async findEnvScript(envScriptName: string): Promise<string[]> {
        try {
        // 0. Check oneAPI Root Path from setting.json
            if (this._oneAPIRootPath) {
                const pathToEnvScript = join(this._oneAPIRootPath, `${envScriptName}.${process.platform === 'win32' ? 'bat' : 'sh'}`);

                if (existsSync(pathToEnvScript)) {
                    return [pathToEnvScript];
                } else {
                    const options: vscode.InputBoxOptions = {
                        placeHolder: messages.noEnvScriptByPath(envScriptName)
                    };
                    const optinosItems: vscode.QuickPickItem[] = [];

                    optinosItems.push({
                        label: messages.continue,
                        description: messages.autoEnvScriptSearch(envScriptName)
                    });
                    optinosItems.push({
                        label: messages.skipEnvScriptSearch(envScriptName),
                        description: messages.openSettingsToChangeRoot
                    });

                    const tmp = await vscode.window.showQuickPick(optinosItems, options);
                    if(!tmp) return [messages.escapeKey];

                    if (tmp?.label !== messages.continue) {
                        return [];
                    }
                }
            }

            // 1.check $PATH for environment script
            const cmdParsePath = process.platform === 'win32'
                ? `${this.powerShellExecName} -Command "$env:Path -split ';' | Select-String -Pattern 'oneapi$' | foreach{$_.ToString()} | ? {$_.trim() -ne '' }"`
                : 'env | grep \'PATH\' | sed \'s/\'PATH=\'//g; s/:/\\n/g\'| awk \'/oneapi$/\'';
            const paths = execSync(cmdParsePath).toString().split('\n');

            paths.pop();
            paths.forEach(async function(onePath, index, pathList) {
                pathList[index] = join(posix.normalize(onePath.replace('\r', '')).split(/[\\\/]/g).join(posix.sep),
                    `${envScriptName}.${process.platform === 'win32' ? 'bat' : 'sh'}`);
            });

            paths.forEach((path, index) => {
                if (!existsSync(path)) {
                    paths.splice(index, 1);
                }
            });

            if (paths.length > 0) {
                return paths;
            }

            // 2.check in $ONEAPI_ROOT
            const envScriptFromOneapiRoot = join(`${process.env.ONEAPI_ROOT}`, `${envScriptName}.${process.platform === 'win32' ? 'bat' : 'sh'}`);

            if (existsSync(envScriptFromOneapiRoot)) {
                return [envScriptFromOneapiRoot];
            }
            // 3.check in global installation path
            const globalToolkitPath = process.platform === 'win32'
                ? join(`${process.env['ProgramFiles(x86)']}`, 'Intel', 'oneAPI')
                : join('/opt', 'intel', 'oneapi');

            if (envScriptName === 'setvars' && existsSync(join(globalToolkitPath, `${envScriptName}.${process.platform === 'win32' ? 'bat' : 'sh'}`))) {
                return [join(globalToolkitPath, `${envScriptName}.${process.platform === 'win32' ? 'bat' : 'sh'}`)];
            }
            if (envScriptName === 'oneapi-vars') {
                const pathes: string[] = [];

                readdirSync(globalToolkitPath).forEach(folder => {
                    if (existsSync(join(globalToolkitPath, folder, `${envScriptName}.${process.platform === 'win32' ? 'bat' : 'sh'}`))) {
                        pathes.push(join(globalToolkitPath, folder, `${envScriptName}.${process.platform === 'win32' ? 'bat' : 'sh'}`));
                    }
                });
                if (pathes.length > 0) {
                    return pathes;
                }
            }
            if (process.platform !== 'win32') {
                // 4.check in local installation path
                if (envScriptName === 'setvars') {
                    const posiblePath = join(`${process.env.HOME}`, 'intel', 'oneapi', `${envScriptName}.sh`);

                    if (existsSync(posiblePath)) {
                        return [posiblePath];
                    }
                }

                // 5.check in local-custom installation path
                // Path does not require normalization because it is generated only for Linux
                const paths = execSync(`\"\${HOME}\" -mindepth 3 -maxdepth 3 -name \"${envScriptName}.sh\"`).toString().split('\n');

                paths.pop();
                paths.forEach((path, index) => {
                    if (!existsSync(path)) {
                        paths.splice(index, 1);
                    }
                });
                if (paths.length > 0) {
                    return paths;
                }
            }
            return [];
        } catch (err) {
            console.error(err);
            return [];
        }
    }

    private async runSetvars(fspath: string, isDefault: boolean): Promise<boolean> {
        let args = '';

        if (!isDefault) {
            const setvarsConfigPath = await this.getSetvarsConfigPath();

            if (setvarsConfigPath) {
                this.activeEnv = parse(setvarsConfigPath).base;
                vscode.window.showInformationMessage(messages.foundSetvars(setvarsConfigPath));
                args = `--config="${setvarsConfigPath}"`;
            } else {
                return false;
            }
        } else {
            this.activeEnv = messages.defaultOneAPI;
        }

        const cmd: CmdForRunSetvars =
            process.platform === 'win32'
                ? {
                    interpreter: 'cmd.exe',
                    arguments: args
                        ? ['/c', `""${fspath}" ${args} && set"`]
                        : ['/c', `""${fspath}" && set"`]
                }
                : {
                    interpreter: 'bash',
                    arguments: ['-c', `. "${fspath}" ${args} > /dev/null && env -0`]
                };

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: messages.settingUp,
            cancellable: true
        }, async(_progress, token) => {
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
        return new Promise<void>((resolve, reject) => {
            if (token.isCancellationRequested) {
                this.collection.clear();
                return;
            }
            const childProcess = spawn(cmd.interpreter, cmd.arguments, { windowsVerbatimArguments: true })
                .on('close', (code, signal) => {
                    if (code || signal) {
                        this.collection.clear();
                        vscode.window.showErrorMessage(messages.errorRunSetVars(code, signal));
                    }
                    resolve();
                })
                .on('error', (err) => {
                    this.collection.clear();
                    vscode.window.showErrorMessage(`Error: ${err} oneAPI environment not applied. Open settings and search for SETVARS and change the value of SETVARS_CONFIG to specify your custom configuration file, or change the value of ONEAPI_ROOT to specify your installation folder`);
                    reject(err);
                });

            childProcess.stdout.setEncoding('utf8');
            childProcess.stdout?.on('data', (d: string) => {
                const separator = process.platform === 'win32' ? '\n' : '\u0000';
                const vars = d.split(separator);

                vars.forEach(async(l) => {
                    const e = l.indexOf('=');
                    const k = <string>l.substr(0, e);
                    const v = <string>l.substr((e + 1)).replace('\r', '');

                    if (k === '' || v === '') {
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
            childProcess.stderr?.on('data', function(data: string) {
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
    }

    protected setEnvNameToStatusBar(envName: string | undefined): void {
        if (!envName || envName === messages.defaultEnv) {
            this.statusBarItem.text = 'Active environment: '.concat('not selected');
        } else {
            this.statusBarItem.text = 'Active environment: '.concat(envName);
        }
        this.statusBarItem.show();
    }

    protected checkPlatform(): boolean {
        if ((process.platform !== 'win32') && (process.platform !== 'linux')) {
            vscode.window.showErrorMessage(messages.failedToActivate, { modal: true });
            return false;
        }
        return true;
    }

    /**
     * Function to fetch env Script Path and update in CMake Kit file
     */
    protected async getEnvForCMake(): Promise<boolean | undefined> {
        let envScripts = await this.findEnvScript('setvars');
        const oneapiVars = await this.findEnvScript('oneapi-vars');
        // Explicitly check if user pressed Esc key
        if (oneapiVars.length > 0 && oneapiVars[0] === messages.escapeKey) return false;
        envScripts = envScripts.concat(oneapiVars);

        if (envScripts.length === 0) {
            const fileExtension = process.platform === 'win32' ? 'bat' : 'sh';
            const option = await vscode.window.showErrorMessage(
                messages.errorEnvScriptPath(fileExtension),
                messages.installToolkit, messages.setPathToEnvScript);

            if (option === messages.installToolkit) {
                vscode.env.openExternal(vscode.Uri.parse(
                    messages.toolkitsLink));
                return false;
            } else if (option === messages.setPathToEnvScript) {
                const options: vscode.OpenDialogOptions = {
                    canSelectMany: false,
                    filters: {
                        'oneAPI environment script': [fileExtension]
                    }
                };
                const setVarsFileUri = await vscode.window.showOpenDialog(options);

                if (setVarsFileUri && setVarsFileUri[0]) {
                    await this.updateCMakeKits(setVarsFileUri[0].fsPath);
                    return true;
                } else {
                    vscode.window.showErrorMessage(messages.errorSetvarsPath(fileExtension), { modal: true });
                    return false;
                }
            }
            return false;
        } else {
            let envScriptToUse: string | undefined = undefined;
            let userChoice: string | undefined = undefined;

            if (envScripts.length > 1) {
                const options: vscode.QuickPickOptions = {
                    placeHolder: messages.multipleEnvScriptPaths,
                    canPickMany: false
                };
                envScriptToUse = await vscode.window.showQuickPick(envScripts, options);
                // Explicitly check if user pressed Esc (undefined)
                if (!envScriptToUse) {
                    return false;
                }
            } else {
                envScriptToUse = envScripts[0];
                const updateOptions = ["Update", "Skip"];
                userChoice = await vscode.window.showQuickPick(updateOptions, {
                    placeHolder: `${envScriptToUse} script was found. Do you want to update?`,
                    canPickMany: false
                });
            }
            if (userChoice === "Update" || envScripts.length > 1) {
                const isUpdate = await this.updateCMakeKits(envScriptToUse);
                if (isUpdate) vscode.window.showInformationMessage(messages.envScriptFound(envScriptToUse));
                return isUpdate;
            } else {
                return false;
            }
        }
    }
    /**
     * Function to Create/Update the cmake-kits.json File
     */
    private async updateCMakeKits(envScriptPath: string): Promise<boolean> {
        if (!vscode.workspace.workspaceFolders) {
            vscode.window.showErrorMessage("No workspace is open");
            return false;
        }

        const workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        const kitsPath = path.join(workspacePath, messages.vscodeDir, messages.cmakeKitJsonFile);
        let kits = [];

        // Read existing cmake-kits.json if it exists
        if (fs.existsSync(kitsPath)) {
            try {
                const fileData = fs.readFileSync(kitsPath, 'utf8');
                kits = JSON.parse(fileData);
            } catch (err) {
                vscode.window.showErrorMessage("Failed to parse existing cmake-kits.json");
                return false;
            }
        }

        // Find the existing DPC++ kit
        const dpcppExists = kits.find((kit: { name: string, environmentSetupScript: string }) =>
            kit.name === messages.intelOneApiCompiler
        );

        if (dpcppExists) {
            // Update the environment setup script if it's different
            if (dpcppExists.environmentSetupScript !== envScriptPath) {
                dpcppExists.environmentSetupScript = envScriptPath;
                vscode.window.showInformationMessage("Intel oneAPI DPC++/C++ Compiler has been updated in cmake-kits.json");
            } else {
                vscode.window.showInformationMessage("Intel oneAPI DPC++/C++ Compiler entry already exists in cmake-kits.json");
            }
        } else {
            // Add a new DPC++ kit if it doesn't exist
            kits.push({
                name: messages.intelOneApiCompiler,
                environmentSetupScript: envScriptPath,
                compilers: {
                    C: 'icx',
                    CXX: 'icpx'
                }
            });
            vscode.window.showInformationMessage("Intel oneAPI DPC++/C++ Compiler has been added in cmake-kits.json");
        }
        try {
            // Ensure .vscode folder exists
            const vscodeDir = path.join(workspacePath, messages.vscodeDir);
            if (!fs.existsSync(vscodeDir)) {
                fs.mkdirSync(vscodeDir);
            }
            // Write updated kits back
            fs.writeFileSync(kitsPath, JSON.stringify(kits, null, 4));
            return true; // Successfully updated
        } catch (error) {
            vscode.window.showErrorMessage("Failed to write to cmake-kits.json");
            return false;
        }
    }
}

export class MultiRootEnv extends OneApiEnv {
    private storage: Storage;
    private envCollection: string[];
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        super(context);
        this.context = context;
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
            vscode.window.showErrorMessage(messages.failedToCheckPwsh, { modal: true });
            return;
        }
        if (this.initialEnv.get('SETVARS_COMPLETED')) {
            await vscode.window.showWarningMessage(messages.errorOneApiInstalled, { modal: true });
            return;
        }

        if (this.collection.get('SETVARS_COMPLETED')) {
            this.restoreVscodeEnv();
        }

        if (await this.getEnvironment(isDefault)) {
            if (!this.envCollection.includes(this.activeEnv)) {
                this.envCollection.push(this.activeEnv);
            } else {
                vscode.window.showInformationMessage(messages.errorEnvSameName(this.activeEnv));
            }
            const activeEnvCollection = new Map();

            this.collection.forEach((k, m) => {
                activeEnvCollection.set(k, m.value);
            });
            await this.storage.writeEnvToExtensionStorage(this.activeEnv, activeEnvCollection);
            await this.context.globalState.update(messages.isOneApiEnvSetBeforeExit, true);
            await notifyUserToReloadStaleTerminals();

        }
    }

    async clearEnvironment(): Promise<void> {
        if (!this.checkPlatform()) {
            return;
        }
        if (this.activeEnv === messages.defaultEnv) {
            vscode.window.showInformationMessage(messages.notConfiguredEnvVars);
            return;
        }
        await this.restoreVscodeEnv();
        await this.removeEnv(this.activeEnv);
        vscode.window.showInformationMessage(messages.removedEnv);
    }

    async switchEnv(): Promise<boolean> {
        if (!this.checkPlatform()) {
            return false;
        }
        if (this.envCollection.length < 2) {
            const tmp = await vscode.window.showInformationMessage(messages.alternateEnv, messages.openSettings, messages.learnConfig);

            if (tmp === messages.openSettings) {
                await vscode.commands.executeCommand('workbench.action.openSettings', '@ext:intel-corporation.oneapi-environment-configurator');
            }
            if (tmp === messages.learnConfig) {
                vscode.env.openExternal(vscode.Uri.parse(process.platform === 'win32'
                    ? messages.learnConfigLinkWin
                    : messages.learnConfigLinkLinMac));
            }
            return false;
        }
        const optinosItems: vscode.QuickPickItem[] = [];
        const options: vscode.InputBoxOptions = {
            placeHolder: messages.selectConfigFileEnv
        };

        this.envCollection.forEach(async function(oneEnv) {
            optinosItems.push({
                label: oneEnv,
                description: oneEnv === messages.defaultOneAPI ? 'To initialize the default oneAPI environment' : oneEnv === messages.defaultEnv ? 'To initialize the environment without oneAPI' : `To initialize the oneAPI environment using the ${oneEnv} file`
            });
        });
        optinosItems.push({
            label: messages.skip,
            description: messages.notChangeEnv
        });
        const env = await vscode.window.showQuickPick(optinosItems, options);

        if (!env || env?.label === messages.skip) {
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

        this.envCollection = this.envCollection.filter(function(item) {
            return item !== nameToDel;
        });
        await this.storage.writeEnvToExtensionStorage(env, undefined);
        await this.context.globalState.update(messages.isOneApiEnvSetBeforeExit, false);
        await notifyUserToReloadStaleTerminals();
        this.activeEnv = messages.defaultEnv;
        this.setEnvNameToStatusBar(undefined);
    }

    private async applyEnv(envName: string): Promise<boolean> {
        this.restoreVscodeEnv();
        this.collection.clear();
        const env = await this.storage.readEnvFromExtensionStorage(envName);

        if (!env || env.size === 0) {
            await this.context.globalState.update(messages.isOneApiEnvSetBeforeExit, false);
            await notifyUserToReloadStaleTerminals();
            return false;
        }
        for (const keyValuePair of env) {
            this.collection.append(keyValuePair[0], keyValuePair[1]);
            process.env[keyValuePair[0]] = keyValuePair[1];
        }
        await this.context.globalState.update(messages.isOneApiEnvSetBeforeExit, true);
        await notifyUserToReloadStaleTerminals();
        return true;
    }

    private async updateEnvsInStorage(envName: string): Promise<void> {
        const env = await this.storage.readEnvFromExtensionStorage(envName);

        if (!env) {
            await this.addEnv(this.activeEnv);
        }
    }

    /**
     * Function to Configure the Intel Compiler for CMake Tools
     */
    async configureIntelCompilerForCMake(): Promise<void> {
        const cmakeExtension = vscode.extensions.getExtension('ms-vscode.cmake-tools');
        if (cmakeExtension) {
            if (!cmakeExtension.isActive) {
                await cmakeExtension.activate();
            }
            // Update cmake-kits.json
            if ((await this.getEnvForCMake()) === true) {

                // Prompt user before reloading
                const reload = await vscode.window.showInformationMessage(
                    "Intel Compiler configuration has been updated. Reload required for changes to take effect.",
                    "Reload Now",
                    "Later"
                );

                if (reload === "Reload Now") {
                    await vscode.commands.executeCommand('workbench.action.reloadWindow');
                }
            }
        } else {
            vscode.window.showErrorMessage("CMake Tools extension not detected. Please install it to continue.");
        }
    }
}