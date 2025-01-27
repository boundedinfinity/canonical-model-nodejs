import { v4 as uuid, NIL as NIL_UUID } from 'uuid' ;
import { z } from 'zod' ;


export class TestThing {
    id : string = NIL_UUID ;
    testStringRequired : string = '-' ;
    testStringOptional? : string ;
    testIntRequired : number = 0 ;
    testIntOptional? : number ;
    testFloatRequired : number = 0 ;
    testFloatOptional? : number ;
    testBooleanRequired : boolean = false ;
    testBooleanOptional? : boolean ;
    testStringArrayRequired : string[] = [] ;
    testStringArrayOptional? : string[] ;
    testIntArrayRequired : number[] = [] ;
    testIntArrayOptional? : number[] ;
    testFloatArrayRequired : number[] = [] ;
    testFloatArrayOptional? : number[] ;
    testBooleanArrayRequired : boolean[] = [] ;
    testBooleanArrayOptional? : boolean[] ;
    constructor (
testStringRequired: string,
testIntRequired: number,
testFloatRequired: number,
testBooleanRequired: boolean,
testStringArrayRequired: string[],
testIntArrayRequired: number[],
testFloatArrayRequired: number[],
testBooleanArrayRequired: boolean[]
){
        this.testStringRequired = testStringRequired
    this.testIntRequired = testIntRequired
    this.testFloatRequired = testFloatRequired
    this.testBooleanRequired = testBooleanRequired
    this.testStringArrayRequired = testStringArrayRequired
    this.testIntArrayRequired = testIntArrayRequired
    this.testFloatArrayRequired = testFloatArrayRequired
    this.testBooleanArrayRequired = testBooleanArrayRequired
    }
}


export const TestThingZod = z.object({
    testStringRequired : z.string().trim().min(1).min(2).startsWith('a').endsWith('z').regex(new RegExp('.*')).includes('b'),
    testStringOptional : z.string().trim().min(1).min(2).startsWith('a').endsWith('z').regex(new RegExp('.*')).includes('b').optional(),
    testIntRequired : z.number().int().min(1).min(100).multipleOf(5),
    testIntOptional : z.number().int().min(1).min(100).multipleOf(5).optional(),
    testFloatRequired : z.number().int().min(1).min(100).multipleOf(5),
    testFloatOptional : z.number().int().min(1).min(100).multipleOf(5).optional(),
    testStringArrayRequired : z.string().trim().min(1).min(2).startsWith('a').endsWith('z').regex(new RegExp('.*')).includes('b'),
    testStringArrayOptional : z.string().trim().min(1).min(2).startsWith('a').endsWith('z').regex(new RegExp('.*')).includes('b'),
    testIntArrayRequired : z.number().int().min(1).min(100).multipleOf(5),
    testIntArrayOptional : z.number().int().min(1).min(100).multipleOf(5),
    testFloatArrayRequired : z.number().int().min(1).min(100).multipleOf(5),
    testFloatArrayOptional : z.number().int().min(1).min(100).multipleOf(5)
})

