/**
 * Copyright (c) Intel Corporation
 * Licensed under the MIT License. See the project root LICENSE
 * 
 * SPDX-License-Identifier: MIT
 */

'use strict';
import * as vscode from 'vscode';
import { LaunchConfigurator } from './launchConfigurator';
import { OneApiEnv, SingleRootEnv, MultiRootEnv } from './environment';

export class DevFlow {
    environment: OneApiEnv;
    launchConfigurator: LaunchConfigurator;
    constructor(c: vscode.ExtensionContext) {
        this.launchConfigurator = new LaunchConfigurator(c.environmentVariableCollection);
        this.environment = vscode.workspace.workspaceFile !== undefined ? new MultiRootEnv(c) : new SingleRootEnv(c);
    }
}