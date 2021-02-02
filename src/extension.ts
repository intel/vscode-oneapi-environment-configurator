import * as vscode from 'vscode';
import * as devFlow from './devFlow';

let c:  vscode.ExtensionContext;

export function activate(context: vscode.ExtensionContext) {
	c = context;
	let devFlofData = new devFlow.DevFlow(c);
	context.subscriptions.push(vscode.commands.registerCommand('oneapi-devflow.generateLaunchJson', () => devFlofData.makeLaunchFile()));
	context.subscriptions.push(vscode.commands.registerCommand('oneapi-devflow.generateTaskJson', () => devFlofData.makeTasksFile()));
	context.subscriptions.push(vscode.commands.registerCommand('oneapi-devflow.openShell', () => devFlofData.openShellOneAPI()));
	context.subscriptions.push(vscode.commands.registerCommand('oneapi-devflow.setONEAPIenvironment', () => devFlofData.checkAndGetEnvironment()));
}

export function deactivate() {
	console.log("Intel oneAPI DevFlow: Goodbye");
}
