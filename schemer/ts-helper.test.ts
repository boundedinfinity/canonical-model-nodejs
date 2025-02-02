import { expect, test } from "bun:test";
import { b } from './ts-helper'

test("TypescriptBuilder", () => {
    console.log('====================================')
    console.log(b()
        .export().class().literal("Label").curly(
            b().newline().tab().literal("id").colon().string().equals().literal("NIL_UUID").semicolon().newline()
        )
        .emit()
    )
    console.log('====================================')
});

