/**
 * Copyright (c) Intel Corporation
 * Licensed under the MIT License. See the project root LICENSE
 * 
 * SPDX-License-Identifier: MIT
 */

'use strict';
import * as vscode from 'vscode';
import { OneApiEnv, SingleRootEnv, MultiRootEnv } from './environment';

export class DevFlow {
    environment: OneApiEnv;
    private static setvarsConfigsPaths: string[][] | undefined;
    private static oneAPIRootPath: string | undefined;
    constructor(context: vscode.ExtensionContext) {
        this.environment = vscode.workspace.workspaceFile !== undefined ? new MultiRootEnv(context) : new SingleRootEnv(context);
        DevFlow.register(context, this.environment);
    }
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    public static register(context: vscode.ExtensionContext, environment: OneApiEnv) {
        DevFlow.setvarsConfigsPaths = vscode.workspace.getConfiguration("intel-corporation.oneapi-environment-variables").get<string[][]>('SETVARS_CONFIG');
        context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('SETVARS_CONFIG')) {
                DevFlow.setvarsConfigsPaths = vscode.workspace.getConfiguration("intel-corporation.oneapi-environment-variables").get<string[][]>('SETVARS_CONFIG');
            }
        }));
        context.subscriptions.push(vscode.commands.registerCommand('intel-corporation.oneapi-environment-variables.initializeEnvironment', () => environment.initializeDefaultEnvironment()));
        context.subscriptions.push(vscode.commands.registerCommand('intel-corporation.oneapi-environment-variables.initializeEnvironmentConfig', () => environment.initializeCustomEnvironment()));
        context.subscriptions.push(vscode.commands.registerCommand('intel-corporation.oneapi-environment-variables.clearEnvironment', () => environment.clearEnvironment()));
        context.subscriptions.push(vscode.commands.registerCommand('intel-corporation.oneapi-environment-variables.switchEnv', () => environment.switchEnv()));
    }
    
}