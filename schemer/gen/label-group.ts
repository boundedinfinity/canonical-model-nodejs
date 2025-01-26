import { v4 as uuid, NIL as NIL_UUID } from 'uuid' ;
import { z } from 'zod' ;
import { Label } from './label.ts' ;


export
class
LabelGroup
{
    id : string = NIL_UUID ;
    name : string = '-' ;
    description? : string ;
    labels? : Label[] ;
    constructor ( name:string ) {
        this.name = name
    }
}

