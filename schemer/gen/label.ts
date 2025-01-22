import { v4 as uuid, NIL as NIL_UUID } from "uuid";
import { z } from "zod";

export class Label {
    id: string = NIL_UUID;
    name: string = '-';
    description?: string;
}

export const LabelZod = z.object({    
    id: z.string().default(NIL_UUID),
    name : z.string().min(2).max(100).default('-'),
    description : z.string().max(500).optional(),
    });
