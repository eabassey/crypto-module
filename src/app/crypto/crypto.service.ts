import { Injectable, Inject } from '@angular/core';
import { Util } from './util';
import { IndexedDbService } from './indexed-db.service';
import { KEYS_BLOB_STORE_NAME, USER_OBJECT_HASH_NAME } from './constants';
import { Observable } from 'rxjs/Observable';

@Injectable()
export class CryptoService {
    constructor(
        private indexedDb: IndexedDbService,
        @Inject(KEYS_BLOB_STORE_NAME) private blobs_name,
        @Inject(USER_OBJECT_HASH_NAME) private user_object_name
    ) { }

    // use in authentication effects after successful log in not in app component
    initializeAtStart(userObject: any, collection: Observable<any>) {
        // If user is already logged in
        if (localStorage.getItem('jwtToken')) {
            // if hash exists
            if (localStorage.getItem(this.user_object_name)) {
                // TODO-- then compaire incoming hash with it

                // if hashes match, don't delete anything (user is same)

                // if hashes don't match, recreate DB and keys blob with incoming user object
                this.recreateDB()
                .then(database => {
                    if (database.isOpen) {
                        this.createKeyAsBlobToIndexedDb(userObject)
                            // encrypt data to indexeddb
                            .then(() => {
                                collection.map(objs => {
                                    for (const obj of objs) {
                                        this.encryptWithAesCbcKey(obj);
                                    }
                                })
                            })
                            // decrypt to session  storage
                            .then(() => {
                                // if user is sil
                                this.indexedDb.claims.toArray()
                                .then(objs => {
                                  // Start by getting Key  and IV from blob as bytes
                                  this.indexedDb.blobs.get(this.blobs_name)
                                    .then(keyBlobObject => {
                          
                                      // create reader to read blob contents
                                      const reader = new FileReader();
                                      reader.onload = () => {
                                        const ivBytes = new Uint8Array(reader.result.slice(0, 16));
                                        const keyBytes = new Uint8Array(reader.result.slice(16, 32));
                          
                                        // Make a CryptoKey from the Key string
                                        return window.crypto.subtle.importKey(
                                          'raw',
                                          keyBytes,
                                          { name: 'AES-CBC', length: 256 },
                                          false,
                                          ['decrypt']
                                        )
                                          .then((key) => {
                                            // for each cipher object decrypt...
                                            for (const obj of objs) {
                                              // cipher conversion
                                              const cipherBytes = Util.base64ToByteArray(obj.cipher);
                                              // Use the CryptoKey and IV to decrypt the cipher
                                              window.crypto.subtle.decrypt(
                                                { name: 'AES-CBC', iv: ivBytes },
                                                key,
                                                cipherBytes
                                              )
                                                .then((cipherBuffer) => {
                                                  const plaintextBytes = new Uint8Array(cipherBuffer);
                          
                                                  const plaintextString = Util.byteArrayToString(plaintextBytes);
                          
                                                  const jsonData = JSON.parse(plaintextString);
                                                  
                                                  // decrypting into sessionStorage
                                                  sessionStorage.setItem(`${jsonData.id}`, plaintextString);
                                                });
                                            }
                          
                                          });
                                      };
                          
                                      // ultimately we read from the blob
                                      reader.readAsArrayBuffer(keyBlobObject.blob);
                          
                                    });
                                })
                            })
                    }
                });
            } else {
                // this.recreateDB()
                // .then(database => {
                //     if (database.isOpen) {
                //         this.createKeyAsBlobToIndexedDb(userObject);
                //     }
                // });
            }

        }

    }

    createKeyAsBlobToIndexedDb(userObject: any) {

        const iterations = 1000000;   // Longer is slower... hence stronger
        const saltString = 'This is my salt. I need more pepper and tomatoes to spice up..';
        const saltBytes = Util.stringToByteArray(saltString);

        // Get byteArray of user object, IV, and Hash
        const userString = JSON.stringify(userObject);
        const userBytes = Util.stringToByteArray(userString);
        const ivBytes = window.crypto.getRandomValues(new Uint8Array(16));

        // deriveKey needs to be given a base key. This is just a
        // CryptoKey that represents the starting userObject.
        return window.crypto.subtle.importKey(
            'raw',
            userBytes,
            { name: 'PBKDF2' }
            ,
            false,
            ['deriveKey']
        )
            .then((baseKey) => {
                return window.crypto.subtle.deriveKey(
                    // Firefox currently only supports SHA-1 with PBKDF2
                    { name: 'PBKDF2', salt: saltBytes, iterations: iterations, hash: 'SHA-1' },
                    baseKey,
                    { name: 'AES-CBC', length: 256 }, // Resulting key type we want
                    true,
                    ['encrypt', 'decrypt']
                );
            })
            .then(aesCbcKey => {
                // Export to ArrayBuffer
                return window.crypto.subtle.exportKey(
                    'raw',
                    aesCbcKey
                );
            })
            .then((keyBuffer) => {
                const keybytes = new Uint8Array(keyBuffer, 0, 16);
                this.hashCredentialsToArrayBuffer(userObject)
                    .then(buffer => {
                        const hashBytes = new Uint8Array(buffer, 0, 16);

                        // Build a Blob with the 16-byte IV followed by the ciphertext
                        const blob = new Blob(
                            [ivBytes, keybytes, hashBytes],
                            { type: 'application/octet-stream' }
                        );
                        // Store keys blob in indexedDB
                        this.indexedDb.blobs.add({ id: this.blobs_name, blob: blob });

                        // Store Hash too in local Storage
                        const userObjectHashString = Util.byteArrayToBase64(hashBytes);
                        localStorage.setItem(this.user_object_name, userObjectHashString);
                    });
            });

    }

