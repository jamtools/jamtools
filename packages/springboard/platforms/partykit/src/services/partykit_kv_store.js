export class PartykitKVStore {
    constructor(room, kvForHttp) {
        this.room = room;
        this.kvForHttp = kvForHttp;
        this.get = async (key) => {
            const value = await this.room.storage.get(key);
            if (value) {
                return JSON.parse(value);
            }
            return null;
        };
        this.set = async (key, value) => {
            await this.kvForHttp.set(key, value);
            return this.room.storage.put(key, JSON.stringify(value));
        };
        this.getAll = async () => {
            const entries = await this.room.storage.list({
                limit: 100,
            });
            const entriesAsRecord = {};
            for (const [key, value] of entries) {
                entriesAsRecord[key] = JSON.parse(value);
            }
            return entriesAsRecord;
        };
    }
}
