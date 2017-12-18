import { InjectionToken } from "@angular/core";

// Name of blob object
export const KEYS_BLOB_STORE_NAME = new InjectionToken<string>('KEYS_BLOB_STORE_NAME');

// Name of Hash of user object kept in local storage
export const USER_OBJECT_HASH_NAME = new InjectionToken<string>('USER_OBJECT_HASH_NAME');
