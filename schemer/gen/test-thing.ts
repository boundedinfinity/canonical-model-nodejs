import { v4 as uuid, NIL as NIL_UUID } from 'uuid' ;
import { z } from 'zod' ;


export class TestThing {
    id : string = NIL_UUID ;
    testStringArrayRequired : string[] = [] ;
    constructor (
testStringArrayRequired: string[]
){
        this.testStringArrayRequired = testStringArrayRequired
    }
}


export const TestThingZod = z.object({
    testStringArrayRequired : z.string().trim().min(1).min(2).startsWith('a').endsWith('z').regex(new RegExp('.*')).includes('b')
})

