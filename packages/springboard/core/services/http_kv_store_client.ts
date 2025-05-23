import {KVStore} from '../types/module_types';

export class HttpKVStoreService implements KVStore {
    constructor(private serverUrl: string) {}

    public setUrl = (url: string) => {
        this.serverUrl = url;
    };

    getAll = async () => {
        const allEntries = await fetch(`${this.serverUrl}/kv/get-all`);

        const allEntriesJson = await allEntries.json() as Record<string, any>;
        if (!allEntriesJson) {
            return null;
        }

        return allEntriesJson;
    };

    get = async <T>(key: string) => {
        const result = await fetch(`${this.serverUrl}/kv/get?key=${key}`);
        if (!result.ok) {
            return null;
        }

        const resultJson = await result.json() as {key: string, value: string};
        if (!resultJson) {
            return null;
        }

        return JSON.parse(resultJson.value) as T;
    };

    set = async <T>(key: string, value: T) => {
        const serialized = JSON.stringify(value);

        await fetch(`${this.serverUrl}/kv/set`, {
            method: 'POST',
            body: JSON.stringify({key, value: serialized}),
        });
    };
}
