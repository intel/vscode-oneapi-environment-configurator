import * as vscode from 'vscode';
import * as devFlow from './devFlow';

let c:  vscode.ExtensionContext;

export function activate(context: vscode.ExtensionContext) {
	c = context;
	let devFlofData = new devFlow.DevFlow(c);
	context.subscriptions.push(vscode.commands.registerCommand('oneapi-devflow.runExtension', () => devFlofData.runExtension()));
}

export function deactivate() {
	console.log("Intel oneAPI DevFlow: Goodbye");
}
