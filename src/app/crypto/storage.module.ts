import { NgModule } from '@angular/core';
import { KEYS_BLOB_STORE_NAME, USER_OBJECT_HASH_NAME } from './constants';
import { IndexedDbService } from './indexed-db.service';
import { CryptoService } from './crypto.service';
import { SessionStorageService } from './session-storage.service';



@NgModule({
    declarations: [],
    imports: [],
    providers: [
        IndexedDbService,
        CryptoService,
        SessionStorageService,
        { provide: KEYS_BLOB_STORE_NAME, useValue: 'keys_blob' },
        { provide: USER_OBJECT_HASH_NAME, useValue: 'user_hash' }
    ]
})
export class StorageModule {}