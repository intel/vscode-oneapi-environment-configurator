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
        const config = vscode.workspace.getConfiguration(
            "intel-corporation.oneapi-environment-variables",
          );
        this.setvarsConfigsPaths = config.get<string[][]>("SETVARS_CONFIG");
        this.suppressFindSetvars = config.get<boolean>("ONEAPI_ROOT-default");
        this.oneAPIRootPaths = config.get<string[][]>("ONEAPI_ROOT");
    }
    public readonly setvarsConfigsPaths: string[][] | undefined;
    public readonly suppressFindSetvars: boolean | undefined;
    public readonly oneAPIRootPaths: string[][] | undefined;
}