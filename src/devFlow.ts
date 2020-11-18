import * as vscode from 'vscode';
import { execSync } from 'child_process';
export class DevFlow {
    terminal: vscode.Terminal;
    constructor() {
        this.terminal = vscode.window.activeTerminal ? vscode.window.activeTerminal : vscode.window.createTerminal();
    }
    async setEnviroment(): Promise<void> {
        await vscode.window.showInformationMessage("Provide path to oneAPI setvars.sh.", 'select').then(async selection => {
            if (selection === 'select') {
                const options: vscode.OpenDialogOptions = {
                    canSelectMany: false,
                    openLabel: 'Select',
                    filters: {
                        'oneAPI setvars file': ['sh'],
                    }
                };
                await vscode.window.showOpenDialog(options).then(async fileUri => {
                    if (fileUri && fileUri[0]) {
                        await this.terminal.sendText('source ' + fileUri[0].fsPath);
                    }
                });
            }
        });
    }
    buildSample(): void {
        const tasks: vscode.QuickPickItem[] = [{ label: 'Run Make' }, { label: 'Get Makefile from Cmake' }];
        vscode.window.showQuickPick(tasks).then(selection => {
            if (!selection) {
                return;
            }
            switch (selection.label) {
                case "Run Make":
                    this.setEnviroment().then(() => this.runMake());
                    break;
                case "Get Makefile from Cmake":
                    this.setEnviroment().then(() => this.makeFromCmake());
                    break;
                default:
                    break;
            }
        });
    }
    async makeFromCmake(): Promise<void> {
        this.terminal.sendText(`cd ${vscode.workspace.rootPath}`);
        this.terminal.sendText('mkdir build');
        this.terminal.sendText('cd build');
        this.terminal.sendText("cmake ..");
    }
    async runMake(): Promise<void> {
        const targets = this.getMakeTargets();
        vscode.window.showQuickPick(targets).then(selection => {
            if (!selection) {
                return;
            }
            this.terminal.sendText(`cd ${vscode.workspace.rootPath}`);
            this.terminal.sendText(`make ${selection}`);
        });
    }
    getMakeTargets(): string[] {
        const targets = execSync(`make -pRrq : 2>/dev/null | awk -v RS= -F: '/^# File/,/^# Finished Make data base/ {if ($1 !~ "^[#.]") {print $1}}' | egrep -v '^[^[:alnum:]]' | sort`, { cwd: vscode.workspace.rootPath }).toString().split('\n');
        targets.pop();
        return targets;
    }
}