import { v4 as uuid, NIL as NIL_UUID } from 'uuid' ;
import { z } from 'zod' ;


export class Label {
    id : string = NIL_UUID ;
    name : string = '-' ;
    description? : string ;
    constructor ( name:string ) {
        this.name = name
    }
}

