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
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const devFlof = new DevFlow(context);
}

export function deactivate(): void {
	console.log("Environment Configurator for Intel oneAPI Toolkits: Goodbye");
}

