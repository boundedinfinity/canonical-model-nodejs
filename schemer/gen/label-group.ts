import { v4 as uuid, NIL as NIL_UUID } from "uuid";
import { z } from "zod";

export class LabelGroup {
    id: string = NIL_UUID;
    name: string = '-';
    description?: string;
    label?: Label[];
}

export const LabelGroupZod = z.object({    
    id: z.string().default(NIL_UUID),
    name : z.string().max(100).default('-'),
    description : z.string().max(500).optional(),
    });
