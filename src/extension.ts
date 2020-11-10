import { exec } from 'child_process';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "sandbox" is now active!');
	let terminal = vscode.window.activeTerminal ? vscode.window.activeTerminal : vscode.window.createTerminal();
	context.subscriptions.push(vscode.commands.registerCommand('vscode-extensions.enviroment', () => {
		if (process.env.ONEAPI_ROOT == undefined) {
			vscode.window.showInformationMessage("oneAPI enviroment is not set.", 'select').then(selection => {
				if (selection == 'select') {
					const options: vscode.OpenDialogOptions = {
						canSelectMany: false,
						openLabel: 'Select',
						filters: {
							'oneAPI setvars file': ['sh'],
						}
					};
					vscode.window.showOpenDialog(options).then(fileUri => {
						if (fileUri && fileUri[0]) {
							terminal.sendText('source ' + fileUri[0].fsPath);
						}
					});
				}
			});
		}
	}));
	context.subscriptions.push(vscode.commands.registerCommand('vscode-extensions.build', () => {
		let items: vscode.QuickPickItem[] = [{ label: 'Run Make' }, { label: 'Get Makefile from Cmake' }];
		vscode.window.showQuickPick(items).then(selection => {
			if (!selection) {
				return;
			}
			switch (selection.label) {
				case "Run Make":
					//TODO:
					break;
				case "Get Makefile from Cmake":
					terminal.sendText('mkdir build')
					terminal.sendText('cd build')
					terminal.sendText("cmake ..");
					break;
				default:
					break;
			}
		});
	}));

}

export function deactivate() { }
