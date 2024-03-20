/**
 * Copyright (c) Intel Corporation
 * Licensed under the MIT License. See the project root LICENSE
 *
 * SPDX-License-Identifier: MIT
 */

'use strict';
import * as vscode from 'vscode';
import { DevFlow } from './devFlow';
import messages from './messages';
enum ExtensionState {
    deprecated,
    actual,
  }

function checkExtensionsConflict(id: string) {
    const ExtensionsList = [['intel-corporation.oneapi-environment-variables', 'intel-corporation.oneapi-environment-configurator'],
        ['intel-corporation.oneapi-launch-configurator', 'intel-corporation.oneapi-analysis-configurator'],
        ['', 'intel-corporation.oneapi-gdb-debug']];

    ExtensionsList.forEach((Extension) => {
        const actualExtension = vscode.extensions.getExtension(Extension[ExtensionState.actual]);
        const deprecatedExtension = vscode.extensions.getExtension(Extension[ExtensionState.deprecated]);

        if (actualExtension?.id === id) {
            if (deprecatedExtension) {
                const deprExtName = deprecatedExtension.packageJSON.displayName;
                const actualExtName = actualExtension.packageJSON.displayName;

                vscode.window.showInformationMessage(messages.deprVersion(deprExtName, actualExtName), messages.uninstallDepr, messages.ignore)
                    .then((selection) => {
                        if (selection === messages.uninstallDepr) {
                            vscode.commands.executeCommand('workbench.extensions.uninstallExtension', deprecatedExtension.id).then(function() {
                                vscode.window.showInformationMessage(messages.completeUninstall(deprExtName), messages.reload)
                                    .then((selection) => {
                                        if (selection === messages.reload) {
                                            vscode.commands.executeCommand('workbench.action.reloadWindow');
                                        }
                                    });
                            });
                        }
                    });
            }
        }
    });
}

export function activate(context: vscode.ExtensionContext): void {
    // Checking for outdated versions of extensions in the VS Code environment
    checkExtensionsConflict(context.extension.id);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const devFlof = new DevFlow(context);
}

export function deactivate(): void {
    console.log('Environment Configurator for Intel oneAPI Toolkits: Goodbye');
}
