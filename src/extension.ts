/**
 * Copyright (c) Intel Corporation
 * Licensed under the MIT License. See the project root LICENSE
 * 
 * SPDX-License-Identifier: MIT
 */

'use strict';
import * as vscode from 'vscode';
import { DevFlow } from './devFlow';

export function activate(context: vscode.ExtensionContext): void {
	if ((process.platform === 'win32') || (process.platform === 'linux')) {
		const devFlof = new DevFlow(context);
		context.subscriptions.push(vscode.commands.registerCommand('intel-corporation.oneapi-environment-variables.initializeEnvironment', () => devFlof.environment.initializeDefaultEnvironment()));
		context.subscriptions.push(vscode.commands.registerCommand('intel-corporation.oneapi-environment-variables.initializeEnvironmentConfig', () => devFlof.environment.initializeCustomEnvironment()));
		context.subscriptions.push(vscode.commands.registerCommand('intel-corporation.oneapi-environment-variables.clearEnvironment', () => devFlof.environment.clearEnvironment()));
		context.subscriptions.push(vscode.commands.registerCommand('intel-corporation.oneapi-environment-variables.switchEnv', () => devFlof.environment.switchEnv()));
	} else {
		vscode.window.showErrorMessage("Failed to activate 'Environment Configurator for Intel oneAPI Toolkits' extension. The extension is only supported on Linux and Windows");
		deactivate();
	}
}

export function deactivate(): void {
	console.log("Environment Configurator for Intel oneAPI Toolkits: Goodbye");
}
