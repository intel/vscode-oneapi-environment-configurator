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

    async runExtension(): Promise<boolean | undefined> {
        let workspaceFolder = await this.getworkspaceFolder();
        if (workspaceFolder === undefined) {
            vscode.window.showErrorMessage("Cannot find the working directory. Please add one or more working directories and try again.");
            vscode.window.showInformationMessage("Please add one or more working directories and try again.");
            return undefined; // for unit tests
        }
        await this.checkAndGetEnvironment();
        await this.makeJsonsFiles(workspaceFolder);
        await this.openShellOneAPI();

        return true; // for unit tests
    }

    async openShellOneAPI(): Promise<void> {
        let dialogOptions: string[] = ['Yes', 'No'];
        let options: vscode.InputBoxOptions = {
            placeHolder: "Create Intel oneAPI DevFlow terminal?"
        };
        let selection = await vscode.window.showQuickPick(dialogOptions, options);
        if (!selection || selection === 'No') {
            return;
        }

        if (this.terminal === undefined) {
            this.terminal = vscode.window.createTerminal({ name: "Intel oneAPI DevFlow: bash", env: this.collection as any, strictEnv: true });
        }
        this.terminal.show();
        await vscode.window.showInformationMessage("Hi, I'm a oneapi terminal. I look a little weird, but I'm really working.\nSergey B will fix me in the next update.\nIn the meantime try to write 'pwd' and find out where you are.", "Ok,I won't be too hard on you");
    }

    async getworkspaceFolder(): Promise<vscode.WorkspaceFolder | undefined> {
        if (vscode.workspace.workspaceFolders?.length === 1) {
            return vscode.workspace.workspaceFolders[0];
        }
        let selection = await vscode.window.showWorkspaceFolderPick();
        if (!selection) {
            return undefined; // for unit tests
        }
        return selection;
    }

    async checkAndGetEnvironment(): Promise<void> {
        if (!process.env.SETVARS_COMPLETED) {
            await vscode.window.showInformationMessage("Please provide path to the setvars file");
            const options: vscode.OpenDialogOptions = {
                canSelectMany: false,
                openLabel: 'Select',
                filters: {
                    'oneAPI setvars file': [process.platform === 'win32' ? 'bat' : 'sh'],
                }
            };
            let fileUri = await vscode.window.showOpenDialog(options);
            if (fileUri && fileUri[0]) {
                this.getEnvironment(fileUri[0].fsPath);
            }
        }
    }

    async getEnvironment(fspath: string) {
        let command = process.platform === 'win32' ?
            `"${fspath}" > NULL && set` :
            `bash -c ". ${fspath}  > /dev/null && printenv"`;
        let a = child_process.exec(command);

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
    }

    async makeJsonsFiles(workspaceFolder: vscode.WorkspaceFolder): Promise<boolean> {
        let buildSystem = 'cmake';
        let buildDir = `${workspaceFolder?.uri.fsPath}`;
        if (fs.existsSync(`${workspaceFolder?.uri.fsPath}/Makefile`)) {
            buildSystem = 'make';
        }
        await this.makeTasksFile(buildSystem, buildDir);
        await this.makeLaunchFile(buildSystem, buildDir);
        return true;
    }

    async makeTasksFile(buildSystem: string, buildDir: string): Promise<boolean> {
        const buildTargets = await this.getTargets(buildDir, buildSystem);
        buildTargets.push('oneAPI DevFlow: Exit');
        let isContinue = true;
        let options: vscode.InputBoxOptions = {
            placeHolder: "Choose target or click exit"
        };
        do {
            let selection = await vscode.window.showQuickPick(buildTargets, options);
            if (!selection) {
                isContinue = false;
                return false; // for unit tests
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
            if (selection === 'oneAPI DevFlow: Exit') {
                isContinue = false;
            } else {
                switch (buildSystem) {
                    case 'make': {
                        taskConfigValue.command += `make ${selection} -f ${buildDir}/Makefile`;
                        break;
                    }
                    case 'cmake': {
                        let cmd = 'if not exist build mkdir build && cmake  -S . -B build ';
                        cmd += process.platform === 'win32' ? `-G "NMake Makefiles" && nmake ${selection}` :
                            `&& cmake --build build && cmake --build build --target ${selection}`;
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
                    config.push(taskConfigValue);
                };
                taskConfig.update('tasks', config, false);
            }
        } while (isContinue);
        return true;
    }

    async makeLaunchFile(buildSystem: string, buildDir: string): Promise<boolean> {
        let execFiles: string[] = [];
        let buldDir = '${workspaceFolder}';
        switch (buildSystem) {
            case 'make': {
                execFiles = await this.getExecNameManual();
                break;
            }
            case 'cmake': {
                execFiles = await this.getExecNameFromCmake(buildDir);
                buldDir = `${buldDir}/build/`;
                break;
            }
            default: {
                break;
            }
        }
        execFiles.push('oneAPI DevFlow: Exit');
        let isContinue = true;
        let options: vscode.InputBoxOptions = {
            placeHolder: "Choose executable or click exit"
        };
        do {
            let selection = await vscode.window.showQuickPick(execFiles, options);
            if (!selection) {
                isContinue = false;
                return false; // for unit tests
            }
            if (selection === 'oneAPI DevFlow: Exit') {
                isContinue = false;
                break;
            }
            const launchConfig = vscode.workspace.getConfiguration('launch');
            const configurations = launchConfig['configurations'];
            if (execFiles.length === 0) {
                await vscode.window.showWarningMessage("Not provided the name of the executable file!");
                await vscode.window.showInformationMessage("The default name will be used. You can change it in launch.json at any time");
            }
            debugConfig.name = `${buildSystem}:${selection.split('/').pop()}`;
            debugConfig.program = `${buldDir}${selection}`;
            configurations.push(debugConfig);
            launchConfig.update('configurations', configurations, false);
        } while (isContinue);
        return true;
    }

    async getExecNameManual(): Promise<string[]> {
        let execNames: string[] = [];
        let options: vscode.InputBoxOptions = {
            prompt: "Please provide path and name for executable files: ",
            placeHolder: "path/to/exec;path/to/exec1;path/to;exec2"
        };

        await vscode.window.showInputBox(options).then(value => {
            if (!value) {
                execNames.push('a');
                return execNames;
            };
            execNames = value.toString().split(';');
        });
        return execNames;
    }

    async getExecNameFromCmake(buildDir: string): Promise<string[]> {
        let execNames: string[] = [];
        let pathsToCmakeLists = child_process.execSync(`find ${vscode.workspace.rootPath} -name 'CMakeLists.txt'`).toString().split('\n');
        pathsToCmakeLists.forEach((path) => {
            execNames = execNames.concat(child_process.execSync(
                `awk '/^ *add_executable/' ${path} | sed -e's/add_executable(/ /' | awk '{print $1}'`,
                { cwd: buildDir }).toString().split('\n'));
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
                //finding all CMakeLists.txt in project folder and subfolders
                let command = process.platform === 'win32' ?
                    `where /r ${vscode.workspace.rootPath} CMakeLists.txt` :
                    `find ${vscode.workspace.rootPath} -name 'CMakeLists.txt'`;
                let pathsToCmakeLists = child_process.execSync(command).toString().split('\n');
                //parsing CMakeLists.txt to find build targets
                pathsToCmakeLists.forEach((path) => {
                    let command = process.platform === 'win32' ?
                        `powershell -Command "$targets=(gc ${path}) | Select-String -Pattern '\\s*add_custom_target\\((\\w*)' ; $targets.Matches | ForEach-Object -Process {echo $_.Groups[1].Value} | Select-Object -Unique"` :
                        `awk '/^ *add_custom_target/' ${path} | sed -e's/add_custom_target(/ /' | awk '{print $1}'`;
                    targets = targets.concat(child_process.execSync(command, { cwd: buildDirPath }).toString().split('\n'));
                    targets.pop();
                });
                targets = targets.filter(function (item, pos) {
                    return targets.indexOf(item) == pos;
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