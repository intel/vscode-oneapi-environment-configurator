import * as vscode from 'vscode';

export class DevFlow {
    terminal: vscode.Terminal;
    constructor() {
        this.terminal = vscode.window.activeTerminal ? vscode.window.activeTerminal : vscode.window.createTerminal();
    }
    async checkEnviroment(): Promise<void> {
        if (process.env.ONEAPI_ROOT === undefined) {
            await vscode.window.showInformationMessage("oneAPI enviroment is not set.", 'select').then(async selection => {
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
    }
    buildSample(): void {
        let items: vscode.QuickPickItem[] = [{ label: 'Run Make' }, { label: 'Get Makefile from Cmake' }];
        vscode.window.showQuickPick(items).then(selection => {
            if (!selection) {
                return;
            }
            switch (selection.label) {
                case "Run Make":
                    this.checkEnviroment().then(()=>{});
                    //TODO:
                    break;
                case "Get Makefile from Cmake":
                    this.checkEnviroment().then(()=>this.makeFromCmake());
                    break;
                default:
                    break;
            }
        });
    }
    makeFromCmake(): void {
        this.terminal.sendText('mkdir build');
        this.terminal.sendText('cd build');
        this.terminal.sendText("cmake ..");
    }
}