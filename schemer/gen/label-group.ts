import { v4 as uuid, NIL as NIL_UUID } from 'uuid';
import { Label, LabelZod } from './label.ts';
import { z } from 'zod';


export class LabelGroup {
    id: string = NIL_UUID;
    name: string = '-';
    description?: string;
    labels?: Label[];
    constructor(
        name: string
    ) {
        this.name = name
    }
}


export const LabelGroupZod = z.object({
    name: z.string().min(100),
    description: z.string().min(500).optional(),
    labels: LabelZod
})