    // local method
    private hashCredentialsToArrayBuffer(credentials: object) {
        const credentialsString = JSON.stringify(credentials);
        // Get byteArray of credentials string
        const credentialBytes = Util.stringToByteArray(credentialsString);
        return window.crypto.subtle.digest(
            { name: 'SHA-512' },
            credentialBytes
        );
    }

    // -- encrypt data
    encryptWithAesCbcKey(object: any) {
        const objectString = JSON.stringify(object);
        const objectBytes = Util.stringToByteArray(objectString);

        // Start by getting Key  and IV from blob as bytes
        return this.indexedDb.blobs.get(this.blobs_name)
            .then(keyBlobObject => {
                // create reader to read blob contents
                const reader = new FileReader();
                reader.onload = () => {
                    const ivBytes = new Uint8Array(reader.result.slice(0, 16));
                    const keyBytes = new Uint8Array(reader.result.slice(16, 32));

                    // Make a CryptoKey from the Key string
                    return window.crypto.subtle.importKey(
                        'raw',
                        keyBytes,
                        { name: 'AES-CBC', length: 256 },
                        false,
                        ['encrypt']
                    )
                        .then((key) => {
                            // Use the CryptoKey to encrypt the plaintext
                            return window.crypto.subtle.encrypt(
                                { name: 'AES-CBC', iv: ivBytes },
                                key,
                                objectBytes
                            );
                        })
                        .then((cipherBuffer) => {
                            // Encode cipherBuffer to base 64 to be put in IndexedDB
                            const cipherBytes = new Uint8Array(cipherBuffer);
                            const base64Ciphertext = Util.byteArrayToBase64(cipherBytes);

                            // Add encrypted object to claims in IndexedDB
                            this.indexedDb.claims.add({ id: object.id, cipher: base64Ciphertext })
                                .catch(err => console.log(`You landed an error: ${err}`));
                        });
                };

                // ultimately we read from the blob
                reader.readAsArrayBuffer(keyBlobObject.blob);

            });
    }

    // -- decrypt data
    decryptWithAesCbcKey(cipherText) {
        // cipher conversion
        const cipherBytes = Util.base64ToByteArray(cipherText);

        // Start by getting Key  and IV from blob as bytes
        return this.indexedDb.blobs.get(this.blobs_name)
            .then(keyBlobObject => {

                // create reader to read blob contents
                const reader = new FileReader();
                reader.onload = () => {
                    const ivBytes = new Uint8Array(reader.result.slice(0, 16));
                    const keyBytes = new Uint8Array(reader.result.slice(16, 32));
                    console.log('bytes', ivBytes, keyBytes);
                    // Make a CryptoKey from the Key string
                    return window.crypto.subtle.importKey(
                        'raw',
                        keyBytes,
                        { name: 'AES-CBC', length: 256 },
                        false,
                        ['decrypt']
                    )
                        .then((key) => {
                            // Use the CryptoKey and IV to decrypt the cipher
                            return window.crypto.subtle.decrypt(
                                { name: 'AES-CBC', iv: ivBytes },
                                key,
                                cipherBytes
                            );
                        })
                        .then((cipherBuffer) => {
                            const plaintextBytes = new Uint8Array(cipherBuffer);

                            const plaintextString = Util.byteArrayToString(plaintextBytes);

                            const jsonData = JSON.parse(plaintextString);

                            // decrypting into sessionStorage
                            // sessionStorage.setItem(`${jsonData.id}`, plaintextString);
                        });
                };

                // ultimately we read from the blob
                reader.readAsArrayBuffer(keyBlobObject.blob);
                // return claims;
            });

    }

    recreateDB() {
        return this.indexedDb.delete()
            .then(() => this.indexedDb.open());
    }

}