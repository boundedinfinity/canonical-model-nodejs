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
                            b.id('v4').as().id('uuid'),
                            b.id('NIL').as().b(nil_uuid)
                        ).from().literal('uuid').semicolon()
                    )

                    bldr.export().class().id(className)

                    const members: TypescriptBuilder[] = [
                        b.id('id').colon().string().equals().b(nil_uuid)
                    ]
                    members.push(...obj.properties.map(prop => classMembers(obj, prop)))

                    const ctor = b.ctor(...obj.properties.map(prop => classCtorArgs(obj, prop)))
                    const cbody = b.body(...obj.properties.map(prop => classCtorBody(obj, prop)))

                    bldr.body(...members, ctor, cbody)
                    break
                case 'string':
                case 'bool':
                case 'int':
                case 'float':
                case 'ref':
                case 'array':
                default:
                    throw new Error(`${classDef.name}: kind not supported: ${obj.kind}`)
            }

            emitters.push(bldr)
        }

        const classMembers = (obj: ObjectSchema, prop: KindSchema): TypescriptBuilder => {
            switch (prop.kind) {
                case 'object':
                    {
                        const bldr = b.id(tsHelper.name.ts.property(prop))
                        if (prop.optional) bldr.question()

                        bldr.colon().id(tsHelper.name.ts.class(prop))
                        return bldr
                    }
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
                    throw new Error(`${classMembers.name} kind not supported: ${obj.kind}`)
            }
        }

        const classCtorArgs = (obj: ObjectSchema, prop: KindSchema): TypescriptBuilder => {
            if (prop.optional) return b.noop()

            const bldr: TypescriptBuilder = b.id(tsHelper.name.ts.property(prop)).colon()

            switch (prop.kind) {
                case 'object':
                    bldr.colon().id(tsHelper.name.ts.class(prop))
                    break
                case 'float':
                case 'string':
                case 'bool':
                case 'int':
                    bldr.id(tsHelper.type(prop))
                    break
                case 'array':
                    if (this.registry.isPrimitive(prop.items))
                        bldr.id(tsHelper.type(prop.items))
                    else
                        bldr.id(tsHelper.name.ts.class(prop))
                    bldr.square()
                    break
                case 'ref':
                    if (this.registry.isPrimitive(prop.ref))
                        bldr.id(tsHelper.type(prop))
                    else
                        bldr.id(tsHelper.name.ts.class(prop))
                    break
                default:
                    throw new Error(`${classCtorArgs.name} kind not supported: ${obj.kind}`)
            }

            return bldr
        }

        const classCtorBody = (obj: ObjectSchema, prop: KindSchema): TypescriptBuilder => {
            if (prop.optional) return b.noop()
            const name = tsHelper.name.ts.property(prop)
            return b.self().dot().id(name).equals().id(name)
        }

        const zodStatement = (obj: ObjectSchema): TypescriptBuilder => {
            const statement: TypescriptBuilder = b.export().const().id(tsHelper.name.zod.property(obj))


            const zodProperty = (obj: KindSchema, prop: KindSchema): TypescriptBuilder => {
                const property: TypescriptBuilder = b.id(tsHelper.name.ts.property(prop))

                switch (prop.kind) {
                    case 'object':
                        property.id(tsHelper.name.zod.property(prop))
                        break
                    case 'float':
                    case 'string':
                    case 'bool':
                    case 'int':

                        break
                    case 'array':
                        if (this.registry.isPrimitive(prop.items))
                            statement.id(tsHelper.type(prop.items))
                        else
                            statement.id(tsHelper.name.ts.class(prop))
                        statement.square()
                        break
                    case 'ref':
                        if (this.registry.isPrimitive(prop.ref))
                            statement.id(tsHelper.type(prop))
                        else
                            statement.id(tsHelper.name.ts.class(prop))
                        break
                    default:
                        throw new Error(`${classCtorArgs.name} kind not supported: ${obj.kind}`)
                }

                return property
            }

            const properties: TypescriptBuilder[] = obj.properties.map(prop => zodProperty(obj, prop))
            return statement.chain(b.id('z'), b.id('object').object(...properties))
        }

        this.registry.registry.forEach((kind) => classDef(kind))
        return emitters.map(e => e.emit()).join('\n\n')
    }
}
