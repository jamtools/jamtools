import React from 'react';

import jamtools from 'jamtools-core';
import {ModuleAPI} from 'jamtools-core/engine/module_api';
import {IndexedDbFileStorageProvider} from './file_storage_providers/indexed_db_file_storage_provider';
import {FileInfo} from './file_types';

declare module 'jamtools-core/module_registry/module_registry' {
    interface AllModules {
        Files: FilesModule;
    }
}

type FileUploadOptions = {

};

type FileUploadAction<T extends object = {}> = (file: File, args: T) => Promise<UploadSupervisor>;

type CreateFileUploadAction = <T extends object = {}>(
    modAPI: ModuleAPI,
    actionName: string,
    options: FileUploadOptions,
    callback: (fileInfo: FileInfo, args: T) => void
) => FileUploadAction<T>;

type UploadSupervisor = {
    progressSubject: any;
    components: {
        Progress: React.ElementType;
    };
};

type FilesModule = {
    uploadFile: (file: File) => Promise<FileInfo>;
    createFileUploadAction: CreateFileUploadAction;
    deleteFile: (fileId: string) => Promise<void>;
    getFileSrc: (fileId: string) => Promise<string>;
    listFiles: () => FileInfo[];
    useFiles: () => FileInfo[];
}

jamtools.registerModule('Files', {}, async (moduleAPI): Promise<FilesModule> => {
    const allStoredFiles = await moduleAPI.statesAPI.createPersistentState<FileInfo[]>('allStoredFiles', []);

    const fileUploader = new IndexedDbFileStorageProvider();
    await fileUploader.initialize();

    const uploadFile = async (file: File): Promise<FileInfo> => {
        const fileInfo = await fileUploader.uploadFile(file);
        allStoredFiles.setState(files => [...files, fileInfo]);
        return fileInfo;
    };

    const createFileUploadAction = <T extends object,>(
        modAPI: ModuleAPI,
        actionName: string,
        options: FileUploadOptions,
        callback: (fileInfo: FileInfo, args: T) => void
    ): any => {
        return async (file: File, args: T) => {
            const fileInfo = await fileUploader.uploadFile(file);
            allStoredFiles.setState(files => [...files, fileInfo]);

            callback(fileInfo, args);
            // return fileUploader.uploadFile(modAPI, file, args, actionName, options);
        };
    };

    const deleteFile = async (fileId: string) => {
        await fileUploader.deleteFile(fileId);
        allStoredFiles.setState(files => {
            const index = files.findIndex(f => f.id === fileId)!;
            return [
                ...files.slice(0, index),
                ...files.slice(index + 1),
            ];
        });
    };

    return {
        uploadFile,
        createFileUploadAction,
        deleteFile,
        getFileSrc: fileUploader.getFileContent,
        listFiles: allStoredFiles.getState,
        useFiles: allStoredFiles.useState,
    };
});
