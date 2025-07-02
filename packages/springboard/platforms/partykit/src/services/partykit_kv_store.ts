import {Room} from 'partykit/server';
import {KVStore} from 'springboard/types/module_types';

export class PartykitKVStore implements KVStore {
    constructor(private room: Room) { }

    get = async <T>(key: string): Promise<T | null> => {
        const value = await this.room.storage.get(key);
        if (value) {
            return JSON.parse(value as string) as T;
        }

        return null;
    }

    set = async <T>(key: string, value: T): Promise<void> => {
        return this.room.storage.put(key, JSON.stringify(value));
    }

    getAll = async () => {
        const entries = await this.room.storage.list({
            limit: 100,
        });

        const entriesAsRecord: Record<string, any> = {};
        for (const [key, value] of entries) {
            entriesAsRecord[key] = JSON.parse(value as string);
        }

        return entriesAsRecord;
    }
}
