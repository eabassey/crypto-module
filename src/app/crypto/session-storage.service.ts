import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';


@Injectable()
export class SessionStorageService {
    constructor() { }

    // Query by property predicate
    queryByProp(idsCollection: Observable<number[] | string[]>, predicate: (obj: any) => boolean): Observable<any> {
        const collection = [];
        return idsCollection
            .map(ids => {
                for (const id of ids) {
                    const data = JSON.parse(sessionStorage.getItem(id.toString()));
                    collection.push(data);
                }
                return collection;
            })
            .map(objs => {
                const filtered = [];
                for (const obj of objs) {
                    const valid = predicate(obj);
                    if (valid) {
                        filtered.push(obj);
                    }
                }
                return filtered;
            });
    }

    // Query by Id
    queryById(idsCollection: Observable<number[] | string[]>, predicate: (obj: any) => boolean): Observable<any> {
        const collection = [];
        return idsCollection
            .map(ids => {
                for (const id of ids) {
                    if (predicate(id)) {
                        const data = JSON.parse(sessionStorage.getItem(id.toString()));
                        collection.push(data);
                    }
                }
                return collection;
            });
    }
}