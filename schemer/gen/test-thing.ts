import { v4 as uuid, NIL as NIL_UUID } from 'uuid';
import { z } from 'zod';


export class TestThing {
    id: string = NIL_UUID;
    testStringArrayOptional?: string[];
    constructor() { }
}


export const TestThingZod = z.object({
    testStringArrayOptional: z.array(
        z.string().trim().min(1).min(2).startsWith('a').endsWith('z').regex(new RegExp('.*')).includes('b')
    ).optional()
})

