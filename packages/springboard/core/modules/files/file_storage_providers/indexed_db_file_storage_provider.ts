import Dexie, {type EntityTable} from 'dexie';

import {FileInfo} from '../file_types';

type StoredFile = {
    id: string;
    name: string;
    content: string;
}

type StoredFileWithoutId = Omit<StoredFile, 'id'>;

export class IndexedDbFileStorageProvider {
    private db!: Dexie & {
        files: EntityTable<StoredFile, 'id'>
    };

    constructor () {}

    initialize = async () => {
        this.db = new Dexie('file_storage') as Dexie & {
            files: EntityTable<StoredFile, 'id'>
        };

        this.db.version(1).stores({
            files: '++id,name,content'
        });
    };

    uploadFile = async (file: File): Promise<FileInfo> => {
        const dataUrl = await convertFileToDataURL(file);
        const storedFile: StoredFileWithoutId = {
            name: file.name,
            content: dataUrl,
        };

        const id = await this.db.files.add(storedFile);
        return {
            id,
            name: storedFile.name,
        };
    };

    getFileContent = async (fileId: string) => {
        const f = await this.db.files.get(fileId);
        return f?.content || '';
    };

    deleteFile = async (fileId: string) => {
        await this.db.files.delete(fileId);
    };
}

const convertFileToDataURL = async (file: File) => {
    return new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            resolve(reader.result as string);
        };
    });
};