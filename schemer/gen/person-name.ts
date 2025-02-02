import { v4 as uuid, NIL as NIL_UUID } from 'uuid' ;
import { z } from 'zod' ;


export class PersonName {
    id : string = NIL_UUID ;
    firsts : string[] = [] ;
    middles : string[] = [] ;
    lasts : string[] = [] ;
    constructor (
firsts: string[],
middles: string[],
lasts: string[]
){
        this.firsts = firsts
    this.middles = middles
    this.lasts = lasts
    }
}


export const PersonNameZod = z.object({
    firsts : z.string().min(1).min(255),
    middles : z.string().min(1).min(255),
    lasts : z.string().min(1).min(255)
})

