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
    testStringArrayRequired : any[] = [] ;
    testStringArrayOptional? : any[] ;
    testIntArrayRequired : any[] = [] ;
    testIntArrayOptional? : any[] ;
    testFloatArrayRequired : any[] = [] ;
    testFloatArrayOptional? : any[] ;
    testBooleanArrayRequired : any[] = [] ;
    testBooleanArrayOptional? : any[] ;
}

