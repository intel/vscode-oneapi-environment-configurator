import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as fs from 'fs';

const debugConfig = {
    'name': 'bla',
    'type': 'cppdbg',
    'request': 'launch',
    'program': '${workspaceFolder}/${workspaceFolderBasename}',
    'args': [],
    'stopAtEntry': false,
    'cwd': '${workspaceFolder}',
    'environment': [],
    'externalConsole': false,
    "envFile": "${workspaceFolder}/oneAPI.env",
    'MIMode': 'gdb',
    'setupCommands':
        [
            {
                'description': 'Enable pretty-printing for gdb',
                'text': '-enable-pretty-printing',
                'ignoreFailures': true,
            }
        ]
};

export class DevFlow {
    terminal: vscode.Terminal;
    launchJsonExist: boolean;
    context: vscode.ExtensionContext;
    constructor(c: vscode.ExtensionContext) {
        this.terminal = vscode.window.createTerminal();
        this.launchJsonExist = false;
        this.context = c;
    }

    runExtension(): any {
        let workspaceFolder = this.getworkspaceFolder();
        if (workspaceFolder === undefined) {
            vscode.window.showErrorMessage("Cannot find the working directory. Please add one or more working directories and try again.");
            vscode.window.showInformationMessage("Please add one or more working directories and try again.");
            return undefined; // for unit tests
        }
        this.checkAndGetEnvironment().then(async () => {
            await this.makeTasksFile(await workspaceFolder);
            await this.makeLaunchFile();
        });
        return true; // for unit tests
    }

    async getworkspaceFolder(): Promise<vscode.WorkspaceFolder | undefined> {
        if (vscode.workspace.workspaceFolders?.length === 1) {
            return vscode.workspace.workspaceFolders[0];
        }
        vscode.window.showWorkspaceFolderPick().then(selection => {
            if (!selection) {
                return undefined; // for unit tests
            }
            return selection;
        });
    }

    async checkAndGetEnvironment(): Promise<void> {
        if (!process.env.ONEAPI_ROOT) {
            await vscode.window.showInformationMessage('Provide path to oneAPI setvars file.', 'Select').then(async selection => {
                if (selection === 'Select') {
                    const options: vscode.OpenDialogOptions = {
                        canSelectMany: false,
                        openLabel: 'Select',
                        filters: {
                            'oneAPI setvars file': [process.platform == 'win32' ? 'bat' : 'sh'],
                        }
                    };
                    await vscode.window.showOpenDialog(options).then(fileUri => {
                        if (fileUri && fileUri[0]) {
                            this.getEnvironment(fileUri[0].fsPath);
                        }
                    });
                }
            });
        }
    }

    getEnvironment(fspath: string) {
        const collection = this.context.environmentVariableCollection;

        let command: string = process.platform == 'win32' ? `"${fspath}" > NULL && set` : `bash -c ". ${fspath}  > /dev/null && printenv"`;
        let a = child_process.exec(command);
        a.stdout?.on('data', (d: string) => {
            let vars = d.split('\n');
            var v1 = {};
            vars.forEach(l => {
                //console.log(v);
                let e = l.indexOf('=');
                let k = <string>l.substr(0, e);
                let v = <string>l.substr((e + 1));

                console.log(`${k} eq ${v}`);

                if (process.env[k] !== v) {
                    if (!process.env[k]) {
                        collection.append(k, v)
                    } else {
                        collection.replace(k, v)
                    }
                }
                (process.env as any)[k] = v; // Spooky Magic
            });
        });
    }

    async makeTasksFile(workspaceFolder: vscode.WorkspaceFolder | undefined): Promise<boolean | undefined> {
        if (workspaceFolder === undefined) {
            return undefined;
        }
        let buildSystem: string = 'cmake';
        let buildDir: string = `${workspaceFolder.uri.fsPath}`;
        if (fs.existsSync(`${workspaceFolder.uri.fsPath}/Makefile`)) {
            buildSystem = 'make';
        }
        const buildTargets = await this.getTargets(buildDir, buildSystem);
        buildTargets.push('oneAPI DevFlow: Exit');
        let isContinue = true;
        do {
            await vscode.window.showQuickPick(buildTargets).then(async selection => {
                if (!selection) {
                    isContinue = false;
                    return false; // for unit tests
                }
                const launchConfig = vscode.workspace.getConfiguration('tasks');
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
                            taskConfigValue.command += `mkdir -p build && cmake -S . -B build && cmake --build build && cmake --build build --target ${selection}`;
                            break;
                        }
                        default: {
                            isContinue = false;
                            break;
                        }
                    }

                    let config: any = launchConfig['tasks'];
                    if (config === undefined) {
                        config = [taskConfigValue];
                    } else {
                        config.push(taskConfigValue);
                    };
                    launchConfig.update('tasks', config, false);
                }
            });
        } while (isContinue);
        return true;
    }

    makeLaunchFile(): void {
        const launchConfig = vscode.workspace.getConfiguration('launch');
        const configurations = launchConfig['configurations'];
        configurations.push(debugConfig);
        launchConfig.update('configurations', configurations, false);
        return;
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
                let pathsToCmakeLists: string[] = child_process.execSync(`find ${vscode.workspace.rootPath} -name 'CMakeLists.txt'`).toString().split('\n');
                pathsToCmakeLists.forEach((path) => {
                    targets = targets.concat(child_process.execSync(
                        `awk '/^ *add_custom_target/' ${path} | sed -e's/add_custom_target(/ /' | awk '{print $1}'`,
                        { cwd: buildDirPath }).toString().split('\n'));
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