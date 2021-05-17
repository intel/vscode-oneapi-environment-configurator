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
    constructor(c: vscode.ExtensionContext) {
        this.environment = vscode.workspace.workspaceFile !== undefined ? new MultiRootEnv(c) : new SingleRootEnv(c);
    }
}