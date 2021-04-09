/**
 * Copyright (c) Intel Corporation
 * Licensed under the MIT License. See the project root LICENSE
 * 
 * SPDX-License-Identifier: MIT
 */

'use strict';
import * as vscode from 'vscode';

export class Storage {
    storage: vscode.Memento;
    constructor(storage: vscode.Memento) {
        this.storage = storage;
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
}