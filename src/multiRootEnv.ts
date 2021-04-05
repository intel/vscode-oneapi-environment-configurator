/**
 * Copyright (c) Intel Corporation
 * Licensed under the MIT License. See the project root LICENSE
 * 
 * SPDX-License-Identifier: MIT
 */

'use strict';
import * as vscode from 'vscode';

export class MultiRootEnv {
    storage: vscode.Memento;
    activeDir: string | undefined;
    statusBarItem: vscode.StatusBarItem;
    collection: vscode.EnvironmentVariableCollection;
    constructor(storage: vscode.Memento, collection: vscode.EnvironmentVariableCollection) {
        this.collection = collection;
        this.storage = storage;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
        this.statusBarItem.show();
        this.setActiveDir(storage.get("activeDir"));
        if (this.activeDir && !vscode.workspace.workspaceFolders?.find((el) => {
            if (el.uri.toString() === this.activeDir) { return true; }
        })) {
            storage.update("activeDir", undefined);
            storage.update(this.activeDir, undefined);
            this.setActiveDir(undefined);
        }
        vscode.workspace.workspaceFolders?.forEach(async folder => {
            let env = await this.readEnvFromExtensionStorage(folder.uri.toString());
            if (!env) {
                await this.addEnv(folder.uri.toString());
            }
        });
    }

    setActiveDir(dir: string | undefined) {
        this.activeDir = dir;
        if (dir) {
            let activeDirUri = vscode.Uri.parse(dir);
            let activeDirName = vscode.workspace.getWorkspaceFolder(activeDirUri)?.name;
            if (activeDirName) {
                this.statusBarItem.text = "Active environment: ".concat(activeDirName);
            }
        }
        else {
            this.statusBarItem.text = "Active environment: ".concat("not selected");
        }
    }

    async writeEnvToExtensionStorage(k: string, v: Map<string, string> | undefined): Promise<void> {
        if (v === undefined) {
            await this.storage.update(k, v);
            return;
        }
        let tmp = [...v.entries()];
        let jsonString = JSON.stringify(tmp);
        await this.storage.update(k, jsonString);
    }
    async readEnvFromExtensionStorage(k: string): Promise<Map<string, string> | undefined> {
        let jsonString: string | undefined = await this.storage.get(k);
        if (!jsonString) {
            return undefined;
        }
        let tmp: [string, string][] = JSON.parse(jsonString);
        let result: Map<string, string> = new Map();
        for (let val of tmp) {
            result.set(val[0], val[1]);
        }
        return result;
    }
    async getworkspaceFolder(): Promise<vscode.WorkspaceFolder | undefined> {
        if (vscode.workspace.workspaceFolders?.length === 1) {
            return vscode.workspace.workspaceFolders[0];
        }
        let selection = await vscode.window.showWorkspaceFolderPick();
        if (!selection) {
            vscode.window.showErrorMessage("Cannot find the working directory!", { modal: true });
            vscode.window.showInformationMessage("Please add one or more working directories and try again.");
            return undefined; // for unit tests
        }
        return selection;
    }

    async addEnv(folder: string) {
        await this.writeEnvToExtensionStorage(folder, new Map());
    }

    async removeEnv(folder: string) {
        if (this.activeDir === folder) {
            this.setActiveDir(undefined);
            await this.storage.update("activeDir", undefined);
            this.collection.clear();
        }
        await this.writeEnvToExtensionStorage(folder, undefined);
    }

    async switchEnv(): Promise<boolean> {
        let folder = await this.getworkspaceFolder();
        if (!folder || folder.uri.toString() === this.activeDir) {
            return false;
        }
        let activeDir = folder?.uri.toString();
        this.setActiveDir(activeDir);
        await this.storage.update("activeDir", activeDir);
        await this.applyEnv(activeDir);
        vscode.window.showInformationMessage(`Working directory selected: ${folder?.name}`);
        return true;
    }

    async applyEnv(folder: string) {
        this.collection.clear();
        let env = await this.readEnvFromExtensionStorage(folder);
        if (!env || env.size === 0) {
            return;
        }
        for (let keyValuePair of env) {
            this.collection.append(keyValuePair[0], keyValuePair[1]);
        }
    }
}