/**
 * Copyright (c) Intel Corporation
 * Licensed under the MIT License. See the project root LICENSE
 * 
 * SPDX-License-Identifier: MIT
 */

import * as vscode from 'vscode';
import * as devFlow from './devFlow';

let c: vscode.ExtensionContext;

export function activate(context: vscode.ExtensionContext) {
	c = context;
	let devFlofData = new devFlow.DevFlow(c);
	context.subscriptions.push(vscode.commands.registerCommand('oneapi-devflow.generateLaunchJson', () => devFlofData.makeLaunchFile()));
	context.subscriptions.push(vscode.commands.registerCommand('oneapi-devflow.generateTaskJson', () => devFlofData.makeTasksFile()));
	context.subscriptions.push(vscode.commands.registerCommand('oneapi-devflow.setONEAPIenvironment', () => devFlofData.checkAndGetEnvironment()));
	context.subscriptions.push(vscode.commands.registerCommand('oneapi-devflow.clearEnvironment', () => devFlofData.clearEnvironment()));

	vscode.window.onDidOpenTerminal((terminal: vscode.Terminal) => {
		devFlofData.checkNewTerminals(terminal);
	});
}

export function deactivate() {
	console.log("Intel oneAPI DevFlow: Goodbye");
}
