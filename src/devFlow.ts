import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as fs from 'fs';
export class DevFlow {
    terminal: vscode.Terminal;
    env: boolean;
    constructor() {
        this.terminal = vscode.window.activeTerminal ? vscode.window.activeTerminal : vscode.window.createTerminal();
        this.env = false;
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
                            this.env = true;
                        }
                    });
                }
            });
        }
    }
    buildSample(): void {
        const tasks: vscode.QuickPickItem[] = [{ label: 'Run Make' }, { label: 'Get Makefile from Cmake' }];
        this.setEnviroment().then(async () => {
            await vscode.window.showQuickPick(tasks).then(async selection => {
                if (!selection) {
                    return;
                }
                switch (selection.label) {
                    case 'Run Make':
                        await this.runMake();
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
    async runMake(): Promise<void> {
        let makefileDir: string = `${vscode.workspace.rootPath}`;
        if(fs.existsSync(`${vscode.workspace.rootPath}/build/Makefile`)){
            makefileDir += '/build';
        }
        this.terminal.sendText(`cd ${makefileDir}`);
        const targets = await this.getMakeTargets(makefileDir);
        await vscode.window.showQuickPick(targets).then(selection => {
            if (!selection) {
                return;
            }
            this.terminal.sendText(`make ${selection}`);
        });
    }
    async getMakeTargets(makefilePath: string): Promise<string[]> {
        const targets = child_process.execSync(
            `make -pRrq : 2>/dev/null | awk -v RS= -F: '/^# File/,/^# Finished Make data base/ {if ($1 !~ "^[#.]") {print $1}}' | egrep -v '^[^[:alnum:]]' | sort`,
            { cwd: makefilePath }).toString().split('\n');
        targets.pop();
        return targets;
    }
}