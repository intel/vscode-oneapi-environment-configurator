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
		 // eslint-disable-next-line @typescript-eslint/no-unused-vars
		 const devFlof = new DevFlow(context);
	 } else {
		 vscode.window.showErrorMessage("Failed to activate 'Environment Configurator for Intel oneAPI Toolkits' extension. The extension is only supported on Linux and Windows");
		 deactivate();
	 }
 }
 
 export function deactivate(): void {
	 console.log("Environment Configurator for Intel oneAPI Toolkits: Goodbye");
 }
 
