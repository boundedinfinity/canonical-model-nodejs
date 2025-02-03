import type { KindSchema, ObjectSchema } from './kind'
import { KindUtils, KindRegistry } from './kind'
import { Emitter, utils } from './utils'
import { b, tsHelper, TypescriptBuilder } from './ts-helper'

export type KindToTypescriptTransatorOptions = {

}

export class KindToTypescriptTransator {
    registry: KindRegistry
    options: KindToTypescriptTransatorOptions = {}

    constructor(registry: KindRegistry, options?: Partial<KindToTypescriptTransatorOptions>) {
        this.options = { ...this.options, ...options }
        this.registry = registry
    }

    process(kind: KindSchema) {

    }

    emit(): string {
        const emitters: Emitter[] = []

        const classDef = (obj: KindSchema) => {
            const className = tsHelper.name.ts.class(obj)
            const bldr = b.o()

            const nil_uuid = b.id('NIL_UUID')

            switch (obj.kind) {
                case 'object':
                    emitters.push(
                        b.import().curly(
                            b.id('v4').as().id('uuid').comma(),
                            b.id('NIL').as().b(nil_uuid)
                        ).from().literal('uuid').semicolon()
                    )

                    bldr.export().class().id(className)

                    const members: TypescriptBuilder[] = [
                        b.id('id').colon().string().equals().b(nil_uuid)
                    ]
                    members.push(...obj.properties.map(prop => classMembers(obj, prop)))

                    const cargs = obj.properties.map(prop => classConstructor(obj, prop))


                    bldr.body(...members)
                    break
                case 'string':
                case 'bool':
                case 'int':
                case 'float':
                case 'ref':
                case 'array':
                default:
                    throw new Error(`kind not supported: ${obj.kind}`)
            }

            emitters.push(bldr)
        }



        const classMembers = (obj: KindSchema, prop: KindSchema): TypescriptBuilder => {
            switch (prop.kind) {
                case 'object':
                    const bldr = b.id(tsHelper.name.ts.property(prop))
                    if (prop.optional) bldr.question()
                    bldr.colon().id(tsHelper.name.ts.class(prop))
                    return bldr
                case 'string':
                case 'bool':
                case 'float':
                case 'int':
                    {
                        const bldr = b.id(tsHelper.name.ts.property(prop))
                        if (prop.optional) bldr.question()
                        bldr.colon().id(tsHelper.type(prop))
                        if (!prop.optional) bldr.equals().id(tsHelper.defaults.kindValue(prop))
                        return bldr
                    }
                case 'ref':
                    {
                        const bldr = b.id(tsHelper.name.ts.property(prop))
                        if (prop.optional) bldr.question()
                        bldr.colon()
                        if (this.registry.isPrimitive(prop.ref)) {
                            bldr.id(tsHelper.type(prop))
                            if (!prop.optional) bldr.equals().id(tsHelper.defaults.kindValue(prop))
                        } else {
                            bldr.id(tsHelper.name.ts.class(prop))
                        }
                        return bldr
                    }
                case 'array':
                    {
                        const bldr = b.id(tsHelper.name.ts.property(prop))
                        if (prop.optional) bldr.question()
                        bldr.colon()
                        if (this.registry.isPrimitive(prop.items)) {
                            bldr.id(tsHelper.type(prop.items))
                            if (!prop.optional) bldr.equals().id(tsHelper.defaults.kindValue(prop))
                        } else {
                            bldr.id(tsHelper.name.ts.class(prop))
                        }
                        bldr.square()
                        return bldr
                    }

                default:
                    throw new Error(`kind not supported: ${obj.kind}`)
            }
        }

        const classConstructor = (obj: KindSchema, prop: KindSchema): TypescriptBuilder => {
            const propName = tsHelper.name.ts.property(prop)
            const bldr = b.id(propName).colon()

            switch (prop.kind) {
                case 'object':
                    break
                case 'string':
                case 'bool':
                case 'int':
                    {
                        const typ = tsHelper.type(prop)
                        bldr.id(typ)
                    }
                    break
                case 'float':
                case 'array':
                case 'ref':
                default:
                    throw new Error(`kind not supported: ${obj.kind}`)
            }

            return bldr
        }

        this.registry.registry.forEach((kind) => classDef(kind))

        return emitters.map(e => e.emit()).join('\n\n')
    }
}
