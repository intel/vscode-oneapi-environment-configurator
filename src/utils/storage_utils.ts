/**
 * Copyright (c) Intel Corporation
 * Licensed under the MIT License. See the project root LICENSE
 * 
 * SPDX-License-Identifier: MIT
 */

'use strict';
import * as vscode from 'vscode';

export class Storage {
    private storage: vscode.Memento;
    constructor(storage: vscode.Memento) {
        this.storage = storage;
    }
    get(key: string): string | undefined {
        return this.storage.get(key);
    }
    async set(key: string, value: string | undefined): Promise<void> {
        await this.storage.update(key, value);
    }

    async writeEnvToExtensionStorage(k: string | undefined, v: Map<string, string> | undefined): Promise<void> {
        if (k === undefined) {
            return undefined;
        }
        if (v === undefined) {
            await this.storage.update(k, v);
            return;
        }
        const tmp = [...v.entries()];
        const jsonString = JSON.stringify(tmp);
        await this.storage.update(k, jsonString);
    }

    async readEnvFromExtensionStorage(k: string | undefined): Promise<Map<string, string> | undefined> {
        if (k === undefined) {
            return undefined;
        }
        const jsonString: string | undefined = await this.storage.get(k);
        if (!jsonString) {
            return undefined;
        }
        const tmp: [string, string][] = JSON.parse(jsonString);
        const result: Map<string, string> = new Map();
        for (const val of tmp) {
            result.set(val[0], val[1]);
        }
        return result;
    }
}
