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
	const devFlof = new DevFlow(context);
	context.subscriptions.push(vscode.commands.registerCommand('intel-corporation.oneapi-environment-variables.initializeEnvironment', () => devFlof.environment.initializeDefaultEnvironment));
	context.subscriptions.push(vscode.commands.registerCommand('intel-corporation.oneapi-environment-variables.initializeEnvironmentConfig', () => devFlof.environment.initializeCustomEnvironment));
	context.subscriptions.push(vscode.commands.registerCommand('intel-corporation.oneapi-environment-variables.clearEnvironment', () => devFlof.environment.clearEnvironment()));
	context.subscriptions.push(vscode.commands.registerCommand('intel-corporation.oneapi-environment-variables.switchEnv', () => devFlof.environment.switchEnv()));
}

export function deactivate(): void {
	console.log("Environment Configurator for Intel oneAPI Toolkits: Goodbye");
}
