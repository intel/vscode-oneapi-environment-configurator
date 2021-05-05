/**
 * Copyright (c) Intel Corporation
 * Licensed under the MIT License. See the project root LICENSE
 * 
 * SPDX-License-Identifier: MIT
 */

'use strict';
import * as vscode from 'vscode';
import { execSync } from 'child_process';

export async function checkExistingTerminals(): Promise<boolean | undefined> {
    if (vscode.window.terminals !== undefined) {
        await vscode.window.showInformationMessage(`Please note that all newly created terminals after environment setup will contain oneAPI environment`, { modal: true });
    };
    return true;
}