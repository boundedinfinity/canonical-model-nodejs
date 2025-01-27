// https://www.fullstory.com/blog/discriminated-unions-and-exhaustiveness-checking-in-typescript/

import npath from 'node:path'
import type { ProjectSchema, KindSchema, ObjectSchema } from './schema'
import { schemaUtils } from './schema'
import { stat } from 'node:fs'
import {
    tsutils,
    TsgLanguageGenerator, TsgFile, TsgClass, TsgProperty,
    TsgConstructor, TsgAssignement, TsgFluidFunction,
    TypeScriptFuntionCall, TsgObjectLiteral, TsgObjectLiteralProperty,
    TsgLiteral, TsgBareword
} from './ts-generator'
import utils from './utils'

export class Generator {
    private registry = new Map<string, KindSchema>
    private tsProject = new TsgLanguageGenerator({ formatOutput: true })
    private project: ProjectSchema
    private rootDir = npath.join(import.meta.url, "..")

    constructor(project: ProjectSchema) {
        this.project = project
    }

    private ensureRegister(kind: KindSchema) {
        const typ = schemaUtils.getKindKind(kind)
        const name = schemaUtils.getKindName(kind)

        if (!this.registry.has(name)) {
            this.registry.set(name, kind)
        }
    }

    private isRegistered(nameOrKind: string | KindSchema): boolean {
        let name: string
        if (typeof nameOrKind === 'string')
            name = nameOrKind
        else
            name = schemaUtils.getKindName(nameOrKind)

        return this.registry.has(name)
    }


    private registerKinds(schema: KindSchema, parent?: KindSchema) {
        if (!parent) this.ensureRegister(schema)

        switch (schema.kind) {
            case 'object':
                schema.properties.forEach(property => {
                    switch (property.kind) {
                        case 'array':
                        case 'ref':
                            this.registerKinds(property, schema)
                            break
                    }
                })
                break
            case 'array':
                switch (schema.items.kind) {
                    case 'ref':
                        this.registerKinds(schema.items, parent)
                        break;
                }
                break
            case 'ref':
                this.registerKinds(schema.ref)
                break
            case 'bool':
            case 'enum':
            case 'int':
            case 'string':
                console.log(`processKinds0: skipping ${schemaUtils.getKindName(schema)}`)
                break
        }
    }

    private validateKindReferences(kind: KindSchema, parent?: KindSchema) {
        const check = (schema: KindSchema) => {
            if (!this.isRegistered(schema))
                throw new Error(`reference kind ${schemaUtils.getKindName(schema)} not found`)
        }

        switch (kind.kind) {
            case 'object':
                check(kind)
                kind.properties.forEach(property => this.validateKindReferences(property, kind))
                break
            case 'array':
                this.validateKindReferences(kind.items, parent)
                break
            case 'ref':
                this.validateKindReferences(kind.ref, parent)
                break
            case 'enum':
            case 'bool':
            case 'int':
            case 'string':
                break
        }
    }

    private createGenPath(...parts: string[]): string {
        return npath.join(import.meta.dir, "gen", ...parts)
    }

    private processTopLevelKinds(schema: KindSchema) {
        const filename = tsutils.name('file', schemaUtils.getKindName(schema))
        const filepath = npath.join(this.createGenPath(), filename)
        const file = this.tsProject.getFile(filename)

        switch (schema.kind) {
            case 'object':
                this.processTypescriptClass(file, schema)
                this.processZodSchema(file, schema)
                // this.processDrizzleObject(schema, sourceFile)
                break
        }
    }

