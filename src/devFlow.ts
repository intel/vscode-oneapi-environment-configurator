/**
 * Copyright (c) Intel Corporation
 * Licensed under the MIT License. See the project root LICENSE
 *
 * SPDX-License-Identifier: MIT
 */

'use strict';
import * as vscode from 'vscode';
import { OneApiEnv, MultiRootEnv } from './environment';

export class DevFlow {
    environment: OneApiEnv;
    constructor(context: vscode.ExtensionContext) {
        this.environment = new MultiRootEnv(context);
        DevFlow.register(context, this.environment);
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    public static register(context: vscode.ExtensionContext, environment: OneApiEnv) {
    // Initializing parameters from Setting.json at VSCode startup
        environment.oneAPIRootPath = vscode.workspace.getConfiguration('intel-corporation.oneapi-environment-configurator').get<string>('ONEAPI_ROOT');
        environment.setvarsConfigsPaths = vscode.workspace.getConfiguration('intel-corporation.oneapi-environment-configurator').get<string[]>('SETVARS_CONFIG');

        // Updating parameters when they are changed in Setting.json
        context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('intel-corporation.oneapi-environment-configurator.SETVARS_CONFIG')) {
                environment.setvarsConfigsPaths = vscode.workspace.getConfiguration().get<string[]>('intel-corporation.oneapi-environment-configurator.SETVARS_CONFIG');
            }
            if (e.affectsConfiguration('intel-corporation.oneapi-environment-configurator.ONEAPI_ROOT')) {
                environment.oneAPIRootPath = vscode.workspace.getConfiguration().get<string>('intel-corporation.oneapi-environment-configurator.ONEAPI_ROOT');
            }
        }));

        // Registration of other commands
        context.subscriptions.push(vscode.commands.registerCommand('intel-corporation.oneapi-environment-configurator.initializeEnvironment', () => environment.initializeDefaultEnvironment()));
        context.subscriptions.push(vscode.commands.registerCommand('intel-corporation.oneapi-environment-configurator.initializeEnvironmentConfig', () => environment.initializeCustomEnvironment()));
        context.subscriptions.push(vscode.commands.registerCommand('intel-corporation.oneapi-environment-configurator.clearEnvironment', () => environment.clearEnvironment()));
        context.subscriptions.push(vscode.commands.registerCommand('intel-corporation.oneapi-environment-configurator.switchEnv', () => environment.switchEnv()));
        context.subscriptions.push(vscode.commands.registerCommand('intel-corporation.oneapi-environment-configurator.configureIntelCompilerForCMake', () => environment.configureIntelCompilerForCMake()));
    }
}
