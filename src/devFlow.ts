import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as fs from 'fs';

const debugConfig = {
    name: '(gdb-oneapi) ${workspaceFolderBasename} Launch',
    type: 'cppdbg',
    request: 'launch',
    program: '${workspaceFolder}/${workspaceFolderBasename}',
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

    async openShellOneAPI(): Promise<void> {
        await this.checkAndGetEnvironment();
        if (process.platform === 'win32') {  // for extraordinary cases
            await vscode.window.showInformationMessage("This feature is not available for Windows OS", "Exit");
            return;
        }
        if (this.terminal === undefined) {
            this.terminal = vscode.window.createTerminal({ name: "oneAPI: bash", env: (this.collection as any), strictEnv: true });
        }
        this.terminal.show();
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

    async checkAndGetEnvironment(): Promise<boolean | undefined> {
        if (!process.env.SETVARS_COMPLETED) {
            let setVarsFileUri;
            let whereSetVarsOptions: string[] = [];
            whereSetVarsOptions.push(`Provide setvars.${process.platform === 'win32' ? 'bat' : 'sh'} manually`);
            if (fs.existsSync(`${process.env.HOME}/intel/oneapi/setvars.sh`)) {
                whereSetVarsOptions.push(`${process.env.HOME}/intel/oneapi/setvars.sh`);
            }
            if (fs.existsSync(`/opt/intel/oneapi/setvars.sh`)) {
                whereSetVarsOptions.push(`/opt/intel/oneapi/setvars.sh`);
            }

            let setVarsOptions: vscode.InputBoxOptions = {
                placeHolder: "Please provide path to the setvars file or push ESC for exit"
            };
            let selection = await vscode.window.showQuickPick(whereSetVarsOptions, setVarsOptions);
            if (!selection) {
                vscode.window.showErrorMessage(`No path specified to setvars.${process.platform === 'win32' ? 'bat' : 'sh'}. The oneAPI environment will not be applied.\nThis environment is necessary for oneAPI applications to work correctly!`, { modal: true });
                return false;
            }
            if (selection === `Provide setvars.${process.platform === 'win32' ? 'bat' : 'sh'} manually`) {
                const options: vscode.OpenDialogOptions = {
                    canSelectMany: false,
                    filters: {
                        'oneAPI setvars file': [process.platform === 'win32' ? 'bat' : 'sh'],
                    }
                };
                setVarsFileUri = await vscode.window.showOpenDialog(options);
                if (setVarsFileUri && setVarsFileUri[0]) {
                    return this.getEnvironment(setVarsFileUri[0].fsPath);
                } else {
                    vscode.window.showErrorMessage(`Path to setvars.${process.platform === 'win32' ? 'bat' : 'sh'} invalid, The oneAPI environment was not be applied.\n Please check setvars.${process.platform === 'win32' ? 'bat' : 'sh'} and try again.`, { modal: true });
                    return false;
                }
            } else {
                return this.getEnvironment(selection);
            }
        }
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
                if (k === "") {
                    return;
                }
                let v = <string>l.substr((e + 1));

                if (process.env[k] !== v) {
                    if (!process.env[k]) {
                        this.collection.append(k, v);
                    } else {
                        this.collection.replace(k, v);
                    }
                }
                (process.env as any)[k] = v; // Spooky Magic
            });
        });
        vscode.window.showInformationMessage("oneAPI environment applied successfully.");
        return true;
    }

    async makeTasksFile(): Promise<boolean> {
        await this.checkAndGetEnvironment();
        let buildSystem = 'cmake';
        let workspaceFolder = await this.getworkspaceFolder();
        if (workspaceFolder === undefined) {
            return false; // for unit tests
        }
        let buildDir = `${workspaceFolder?.uri.fsPath}`;
        if (fs.existsSync(`${workspaceFolder?.uri.fsPath}/Makefile`)) {
            buildSystem = 'make';
        }
        const buildTargets = await this.getTargets(buildDir, buildSystem);
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
                    cwd: `${buildDir}`
                }
            };
            switch (buildSystem) {
                case 'make': {
                    taskConfigValue.command += `make ${selection} -f ${buildDir}/Makefile`;
                    break;
                }
                case 'cmake': {
                    let cmd = process.platform === 'win32' ?
                        `if not exist build mkdir build && cmake  -S . -B build -G "NMake Makefiles" && nmake ${selection}` :
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
            vscode.window.showInformationMessage(`Task for "${taskConfigValue.label}" was added`);
            if (config === undefined) {
                config = [taskConfigValue];
            } else {
                config.push(taskConfigValue);
            };
            taskConfig.update('tasks', config, false);
        } while (isContinue);
        return true;
    }

    async makeLaunchFile(): Promise<boolean> {
        await this.checkAndGetEnvironment();
        let buildSystem = 'cmake';
        let workspaceFolder = await this.getworkspaceFolder();
        if (workspaceFolder === undefined) {
            return false; // for unit tests
        }
        let buildDir = `${workspaceFolder?.uri.fsPath}`;
        if (fs.existsSync(`${workspaceFolder?.uri.fsPath}/Makefile`)) {
            buildSystem = 'make';
        }
        let execFiles: string[] = [];
        let execFile;
        switch (buildSystem) {
            case 'make': {
                vscode.window.showErrorMessage(`Auto-search of the executable file is not available for Makefiles.\nPlease specify the file to run manually.`);
                break;
            }
            case 'cmake': {
                execFiles = await this.getExecNameFromCmake(buildDir);
                break;
            }
            default: {
                break;
            }
        }
        execFiles.push(`Provide path to the executable file manually`);
        let isContinue = true;
        let options: vscode.InputBoxOptions = {
            placeHolder: `Choose executable target from ${buildSystem} or push ESC for exit`
        };
        do {
            let selection = await vscode.window.showQuickPick(execFiles, options);
            if (!selection) {
                isContinue = false;
                break;
            }

            if (selection === `Provide path to the executable file manually`) {
                const options: vscode.OpenDialogOptions = {
                    canSelectMany: false
                };
                let pathToExecFile = await vscode.window.showOpenDialog(options);
                if (pathToExecFile && pathToExecFile[0]) {
                    execFile = pathToExecFile[0].fsPath;
                } else {
                    vscode.window.showErrorMessage(`Path to the executable file invalid.\nPlease check path and name and try again.`, { modal: true });
                    return false;
                }
            } else {
                execFile = selection;
            }

            const launchConfig = vscode.workspace.getConfiguration('launch');
            const configurations = launchConfig['configurations'];
            debugConfig.name = `${buildSystem}:${execFile.split('/').pop()}`;
            debugConfig.program = `${execFile}`;
            configurations.push(debugConfig);
            launchConfig.update('configurations', configurations, false);
            vscode.window.showInformationMessage(`Launch configuration "${debugConfig.name}" for "${debugConfig.program}" was added`);
        } while (isContinue);
        vscode.window.showWarningMessage(`At the moment, debugging is only available on the CPU and FPGA_Emu accelerators.\nOperation on other types of accelerators is not guaranteed.`, { modal: true });
        return true;
    }

    async getExecNameFromCmake(buildDir: string): Promise<string[]> {
        let execNames: string[] = [];
        let cmd = process.platform === 'win32' ?
            `where /r ${vscode.workspace.rootPath} CMakeLists.txt` :
            `find ${vscode.workspace.rootPath} -name 'CMakeLists.txt'`;
        let pathsToCmakeLists = child_process.execSync(cmd).toString().split('\n');
        pathsToCmakeLists.pop();
        pathsToCmakeLists.forEach((path) => {
            let cmd = process.platform === 'win32' ?
                `powershell -Command "$execNames=(gc ${path}) | Select-String -Pattern '\\s*add_executable\\((\\w*)' ; $execNames.Matches | ForEach-Object -Process {echo $_.Groups[1].Value} | Select-Object -Unique | ? {$_.trim() -ne '' } "` :
                `awk '/^ *add_executable\\( *[^\$]/' ${path} | sed -e's/add_executable(/ /' | awk '{print $1}' | uniq`;
            execNames = execNames.concat(child_process.execSync(cmd, { cwd: buildDir }).toString().split('\n'));
            execNames.pop();
        });
        return execNames;
    }

    async getTargets(buildDirPath: string, buildSystem: string): Promise<string[]> {
        let targets: string[];
        switch (buildSystem) {
            case 'make': {
                targets = child_process.execSync(
                    `make -pRrq : 2>/dev/null | awk -v RS= -F: '/^# File/,/^# Finished Make data base/ {if ($1 !~ "^[#.]") {print $1}}' | egrep -v '^[^[:alnum:]]' | sort`,
                    { cwd: buildDirPath }).toString().split('\n');
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
                        `powershell -Command "$targets=(gc ${path}) | Select-String -Pattern '\\s*add_custom_target\\((\\w*)' ; $targets.Matches | ForEach-Object -Process {echo $_.Groups[1].Value} | Select-Object -Unique | ? {$_.trim() -ne '' } "` :
                        `awk '/^ *add_custom_target/' ${path} | sed -e's/add_custom_target(/ /' | awk '{print $1}' | uniq`;
                    targets = targets.concat(child_process.execSync(cmd, { cwd: buildDirPath }).toString().split('\n'));
                    targets.pop();
                });
                return targets;
            }
            default: {
                break;
            }
        }
        return [];
    };
}