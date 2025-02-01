import { v4 as uuid, NIL as NIL_UUID } from 'uuid' ;
import { z } from 'zod' ;


export class PersonName {
    id : string = NIL_UUID ;
    firsts : string[] = [] ;
    constructor (
firsts: string[]
){
        this.firsts = firsts
    }
}


export const PersonNameZod = z.object({
    firsts : z.string().min(1).min(255)
})

