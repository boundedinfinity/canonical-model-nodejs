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
    TsgLiteral, TsgBareword, TsgFunctionInputArg
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
            console.log(`registering ${name}`)
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

    private processTopLevelKinds(kind: KindSchema) {
        const filename = tsutils.name('file', schemaUtils.getKindName(kind))
        const file = this.tsProject.getFile(filename)

        switch (kind.kind) {
            case 'object':
                this.processTypescriptClass(file, kind)
                this.processZodSchema(file, kind)
                break
        }
    }

    private processZodSchema(file: TsgFile, kind: ObjectSchema) {
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

        const zodName = tsutils.name('zod-schema', schemaUtils.getKindName(kind))
        const properties: TsgObjectLiteralProperty[] = []
        kind.properties.forEach(property => process(property))

        if (schemaUtils.hasValidation(kind)) {
            file.getImport('zod').addNamedImport('z')
        }

        const zod = new TsgAssignement(
            { name: zodName, modifiers: { exported: true, const: true }, },
            new TsgFluidFunction('z', [
                new TypeScriptFuntionCall('object', [new TsgObjectLiteral(properties)])
            ])
        )

        file.addAssignment(zod)
    }

    private processTypescriptClass(file: TsgFile, classKind: ObjectSchema) {
        const process = (propKind: KindSchema, prop?: TsgProperty) => {
            if (!prop) {
                const propName = tsutils.name('ts-property', schemaUtils.getKindName(propKind))
                prop = tsClass.getProperty(propName)
                prop.modifiers.optional = propKind.optional
            }

            switch (propKind.kind) {
                case 'object':
                    if (this.isRegistered(propKind)) {
                        const otherName = tsutils.name('ts-class', schemaUtils.getKindName(propKind))
                        const otherClass = this.tsProject.getClass(otherName)
                        if (otherClass) {
                            prop.kind = otherClass
                            const otherFile = this.tsProject.findClassFile(otherClass)

                            if (otherFile && otherFile.name !== file.name) {
                                file.getImport(otherFile.name).addNamedImport(otherClass)
                            }
                        }
                    } else {
                        // TODO
                    }
                    break
                case 'array':
                    prop.modifiers.array = true
                    if (prop.isRequired())
                        prop.modifiers.default = tsutils.defaultValue(propKind)
                    process(propKind.items, prop)
                    break
                case 'ref':
                    process(propKind.ref, prop)
                    break
                case 'enum':
                    // TODO
                    prop.kind = tsutils.type(propKind)
                    break
                case 'string':
                case 'bool':
                case 'float':
                case 'int':
                    prop.kind = tsutils.type(propKind)
                    if (prop.isRequired() && !prop.modifiers.default)
                        prop.modifiers.default = tsutils.defaultValue(propKind)

                    if (prop.isRequired()) {
                        tsConstructor.addInput(TsgFunctionInputArg.fromProperty(prop))
                        tsConstructor.body.push(`this.${prop.name} = ${prop.name}`)
                    }
                    break
                default:
                    // @ts-ignore
                    throw new Error(`processTypescriptClassProperties: unknown kind ${propKind.kind}`)
            }
        }

        const classKindKind = schemaUtils.getKindKind(classKind)
        const tsClassName = tsutils.name('ts-class', classKindKind)

        file.getImport('uuid').addNamedImport(
            { name: 'v4', alias: 'uuid' },
            { name: 'NIL', alias: 'NIL_UUID' }
        )

        const tsConstructor = new TsgConstructor()
        const tsClass = file.getClass(tsClassName)
        tsClass.exported = true
        tsClass.addConstructor(tsConstructor)
        const id = tsClass.getProperty("id")
        id.kind = 'string'
        id.modifiers.default = 'NIL_UUID'

        classKind.properties.forEach(property => process(property))
    }



    processKinds(kinds?: KindSchema[]) {
        kinds?.forEach(schema => this.registerKinds(schema))
        this.registry.values().forEach(kind => this.validateKindReferences(kind))

        this.registry.values().forEach(kind => {
            const classKindKind = schemaUtils.getKindKind(kind)
            const filename = tsutils.name('file', classKindKind)
            const tsClassName = tsutils.name('ts-class', classKindKind)
            const file = this.tsProject.getFile(filename)
            const klass = file.getClass(tsClassName)
            console.log(`class: ${klass.name}`)
        })

        this.registry.values().forEach(kind => this.processTopLevelKinds(kind))
    }

    processProject() {
        this.processKinds(this.project.kinds)
        this.tsProject.saveSync()
    }
}
