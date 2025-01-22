import { v4 as uuid, NIL as NIL_UUID } from "uuid";
import { z } from "zod";

export class TestThing {
    id: string = NIL_UUID;
    testStringRequired: string = '-';
    testStringOptional?: string;
    testIntRequired: number = 0;
    testIntOptional?: number;
    testFloatRequired: number = 0;
    testFloatOptional?: number;
    testBooleanRequired: boolean = false;
    testBooleanOptional?: boolean;
    testStringArrayRequired: string[] = [];
    testStringArrayOptional?: string[];
    testIntArrayRequired: number[] = [];
    testIntArrayOptional?: number[];
    testFloatArrayRequired: number[] = [];
    testFloatArrayOptional?: number[];
    testBooleanArrayRequired: boolean[] = [];
    testBooleanArrayOptional?: boolean[];
}

export const TestThingZod = z.object({    
    id: z.string().default(NIL_UUID),
    testStringRequired : z.string().min(1).max(2).default('-'),
    testStringOptional : z.string().min(1).max(2).optional(),
    testIntRequired : z.number().int().min(1).max(2).default(0),
    testIntOptional : z.number().int().min(1).max(2).optional(),
    testFloatRequired : z.number().min(1).max(2).default(0),
    testFloatOptional : z.number().min(1).max(2).optional(),
    testBooleanRequired : z.boolean().default(false),
    testBooleanOptional : z.boolean().optional(),
    });
