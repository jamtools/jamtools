import fs from 'node:fs';

import {KVStore} from '~/core/types/module_types';

const DATA_FILE_NAME = './kv_data.json';

let allKVData: Record<string, Record<string, string>> = {};

if (fs.existsSync(DATA_FILE_NAME)) {
    const initialKVDataString = fs.readFileSync(DATA_FILE_NAME).toString();
    allKVData = JSON.parse(initialKVDataString) as Record<string, Record<string, string>>;
}

export class NodeKVStoreService implements KVStore {
    constructor(private databaseName: string) {

    }

    public getAllEntries = async () => {
        return allKVData[this.databaseName] || {};
    }

    public get = async <T>(key: string) => {
        const db = allKVData[this.databaseName];
        if (!db) {
            return null;
        }

        const s = db[key];
        if (!s) {
            return null;
        }

        return JSON.parse(s) as T;
    };

    public set = async <T>(key: string, value: T) => {
        const s = JSON.stringify(value);

        const db = allKVData[this.databaseName] || {};
        db[key] = s;

        allKVData[this.databaseName] = db;
        await fs.promises.writeFile(DATA_FILE_NAME, JSON.stringify(allKVData));
    };
}
