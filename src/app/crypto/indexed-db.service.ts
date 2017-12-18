import { Injectable } from '@angular/core';
import Dexie from 'dexie';

@Injectable()
export class IndexedDbService extends Dexie {

    blobs: Dexie.Table<{id: string, blob: Blob}, string>;
    claims: Dexie.Table<{id: number, cipher: string}, number>;
    jobs: Dexie.Table<{id?: number, cipher: string}, number>;
    constructor() {
        super('ThinClientDb');
        this.version(1).stores({
            blobs: 'id',
            claims: 'id',
            jobs: 'id'
        });
    }
}