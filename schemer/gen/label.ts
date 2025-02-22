import { v4 as uuid, NIL as NIL_UUID } from 'uuid';
import { z } from 'zod';


export class Label {
    id: string = NIL_UUID;
    name: string = '-';
    description?: string;
    constructor(
        name: string
    ) {
        this.name = name
    }
}


export const LabelZod = z.object({
    name: z.string().min(2).min(100).includes(''),
    description: z.string().min(500).optional()
})

export class Label2 {
    id: string = NIL_UUID
    name: string
    description?: string
}