    private processZodSchema(file: TsgFile, kind: ObjectSchema) {
        const common = () => {

        }

        const process = (current: KindSchema, currentName?: string) => {
            if (!currentName)
                currentName = tsutils.name('ts-variable', schemaUtils.getKindName(current))

            switch (current.kind) {
                case 'object':
                    const propName = tsutils.name('zod-schema', schemaUtils.getKindName(current))
                    const propFile = this.tsProject.findFile(propName)

                    if (propFile) {
                        if (propFile.name !== file.name) {
                            file.getImport(propFile.name).addNamedImport(propName)
                        }
                        properties.push(
                            new TsgObjectLiteralProperty(currentName, new TsgBareword(propName))
                        )
                    }
                    break
                case 'string':
                    const sfluid = new TsgFluidFunction('z')
                    sfluid.call('string')
                    current.trimmed && sfluid.call('trim')
                    current.min && sfluid.call('min').literal(current.min)
                    current.max && sfluid.call('min').literal(current.max)
                    current.startsWith && sfluid.call('startsWith').literal(current.startsWith)
                    current.endsWith && sfluid.call('endsWith').literal(current.endsWith)
                    current.pattern && sfluid.call('regex').bareword(`new RegExp('${current.pattern}')`)
                    current.includes && sfluid.call('includes').literal(current.includes)
                    // current.excludes && sfluid.call('excludes').literal(current.excludes)
                    current.optional && sfluid.call('optional')

                    properties.push(new TsgObjectLiteralProperty(currentName, sfluid))
                    break
                case 'array':
                    process(current.items, currentName)
                    break
                case 'ref':
                    process(current.ref, currentName)
                    break
                case 'int':
                    const ifluid = new TsgFluidFunction('z')
                    ifluid.call('number')
                    ifluid.call('int')
                    current.min && ifluid.call('min').literal(current.min)
                    current.max && ifluid.call('min').literal(current.max)
                    current.multipleOf && ifluid.call('multipleOf').literal(current.multipleOf)
                    current.optional && ifluid.call('optional')
                    properties.push(new TsgObjectLiteralProperty(currentName, ifluid))
                    break
                case 'float':
                    const ffluid = new TsgFluidFunction('z')
                    ffluid.call('number')
                    ffluid.call('int')
                    current.min && ffluid.call('min').literal(current.min)
                    current.max && ffluid.call('min').literal(current.max)
                    current.multipleOf && ffluid.call('multipleOf').literal(current.multipleOf)
                    current.optional && ffluid.call('optional')
                    properties.push(new TsgObjectLiteralProperty(currentName, ffluid))
                    break
                case 'bool':
                    break
                default:
                    // @ts-ignore
                    throw new Error(`processZodSchema: unknown kind ${current.kind}`)
            }
        }

        const tsName = tsutils.name('zod-schema', schemaUtils.getKindName(kind))
        const properties: TsgObjectLiteralProperty[] = []
        kind.properties.forEach(property => process(property))

        if (schemaUtils.hasValidation(kind)) {
            file.getImport('zod').addNamedImport('z')
        }

        const zod = new TsgAssignement(
            { name: tsName, modifiers: { exported: true, const: true }, },
            new TsgFluidFunction('z', [
                new TypeScriptFuntionCall('object', [new TsgObjectLiteral(properties)])
            ])
        )

        file.addAssignment(zod)

    }

    private processTypescriptClass(file: TsgFile, kind: KindSchema) {
        switch (kind.kind) {
            case 'object':
                const kindKind = schemaUtils.getKindKind(kind)
                const tsType = tsutils.name('ts-class', kindKind)

                file.getImport('uuid').addNamedImport(
                    { name: 'v4', alias: 'uuid' },
                    { name: 'NIL', alias: 'NIL_UUID' }
                )

                const klass = file.getClass(tsType)
                klass.exported = true
                klass.addConstructor(new TsgConstructor())
                klass.getProperty("id").set().kind('string').default('NIL_UUID')

                kind.properties.forEach(property => this.processTypescriptClassProperties(file, klass, property))
                break
            default:
                // @ts-ignore
                throw new Error(`processTypescriptClass: unknown kind ${kind.kind}`)
        }
    }

    private processTypescriptClassProperties(file: TsgFile, klass: TsgClass, kind: KindSchema) {
        const kindName = schemaUtils.getKindName(kind)
        const kindKind = schemaUtils.getKindKind(kind)
        const tsName = tsutils.name('ts-property', kindName)
        const prop: TsgProperty = klass.getProperty(tsName)
        const constructor0 = klass.constructors[0]

        const process = (current: KindSchema) => {
            switch (current.kind) {
                case 'object':
                    if (this.isRegistered(current)) {
                        const tsType = tsutils.name('ts-class', kindKind)
                        const propClass = this.tsProject.getClass(tsType)
                        if (propClass) {
                            prop.set().kind(propClass)
                            const propFile = this.tsProject.findClassFile(propClass)

                            if (propFile && propFile.name !== file.name) {
                                file.getImport(propFile.name).addNamedImport(tsType)
                            }

                            if (kind.kind == 'ref' && !kind.optional) {
                                constructor0.addInput({ name: tsName, type: tsType })
                            }
                        }
                    } else {
                        // TODO
                    }
                    break
                case 'array':
                    prop.array = true
                    process(current.items)
                    break
                case 'ref':
                    process(current.ref)
                    break
                case 'enum':
                    // TODO
                    prop.set().kind(tsutils.type(current))
                    break
                case 'string':
                case 'bool':
                case 'float':
                case 'int':
                    prop.set().kind(tsutils.type(current))

                    if (!kind.optional) {
                        constructor0.addInput({
                            name: tsName,
                            type: tsutils.type(current),
                            modifiers: { array: kind.kind == 'array' }
                        })
                        if (!kind.optional)
                            constructor0.body.push(`this.${tsName} = ${tsName}`)
                    }
                    break
                default:
                    // @ts-ignore
                    throw new Error(`processTypescriptClassProperties: unknown kind ${current.kind}`)
            }
        }

        process(kind)

        if (!kind.optional) {
            prop.set().optional(kind.optional).default(tsutils.defaultValue(kind))
        } else {
            prop.optional = kind.optional
        }

        return prop
    }

    processKinds(kinds?: KindSchema[]) {
        kinds?.forEach(schema => this.registerKinds(schema))
        this.registry.values().forEach(kind => this.validateKindReferences(kind))
        this.registry.values().forEach(kind => this.processTopLevelKinds(kind))
    }

    processProject() {
        this.processKinds(this.project.kinds)
        this.tsProject.saveSync()
    }
}
