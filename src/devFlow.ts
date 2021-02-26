/**
 * Copyright (c) Intel Corporation
 * Licensed under the MIT License. See the project root LICENSE
 * 
 * SPDX-License-Identifier: MIT
 */

'use strict';
import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as fs from 'fs';

const debugConfig = {
    name: '(gdb-oneapi) ${workspaceFolderBasename} Launch',
    type: 'cppdbg',
    request: 'launch',
    preLaunchTask: '',
    postDebugTask: '',
    program: '',
    args: [],
    stopAtEntry: false,
    cwd: '${workspaceFolder}',
    environment: [],
    externalConsole: false,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    MIMode: 'gdb',
    miDebuggerPath: 'gdb-oneapi',
    setupCommands:
        [
            {
                description: 'Enable pretty-printing for gdb',
                text: '-enable-pretty-printing',
                ignoreFailures: true
            }
        ]
};

export class DevFlow {
    terminal: vscode.Terminal | undefined;
    context: vscode.ExtensionContext;
    collection: vscode.EnvironmentVariableCollection;
    constructor(c: vscode.ExtensionContext) {
        this.context = c;
        this.collection = this.context.environmentVariableCollection;
    }

    async getworkspaceFolder(): Promise<vscode.WorkspaceFolder | undefined> {
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

    async checkExistingTerminals(): Promise<boolean | undefined> {
        if (vscode.window.terminals !== undefined) {
            await vscode.window.showInformationMessage(`Please note that all newly created terminals after environment setup will contain oneAPI environment`, { modal: true });
        };
        return true;
    }

    async checkNewTerminals(terminal: vscode.Terminal) {
        if (this.collection.get('SETVARS_COMPLETED')) {
            vscode.commands.executeCommand('workbench.action.terminal.renameWithArg', { name: `Intel oneAPI: ${terminal.name}` });
        };
    }
    async isTerminalAcceptable(): Promise<boolean> {
        try {
            if (process.platform === 'win32') {
                const out = child_process.execSync(`pwsh -Command "(get-host).version.Major"`).toString();
                const psVersion = parseInt(out);
                if (isNaN(psVersion)) {
                    return false;
                } else {
                    return psVersion >= 7 ? true : false;
                };
            }
            return true;
        }
        catch (err) {
            console.error(err);
            return false;
        }
    }

    async checkAndGetEnvironment(): Promise<boolean | undefined> {
        if (!this.collection.get('SETVARS_COMPLETED')) {
            if (!await this.isTerminalAcceptable()) {
                vscode.window.showErrorMessage("The terminal does not meet the requirements. If you are using PowerShell it must be version 7 or higher.");
                vscode.window.showErrorMessage("oneAPI environment not applied.");
                return false;
            }
            let setvarsPath = await this.findSetvarsPath();
            if (setvarsPath === undefined) {
                vscode.window.showInformationMessage(`Could not find path to setvars.${process.platform === 'win32' ? 'bat' : 'sh'}. Provide it yourself.`);
                const options: vscode.OpenDialogOptions = {
                    canSelectMany: false,
                    filters: {
                        'oneAPI setvars file': [process.platform === 'win32' ? 'bat' : 'sh'],
                    }
                };

                let setVarsFileUri;
                setVarsFileUri = await vscode.window.showOpenDialog(options);
                if (setVarsFileUri && setVarsFileUri[0]) {
                    return this.getEnvironment(setVarsFileUri[0].fsPath);
                } else {
                    vscode.window.showErrorMessage(`Path to setvars.${process.platform === 'win32' ? 'bat' : 'sh'} invalid, The oneAPI environment was not be applied.\n Please check setvars.${process.platform === 'win32' ? 'bat' : 'sh'} and try again.`, { modal: true });
                    return false;
                }
            } else {
                vscode.window.showInformationMessage(`oneAPI environment script was found in the following path: ${setvarsPath}`);
                return this.getEnvironment(setvarsPath);
            }
        }
        return true;
    }
    async clearEnvironment(): Promise<boolean> {
        this.collection.clear();
        vscode.window.showInformationMessage("oneAPI environment removed successfully.");
        return true;
    }
    async getEnvironment(fspath: string): Promise<boolean> {
        let cmd = process.platform === 'win32' ?
            `"${fspath}" > NULL && set` :
            `bash -c ". ${fspath}  > /dev/null && printenv"`;
        let a = child_process.exec(cmd);

        a.stdout?.on('data', (d: string) => {
            let vars = d.split('\n');
            vars.forEach(l => {
                let e = l.indexOf('=');
                let k = <string>l.substr(0, e);
                let v = <string>l.substr((e + 1));
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
            });
        });
        vscode.window.showInformationMessage("oneAPI environment applied successfully.");
        await this.checkExistingTerminals();
        return true;
    }

    async findSetvarsPath(): Promise<string | undefined> {
        try {
            // 1.check $PATH for setvars.sh
            let cmdParsePath = process.platform === 'win32' ?
                `pwsh -Command "$env:Path -split ';' | Select-String -Pattern 'oneapi$' | foreach{$_.ToString()} | ? {$_.trim() -ne '' }"` :
                "env | grep 'PATH' | sed 's/'PATH='//g; s/:/\\n/g'| awk '/oneapi$/'";
            let paths = child_process.execSync(cmdParsePath).toString().split('\n');
            paths.pop();
            if (paths.length > 0 && paths.length !== 1) {
                vscode.window.showInformationMessage("Found multiple paths to oneAPI environment script. Choose which one to use.");
                let tmp = await vscode.window.showQuickPick(paths);
                if (tmp) {
                    return tmp;
                }
            } else {
                if (paths.length === 1) {
                    return paths[0] + `/setvars.${process.platform === 'win32' ? 'bat' : 'sh'}`;
                }
            }
            // 2.check in $ONEAPI_ROOT
            if (fs.existsSync(`${process.env.ONEAPI_ROOT}/setvars.${process.platform === 'win32' ? 'bat' : 'sh'}`)) {
                return `${process.env.ONEAPI_ROOT}/setvars.${process.platform === 'win32' ? 'bat' : 'sh'}`;
            }
            // 3.check in global installation path
            let globalSetvarsPath = process.platform === 'win32' ?
                `${process.env['ProgramFiles(x86)']}\\Intel\\oneAPI\\setvars.bat` :
                '/opt/intel/oneapi/setvars.sh';
            if (fs.existsSync(globalSetvarsPath)) {
                return globalSetvarsPath;
            }
            if (process.platform !== 'win32') {
                {
                    // 4.check in local installation path
                    if (fs.existsSync(`${process.env.HOME}/intel/oneapi/setvars.sh`)) {
                        return `${process.env.HOME}/intel/oneapi/setvars.sh`;
                    }
                    //5.check in local-custom installation path
                    let paths = child_process.execSync("find \"${HOME}\" -mindepth 3 -maxdepth 3 -name \"setvars.sh\"").toString().split('\n');
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

    async makeTasksFile(): Promise<boolean> {
        if(!await this.checkAndGetEnvironment()){
            return false;
        };
        let buildSystem = 'cmake';
        let workspaceFolder = await this.getworkspaceFolder();
        if (workspaceFolder === undefined) {
            return false; // for unit tests
        }
        let projectRootDir = `${workspaceFolder?.uri.fsPath}`;
        if (fs.existsSync(`${workspaceFolder?.uri.fsPath}/Makefile`)) {
            if (process.platform === 'win32') {
                vscode.window.showInformationMessage(`Working with makefile project is not available for Windows.`, { modal: true });
                return false;
            }
            buildSystem = 'make';
        }
        const buildTargets = await this.getTargets(projectRootDir, buildSystem);
        let isContinue = true;
        let options: vscode.InputBoxOptions = {
            placeHolder: `Choose target from ${buildSystem} or push ESC for exit`
        };
        do {
            let selection = await vscode.window.showQuickPick(buildTargets, options);
            if (!selection) {
                isContinue = false;
                return true;
            }
            const taskConfig = vscode.workspace.getConfiguration('tasks');
            let taskConfigValue = {
                label: selection,
                command: ``,
                type: 'shell',
                options: {
                    cwd: `${projectRootDir}`
                }
            };
            switch (buildSystem) {
                case 'make': {
                    let cmd = process.platform === 'win32' ?
                        `nmake ${selection} /F ${projectRootDir}/Makefile` :
                        `make ${selection} -f ${projectRootDir}/Makefile`;
                    taskConfigValue.command += cmd;
                    break;
                }
                case 'cmake': {
                    let cmd = process.platform === 'win32' ?
                        `$val=Test-Path -Path 'build'; if($val -ne $true) {New-Item -ItemType directory -Path 'build'}; cmake  -S . -B 'build' -G 'NMake Makefiles'; cd build; nmake ${selection}` :
                        `mkdir -p build && cmake  -S . -B build && cmake --build build && cmake --build build --target ${selection}`;
                    taskConfigValue.command += cmd;
                    break;
                }
                default: {
                    isContinue = false;
                    break;
                }
            }
            let config: any = taskConfig['tasks'];
            if (config === undefined) {
                config = [taskConfigValue];
            } else {
                let isUniq: boolean = await this.checkTaskItem(config, taskConfigValue);
                if (!isUniq) {
                    vscode.window.showInformationMessage(`Task for "${taskConfigValue.label}" was skipped as duplicate`);
                    return false;
                }
                config.push(taskConfigValue);
            };
            taskConfig.update('tasks', config, false);
            vscode.window.showInformationMessage(`Task for "${taskConfigValue.label}" was added`);
        } while (isContinue);
        return true;
    }

    async makeLaunchFile(): Promise<boolean> {
        if(!await this.checkAndGetEnvironment()){
            return false;
        };
        let buildSystem = 'cmake';
        let workspaceFolder = await this.getworkspaceFolder();
        if (workspaceFolder === undefined) {
            return false; // for unit tests
        }
        let projectRootDir = `${workspaceFolder?.uri.fsPath}`;
        if (fs.existsSync(`${workspaceFolder?.uri.fsPath}/Makefile`)) {
            buildSystem = 'make';
        }
        let execFiles: string[] = [];
        let execFile;
        switch (buildSystem) {
            case 'make': {
                execFiles = await this.findExecutables();
                break;
            }
            case 'cmake': {
                execFiles = await this.findExecutables();
                if (execFiles.length === 0) {
                    let execNames = await this.getExecNameFromCmake(projectRootDir);
                    execNames.forEach((name: string) => {
                        execFiles.push(`${projectRootDir}/build/src/`.concat(name));
                    });
                    if (execFiles.length !== 0) {
                        vscode.window.showInformationMessage(`Could not find executable files.\nThe name of the executable will be taken from CMakeLists.txt, and the executable is expected to be located in /build/src.`);
                    }
                }

                break;
            }
            default: {
                break;
            }
        }
        execFiles.push(`Use fake executable a.out to create a debug template`);
        execFiles.push(`Provide path to the executable file manually`);
        let isContinue = true;
        let options: vscode.InputBoxOptions = {
            placeHolder: `Choose executable target or push ESC for exit`
        };
        do {
            let selection = await vscode.window.showQuickPick(execFiles, options);
            if (!selection) {
                isContinue = false;
                break;
            }
            if (selection === `Use fake executable a.out to create a debug template`) {
                selection = 'a.out';
                await vscode.window.showInformationMessage(`Note: Launch template cannot be launchd immediately after creation.\nPlease edit the launch.json file ,according to your needs before run.`, { modal: true });

            }
            if (selection === `Provide path to the executable file manually`) {
                const options: vscode.OpenDialogOptions = {
                    canSelectMany: false
                };
                let pathToExecFile = await vscode.window.showOpenDialog(options);
                if (pathToExecFile && pathToExecFile[0]) {
                    execFile = pathToExecFile[0].fsPath;
                } else {
                    await vscode.window.showErrorMessage(`Path to the executable file invalid.\nPlease check path and name and try again.`, { modal: true });
                    return false;
                }
            } else {
                execFile = selection;
            }

            const launchConfig = vscode.workspace.getConfiguration('launch');
            const configurations = launchConfig['configurations'];

            debugConfig.name = selection === 'a.out' ?
                `Launch_template` :
                `${buildSystem}:${execFile.split('/').pop()}`;
            debugConfig.program = `${execFile}`;
            await this.addTasksToLaunchConfig();
            let isUniq: boolean = await this.checkLaunchItem(configurations, debugConfig);
            if (isUniq) {
                configurations.push(debugConfig);
                launchConfig.update('configurations', configurations, false);
                vscode.window.showInformationMessage(`Launch configuration "${debugConfig.name}" for "${debugConfig.program}" was added`);
            } else {
                vscode.window.showInformationMessage(`Launch configuration "${debugConfig.name}" for "${debugConfig.program}" was skipped as duplicate`);
                return false;
            }
        } while (isContinue);
        vscode.window.showWarningMessage(`At the moment, debugging is only available on the CPU and FPGA_Emu accelerators.\nOperation on other types of accelerators is not guaranteed.`, { modal: true });
        return true;
    }

    async checkTaskItem(listItems: any, newItem: any): Promise<boolean> {
        if (listItems.length === 0) {
            return true; // for tests
        }
        restartcheck:
        for (var existItem in listItems) {
            let dialogOptions: string[] = [`Skip target`, `Rename task`];
            if (newItem.label === listItems[existItem].label) {
                let options: vscode.InputBoxOptions = {
                    placeHolder: `Task for target "${newItem.label}" already exist. Do you want to rename current task or skip target?`
                };
                let selection = await vscode.window.showQuickPick(dialogOptions, options);
                if (!selection || selection === `Skip target`) {
                    return false;
                }
                else {
                    let inputBoxText: vscode.InputBoxOptions = {
                        placeHolder: "Please provide new task name:"
                    };
                    let inputLabel = await vscode.window.showInputBox(inputBoxText);
                    newItem.label = inputLabel;
                    continue restartcheck;
                }
            }
        }
        return true;
    }

    async checkLaunchItem(listItems: any, newItem: any): Promise<boolean> {
        if (listItems.length === 0) {
            return true; // for tests
        }
        restartcheck:
        for (var existItem in listItems) {
            let dialogOptions: string[] = [`Skip target`, `Rename configuration`];
            if (newItem.name === listItems[existItem].name) {
                let options: vscode.InputBoxOptions = {
                    placeHolder: `Launch configuration for target "${newItem.name}" already exist. Do you want to rename current configuration or skip target?`
                };
                let selection = await vscode.window.showQuickPick(dialogOptions, options);
                if (!selection || selection === `Skip target `) {
                    return false;
                }
                else {
                    let inputBoxText: vscode.InputBoxOptions = {
                        placeHolder: "Please provide new configuration name:"
                    };
                    let inputName = await vscode.window.showInputBox(inputBoxText);
                    newItem.name = inputName;
                    continue restartcheck;
                }
            }
        }
        return true;
    }

    async addTasksToLaunchConfig(): Promise<boolean> {
        const taskConfig = vscode.workspace.getConfiguration('tasks');
        let existTasks: any = taskConfig['tasks'];
        let tasksList: string[] = [];
        for (var task in existTasks) {
            tasksList.push(existTasks[task].label);
        }
        tasksList.push('Skip adding preLaunchTask');
        let preLaunchTaskOptions: vscode.InputBoxOptions = {
            placeHolder: `Choose task for adding to preLaunchTask`
        };
        let preLaunchTask = await vscode.window.showQuickPick(tasksList, preLaunchTaskOptions);
        if (preLaunchTask && preLaunchTask !== 'Skip adding preLaunchTask') {
            debugConfig.preLaunchTask = preLaunchTask;
        }
        tasksList.pop();
        let postDebugTaskOptions: vscode.InputBoxOptions = {
            placeHolder: `Choose task for adding to postDebugTask`
        };
        tasksList.push('Skip adding postDebugTask');
        let postDebugTask = await vscode.window.showQuickPick(tasksList, postDebugTaskOptions);
        if (postDebugTask && postDebugTask !== 'Skip adding postDebugTask') {
            debugConfig.postDebugTask = postDebugTask;
        }
        return true;
    }
    async findExecutables(): Promise<string[]> {
        try {
            const cmd = process.platform === 'win32' ?
                `pwsh -command "$execName=Get-ChildItem ${vscode.workspace.rootPath} -recurse -include "*.exe" -Name"; if($execName -ne $null){ $execPath='${vscode.workspace.rootPath}'+'/'+$execName; echo $execPath}` :
                `find ${vscode.workspace.rootPath} -maxdepth 3 -exec file {} \\; | grep -i elf | cut -f1 -d ':'`;
            let pathsToExecutables = child_process.execSync(cmd).toString().split('\n');
            pathsToExecutables.pop();
            return pathsToExecutables;
        }
        catch (err) {
            console.log(err);
            return [];
        }
    }
    async getExecNameFromCmake(projectRootDir: string): Promise<string[]> {
        try {
            let execNames: string[] = [];
            let cmd = process.platform === 'win32' ?
                `where /r ${vscode.workspace.rootPath} CMakeLists.txt` :
                `find ${vscode.workspace.rootPath} -name 'CMakeLists.txt'`;
            let pathsToCmakeLists = child_process.execSync(cmd).toString().split('\n');
            pathsToCmakeLists.pop();
            pathsToCmakeLists.forEach((path) => {
                let cmd = process.platform === 'win32' ?
                    `pwsh -Command "$execNames=(gc ${path}) | Select-String -Pattern '\\s*add_executable\\s*\\(\\s*(\\w*)' ; $execNames.Matches | ForEach-Object -Process {echo $_.Groups[1].Value} | Select-Object -Unique | ? {$_.trim() -ne '' } "` :
                    `awk '/^ *add_executable *\\( *[^\$]/' ${path} | sed -e's/add_executable *(/ /; s/\\r/ /' | awk '{print $1}' | uniq`;
                execNames = execNames.concat(child_process.execSync(cmd, { cwd: projectRootDir }).toString().split('\n'));
                execNames.pop();
            });

            return execNames;
        }
        catch (err) {
            console.error(err);
            return [];
        }
    }

    async getTargets(projectRootDir: string, buildSystem: string): Promise<string[]> {
        try {
            let targets: string[];
            switch (buildSystem) {
                case 'make': {
                    targets = child_process.execSync(
                        `make -pRrq : 2>/dev/null | awk -v RS= -F: '/^# File/,/^# Finished Make data base/ {if ($1 !~ "^[#.]") {print $1}}' | egrep -v '^[^[:alnum:]]' | sort`,
                        { cwd: projectRootDir }).toString().split('\n');
                    targets.pop();
                    return targets;
                }
                case 'cmake': {
                    targets = ['all', 'clean'];

                    let cmd = process.platform === 'win32' ?
                        `where /r ${vscode.workspace.rootPath} CMakeLists.txt` :
                        `find ${vscode.workspace.rootPath} -name 'CMakeLists.txt'`;
                    let pathsToCmakeLists = child_process.execSync(cmd).toString().split('\n');
                    pathsToCmakeLists.pop();
                    pathsToCmakeLists.forEach((path) => {
                        let cmd = process.platform === 'win32' ?
                            `pwsh -Command "$targets=(gc ${path}) | Select-String -Pattern '\\s*add_custom_target\\s*\\(\\s*(\\w*)' ; $targets.Matches | ForEach-Object -Process {echo $_.Groups[1].Value} | Select-Object -Unique | ? {$_.trim() -ne '' } "` :
                            `awk '/^ *add_custom_target/' ${path} | sed -e's/add_custom_target *(/ /; s/\\r/ /' | awk '{print $1}' | uniq`;
                        targets = targets.concat(child_process.execSync(cmd, { cwd: projectRootDir }).toString().split('\n'));
                        targets.pop();
                    });
                    return targets;
                }
                default: {
                    break;
                }
            }
            return [];
        }
        catch (err) {
            console.error(err);
            return [];
        }
    };
}