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

export function isTerminalAcceptable(): boolean {
    if (process.platform === 'win32') {
        if (!isPowerShellVersionAcceptable()) {
            vscode.window.showErrorMessage("The PowerShell terminal does not meet the requirements. It must be version 7 or higher.");
            return false;
        }
    }
    return true;
}

function isPowerShellVersionAcceptable(): boolean {
    try {
        const out = execSync(`pwsh -Command "(get-host).version.Major"`).toString();
        const psVersion = parseInt(out);
        if (isNaN(psVersion)) {
            return false;
        } else {
            return psVersion >= 7 ? true : false;
        };
    }
    catch (err) {
        console.error(err);
        return false;
    }
};
