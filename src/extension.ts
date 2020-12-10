import * as vscode from 'vscode';
import * as devFlow from './devFlow';

export function activate(context: vscode.ExtensionContext) {
	let devFlofData = new devFlow.DevFlow();
	context.subscriptions.push(vscode.commands.registerCommand('oneapi-devflow.runExtension', () => devFlofData.runExtension()));
	context.subscriptions.push(vscode.commands.registerCommand('oneapi-devflow.refreshEnvFile', () => devFlofData.setEnvironment()));
}

export function deactivate() {
	console.log("Intel oneAPI DevFlow: Goodbye");
}
