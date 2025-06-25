/**
 * Copyright (c) Intel Corporation
 * Licensed under the MIT License. See the project root LICENSE
 * 
 * SPDX-License-Identifier: MIT
 */

'use strict';
import { execSync } from 'child_process';
import * as vscode from 'vscode';

export function getPSexecutableName(): string | undefined {
    let execName: string;
    try {
        execSync('pwsh');
        execName = 'pwsh';
    }
    catch (err) {
        try {
            execSync('powershell');
            execName = 'powershell';
        }
        catch (err) {
            return undefined;
        }
    }
    return execName;
}

/**
 * Prompt User to reload outdated terminal(s)
 */
export async function notifyUserToReloadStaleTerminals() {
    const terminalCount = vscode.window.terminals.length;
    if (terminalCount === 0) {
        return;
    }

    // Message and label based on terminal count
    const message = terminalCount === 1
        ? 'Reload required: The terminal needs to be restarted to apply the oneAPI environment.'
        : 'Reload required: All terminals need to be restarted to apply the oneAPI environment.';

    const buttonLabel = terminalCount === 1 ? 'Reload Terminal' : 'Reload Terminals';

    const choice = await vscode.window.showInformationMessage(
        message,
        buttonLabel,
        'Cancel'
    );

    if (choice === buttonLabel) {
        vscode.window.terminals.forEach(terminal => terminal.dispose());
        vscode.window.createTerminal().show();
    }
}
