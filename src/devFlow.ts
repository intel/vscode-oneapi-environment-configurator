import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as fs from 'fs';
import { win32 } from 'path';

const debugConfig = {   'name' :      'bla',
                        'type' :      'cppdbg',
                        'request' :   'launch',
                        'program' :   '${workspaceFolder}/${workspaceFolderBasename}',
                        'args' :      [],
                        'stopAtEntry' : false,
                        'cwd' :       '${workspaceFolder}',
                        'environment' : [],
                        'externalConsole' : false,
                        "envFile": "${workspaceFolder}/oneAPI.env",
                        'MIMode' :    'gdb',
                        'setupCommands' :    
                            [
                                {'description' :    'Enable pretty-printing for gdb',
                                'text' :    '-enable-pretty-printing',
                                'ignoreFailures' :    true,}
                            ] };

export class DevFlow {
    terminal: vscode.Terminal;
    env: boolean;
    launchJsonExist: boolean;
    constructor() {
        this.terminal = vscode.window.activeTerminal ? vscode.window.activeTerminal : vscode.window.createTerminal();
        this.env = false;
        this.launchJsonExist = false;
    }
    async setEnviroment(): Promise<void> {
        if (!this.env) {
            await vscode.window.showInformationMessage('Provide path to oneAPI setvars.sh.', 'select').then(async selection => {
                if (selection === 'select') {
                    const options: vscode.OpenDialogOptions = {
                        canSelectMany: false,
                        openLabel: 'Select',
                        filters: {
                            'oneAPI setvars file': ['sh'],
                        }
                    };
                    await vscode.window.showOpenDialog(options).then(fileUri => {
                        if (fileUri && fileUri[0]) {
                            this.terminal.sendText(`source ${fileUri[0].fsPath}`);
                            // create environment file
                            this.terminal.sendText(`env > oneAPI.env`);
                            this.env = true;
                        }
                    });
                }
            });
        }
    }
    runExtension(): void {
        const tasks: vscode.QuickPickItem[] = [{ label: 'Generate Developer Flow' }, { label: 'Get Makefile from Cmake' }];
        this.setEnviroment().then(async () => {
            await vscode.window.showQuickPick(tasks).then(async selection => {
                if (!selection) {
                    return;
                }
                switch (selection.label) {
                    case 'Generate Developer Flow':
                        await this.makeTasksFile();
                        if (!this.launchJsonExist)
                        {
                            await this.makeLaunchFile();
                            this.launchJsonExist = true;
                        }
                        break;
                    case 'Get Makefile from Cmake':
                        await this.makeFromCmake();
                        break;
                    default:
                        break;
                }
            });
        });

    }
    async makeFromCmake(): Promise<void> {
        fs.mkdir(`${vscode.workspace.rootPath}/build`, (err) => {
            if (err) {
                console.error(err);
                return;
            }
        });
        this.terminal.sendText(`cmake -S ${vscode.workspace.rootPath} -B ${vscode.workspace.rootPath}/build`);
    }
    async makeTasksFile(): Promise<void> {
        let makefileDir: string = `${vscode.workspace.rootPath}`;
        if (fs.existsSync(`${vscode.workspace.rootPath}/build/Makefile`)) {
            makefileDir += '/build';
        }
        this.terminal.sendText(`cd ${makefileDir}`);
        const targets = await this.getMakeTargets(makefileDir);
        await vscode.window.showQuickPick(targets).then(async selection => {
            if (!selection) {
                return;
            }
            const launchConfig = vscode.workspace.getConfiguration('tasks');
            let targetValue = {
                label: selection,
                command: `sed -e's/$/"/' ${vscode.workspace.rootPath}/env.env | sed -e's/=/="/' > tmp && set -a && source tmp && set +a && rm tmp && make ${selection} -f ${makefileDir}/Makefile`,
                type: 'shell',
                options: {
                    cwd: `${makefileDir}`
                }
            };
            let config: any = launchConfig['tasks'];
            if (config === undefined) {
                config = [targetValue];
            } else {
                config.push(targetValue);
            };
            launchConfig.update('tasks', config, false);
        });
    }
    makeLaunchFile(): void {
        const launchConfig = vscode.workspace.getConfiguration('launch');
        const configurations = launchConfig['configurations'];
        configurations.push(debugConfig);
        launchConfig.update('configurations', configurations, false);
        return;
    
}
    async getMakeTargets(makefilePath: string): Promise<string[]> {
        const targets = child_process.execSync(
            `make -pRrq : 2>/dev/null | awk -v RS= -F: '/^# File/,/^# Finished Make data base/ {if ($1 !~ "^[#.]") {print $1}}' | egrep -v '^[^[:alnum:]]' | sort`,
            { cwd: makefilePath }).toString().split('\n');
        targets.pop();
        return targets;
    }
}