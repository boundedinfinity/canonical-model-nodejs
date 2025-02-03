// https://www.fullstory.com/blog/discriminated-unions-and-exhaustiveness-checking-in-typescript/

import npath from 'node:path'
import type { ProjectSchema, KindSchema, ObjectSchema } from './kind'
import { KindUtils, KindRegistry } from './kind'
import { SqlGenerator } from './sql-generator'
import { KindToSqlDdlTranslator, KindToSqlQueryTranslator } from './kind-to-sql-translator'
import { tsHelper } from './ts-helper'
import {
    TsgLanguageGenerator, TsgFile, TsgProperty, TsgConstructor, TsgAssignement,
    TsgFluidFunction, TypeScriptFuntionCall, TsgObjectLiteral, TsgObjectLiteralProperty,
    TsgBareword, TsgFunctionInputArg
} from './ts-generator'

import { KindToTypescriptTransator } from './kind-typescript-translator'

export class Generator {
    private registry = new KindRegistry()
    private tsProject = new TsgLanguageGenerator({ formatOutput: true })
    private project: ProjectSchema
    private rootDir = npath.join(import.meta.url, "..")

    constructor(project: ProjectSchema) {
        this.project = project
    }

    private createGenPath(...parts: string[]): string {
        return npath.join(import.meta.dir, "gen", ...parts)
    }

    private processTopLevelKinds(kind: KindSchema) {
        const filename = tsHelper.name.ts.file(KindUtils.resolveName(kind))
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
                currentName = tsHelper.name.ts.variable(KindUtils.resolveName(current))

            switch (current.kind) {
                case 'object':
                    const propName = tsHelper.name.zod.schema(KindUtils.resolveName(current))
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

        const zodName = tsHelper.name.zod.schema(KindUtils.resolveName(kind))
        const properties: TsgObjectLiteralProperty[] = []
        kind.properties.forEach(property => process(property))

        if (KindUtils.hasValidation(kind)) {
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
                const propName = tsHelper.name.ts.property(KindUtils.resolveName(propKind))
                prop = tsClass.getProperty(propName)
                prop.modifiers.optional = propKind.optional
            }

            switch (propKind.kind) {
                case 'object':
                    if (this.registry.isRegistered(propKind)) {
                        const otherName = tsHelper.name.ts.class(KindUtils.resolveName(propKind))
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
                        prop.modifiers.default = tsHelper.defaults.kindValue(propKind)
                    process(propKind.items, prop)
                    break
                case 'ref':
                    process(propKind.ref, prop)
                    break
                case 'enum':
                    // TODO
                    prop.kind = tsHelper.type(propKind)
                    break
                case 'string':
                case 'bool':
                case 'float':
                case 'int':
                    prop.kind = tsHelper.type(propKind)
                    if (prop.isRequired() && !prop.modifiers.default)
                        prop.modifiers.default = tsHelper.defaults.kindValue(propKind)

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

        const classKindKind = KindUtils.resolveKind(classKind)
        const tsClassName = tsHelper.name.ts.class(classKindKind)

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
        kinds?.forEach(schema => this.registry.register(schema))
        this.registry.validate()

        // this.registry.registry.values().forEach(kind => {
        //     const classKindKind = KindUtils.resolveKind(kind)
        //     const filename = tsHelper.name.ts.file(classKindKind)
        //     const tsClassName = tsHelper.name.ts.class(classKindKind)
        //     const file = this.tsProject.getFile(filename)
        //     const klass = file.getClass(tsClassName)
        //     console.log(`class: ${klass.name}`)
        // })

        // this.registry.registry.values().forEach(kind => this.processTopLevelKinds(kind))

        console.log()
        const typescriptTranslater = new KindToTypescriptTransator(this.registry)
        console.log(typescriptTranslater.emit())

        // const sqlGenerator = new SqlGenerator()
        // const sqlDdlTranslator = new KindToSqlDdlTranslator(this.registry, sqlGenerator)
        // console.log(sqlDdlTranslator.emit())

        // const sqlQueryTranslator = new KindToSqlQueryTranslator(this.registry, sqlGenerator)
        // console.log(sqlQueryTranslator.emit())
    }

    processProject() {
        this.processKinds(this.project.kinds)
        this.tsProject.saveSync()
    }
}
