// https://www.fullstory.com/blog/discriminated-unions-and-exhaustiveness-checking-in-typescript/

import npath from 'node:path'
import type { ProjectSchema, KindSchema } from './schema'
import { schemaUtils } from './schema'
import { stat } from 'node:fs'
import {
    tsutils,
    TypeScriptLanguageGenerator, TypeScriptFile, TypeScriptClass, TypeScriptProperty,
    TypeScriptConstructor, TypeScriptAssignement, TypescriptFluidFunction
} from './ts-generator'
import utils from './utils'

export class Generator {
    private registry = new Map<string, KindSchema>
    private tsProject = new TypeScriptLanguageGenerator({ formatOutput: true })
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

    private processZodSchema(file: TypeScriptFile, kind: KindSchema) {
        const tsName = tsutils.name('ts-variable', kind.kind) + 'Zod'
        const assignment = new TypeScriptAssignement({ name: tsName }, ['export', 'const'])
        const fluid = new TypescriptFluidFunction('z')


        const process = (current: KindSchema) => {
            switch (kind.kind) {
                case 'object':

                    break
                default:
                    // @ts-ignore
                    throw new Error(`processTypescriptClass: unknown kind ${kind.kind}`)
            }
        }

        process(kind)
    }

    private processTypescriptClass(file: TypeScriptFile, kind: KindSchema) {
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
                klass.addConstructor(new TypeScriptConstructor())
                klass.getProperty("id").set().kind('string').default('NIL_UUID')

                kind.properties.forEach(property => this.processTypescriptClassProperties(file, klass, property))
                break
            default:
                // @ts-ignore
                throw new Error(`processTypescriptClass: unknown kind ${kind.kind}`)
        }
    }

    private processTypescriptClassProperties(file: TypeScriptFile, klass: TypeScriptClass, kind: KindSchema) {
        const kindName = schemaUtils.getKindName(kind)
        const kindKind = schemaUtils.getKindKind(kind)
        const tsName = tsutils.name('ts-property', kindName)
        const prop: TypeScriptProperty = klass.getProperty(tsName)
        const constructor0 = klass.constructors[0]

        const handleProp = (kind2: KindSchema) => {
            switch (kind2.kind) {
                case 'object':
                    if (this.isRegistered(kind2)) {
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
                    handleProp(kind2.items)
                    break
                case 'ref':
                    handleProp(kind2.ref)
                    break
                case 'enum':
                    // TODO
                    prop.set().kind(tsutils.type(kind2))
                    break
                case 'string':
                case 'bool':
                case 'float':
                case 'int':
                    prop.set().kind(tsutils.type(kind2))

                    if (!kind2.optional) {
                        constructor0.addInput({ name: tsName, type: tsutils.type(kind2) })
                        constructor0.body.push(`this.${tsName} = ${tsName}`)
                    }
                    break
                default:
                    // @ts-ignore
                    throw new Error(`processTypescriptClassProperties: unknown kind ${kind2.kind}`)
            }
        }

        handleProp(kind)

        if (schemaUtils.hasValidation(kind)) {
            file.getImport('zod').addNamedImport('z')
        }

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
