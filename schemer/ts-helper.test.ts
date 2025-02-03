import { expect, test } from "bun:test";
import { b } from './ts-helper'

test("TypescriptBuilder", () => {
    console.log('====================================')

    console.log(
        b.import().curly(
            b.id('v4').as().id('uuid'),
            b.id('NIL').as().id('NIL_UUID')
        ).from().literal('uuid').semicolon()
            .emit()
    ); console.log()

    console.log(
        b.export().class().literal("Label").body(
            b.literal("id").colon().string().equals().literal("NIL_UUID").semicolon(),
            b.literal("name").colon().string().equals().literal(`'-'`).semicolon(),
            b.literal('description').question().colon().string().semicolon(),
        ).emit()
    ); console.log()

    console.log(
        b.export().const().id("LabelZod").equals()
            .id('z').dot().id('object').parens(
                b.object(
                    b.id('name').colon().chain(
                        b.id('z'),
                        b.id('string'),
                        b.id('min').parens(b.literal(2)),
                        b.id('max').parens(b.literal(100))
                    ),
                    b.id('description').colon().chain(
                        b.id('z'),
                        b.id('string'),
                        b.id('min').parens(b.literal(2)),
                        b.id('max').parens(b.literal(100))
                    )
                )
            )
            .emit()
    ); console.log()
    console.log('====================================')

})
