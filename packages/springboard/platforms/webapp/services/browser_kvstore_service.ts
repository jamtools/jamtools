import {KVStore} from 'springboard/types/module_types';

export class BrowserKVStoreService implements KVStore {
    constructor(private ls: Window['localStorage']) {}

    getAll = async () => {
        const allKeys = Object.keys(this.ls);

        const entriesAsRecord: Record<string, any> = {};
        for (const key of allKeys) {
            const value = this.ls.getItem(key);
            if (value) {
                entriesAsRecord[key] = JSON.parse(value);
            }
        }

        return entriesAsRecord;
    };

    get = async <T>(key: string) => {
        const s = this.ls.getItem(key);
        if (!s) {
            return null;
        }

        return JSON.parse(s) as T;
    };

    set = async <T>(key: string, value: T) => {
        const s = JSON.stringify(value);
        this.ls.setItem(key, s);
    };
}
