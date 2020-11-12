import { exec } from 'child_process';
import * as vscode from 'vscode';
import * as devFlow from './devFlow';

export function activate(context: vscode.ExtensionContext) {
	let devFlofData = new devFlow.DevFlow();
	context.subscriptions.push(vscode.commands.registerCommand('oneapi-devflow.build', () => devFlofData.buildSample()));
}

export function deactivate() { }
