// https://www.fullstory.com/blog/discriminated-unions-and-exhaustiveness-checking-in-typescript/

// import { ClassDeclaration, Project, ScriptTarget, SourceFile, StructureKind, VariableDeclarationKind, VariableStatement, VariableDeclarationList, } from 'ts-morph'
// import type { EnumMemberStructure, ImportDeclarationStructure, OptionalKind, PropertyDeclarationStructure, VariableDeclarationStructure } from 'ts-morph'
import npath from 'node:path'
import type { EnumMember, ObjectSchema, ProjectSchema, KindSchema } from './schema'
import { stat } from 'node:fs'
import { TypeScriptLanguageGenerator } from './ts-generator'


interface ImportDeclaration {
    moduleSpecifier: string
    namedImports: (string | {
        name: string;
        isTypeOnly?: boolean;
        alias?: string;
    })[]
}

const utils = {
    names: {
        normal(s: string): string {
            return s.trim().replace(/  +/g, ' ')
        },
        upperFirst(s: string): string {
            return String(s).charAt(0).toLocaleUpperCase() + String(s).slice(1);
        },
        lowerFirst(s: string): string {
            return String(s).charAt(0).toLocaleLowerCase() + String(s).slice(1);
        },
        phrase2Pascal(s: string): string {
            return utils.names.normal(s).split(" ").map(c => utils.names.upperFirst(c)).join("")
        },
        phrase2Camel(s: string): string {
            const words = utils.names.normal(s).split(" ")
            return utils.names.lowerFirst(words[0]) + utils.names.phrase2Pascal(words.splice(1).join(" "))
        },
        phrase2Snake(s: string): string {
            return utils.names.normal(s).toLocaleLowerCase().replaceAll(" ", "_")
        },
        phrase2SnakeUpper(s: string): string {
            return utils.names.normal(s).toLocaleUpperCase().replaceAll(" ", "_")
        },
        phrase2Kebab(s: string): string {
            return utils.names.normal(s).toLocaleLowerCase().replaceAll(" ", "-")
        },
        phrase2KebabUpper(s: string): string {
            return utils.names.normal(s).toLocaleUpperCase().replaceAll(" ", "-")
        }
    }
}

export class Generator {
    private registry = new Map<string, KindSchema>
    private tsProject = new Project({
        compilerOptions: { target: ScriptTarget.ESNext },
        libFolderPath: '$lib',
    })
    private project: ProjectSchema
    private importMap: Map<string, ImportDeclaration> = new Map()
    private rootDir = npath.join(import.meta.url, "..")

    constructor(project: ProjectSchema) {
        this.project = project

        this.registerImportDecl({
            moduleSpecifier: 'uuid',
            namedImports: [{ name: 'v4', alias: 'uuid' }, { name: 'NIL', alias: 'NIL_UUID' }]
        })

        this.registerImportDecl({
            moduleSpecifier: "drizzle-orm/sqlite-core",
            namedImports: ["int", "text", "sqliteTable"]
        })

        this.registerImportDecl({ moduleSpecifier: "zod", namedImports: ["z"] })
    }

    private ensureRegister(kind: KindSchema) {
        const typ = this.getKindKind(kind)
        const name = this.getKindName(kind)

        if (!this.registry.has(name)) {
            this.registry.set(name, kind)
        }

        const decl: ImportDeclaration = {
            moduleSpecifier: this.convertName('ts-module-specifier', kind),
            namedImports: [
                this.convertName('ts-class', kind),
                this.convertName('zod-schema', kind),
            ]
        }

        if (!this.importMap.has(typ)) {
            this.importMap.set(typ, decl)
        }
    }

    private convertName = (
        typ: 'ts-class' | 'ts-property' | 'file' | 'ts-module-specifier' | 'zod-schema' | 'zod-property',
        schema: KindSchema
    ): string => {
        let name: string = this.getKindName(schema)

        switch (typ) {
            case 'ts-class':
                name = utils.names.phrase2Pascal(name)
                break
            case 'ts-property':
                name = utils.names.phrase2Camel(name)
                if (schema.optional)
                    name = name + '?'
                break
            case 'zod-schema':
                name = utils.names.phrase2Pascal(name) + 'Zod'
                break
            case 'zod-property':
                name = utils.names.phrase2Camel(name)
                break
            case 'file':
                name = utils.names.phrase2Kebab(name)
                name += '.ts'
                break
            case 'ts-module-specifier':
                name = './' + utils.names.phrase2Kebab(name)
                break
            default:
                throw new Error(`unknown type ${typ}`)
        }

        return name
    }

    private getKindName(kind: KindSchema): string {
        let name: string | undefined

        switch (kind.kind) {
            case 'bool':
            case 'enum':
            case 'float':
            case 'int':
            case 'string':
            case 'object':
                name = kind.name
                break
            case 'array':
                name = kind.name || this.getKindName(kind.items)
                break
            case 'ref':
                name = kind.name || this.getKindName(kind.ref)
                break
        }

        if (!name) {
            throw new Error(`getKindName: ${kind.kind} must have a name`)
        }

        return name!
    }

    private getKindKind(kind: KindSchema): string {
        let name: string | undefined

        switch (kind.kind) {
            case 'bool':
                name = 'boolean'
                break
            case 'float':
            case 'int':
                name = 'number'
                break
            case 'string':
                name = 'string'
                break
            case 'ref':
                name = this.getKindKind(kind.ref)
                break
            case 'array':
                name = this.getKindKind(kind.items) + '[]'
                break
            case 'enum':
                break
            case 'object':
                if (kind.name)
                    name = utils.names.phrase2Pascal(kind.name)
                break
        }

        if (!name) {
            throw new Error(`getKindKind: ${kind.kind} must have a name`)
        }

        return name!
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
                console.log(`processKinds0: skipping ${this.getKindName(schema)}`)
                break
        }
    }

    private validateKindReferences(schema: KindSchema, parent?: KindSchema) {
        const check = (schema: KindSchema) => {
            const name = this.getKindName(schema)
            if (!this.registry.has(name)) {
                throw new Error(`reference kind ${name} not found`)
            }
        }

        switch (schema.kind) {
            case 'object':
                check(schema)
                schema.properties.forEach(property => this.validateKindReferences(property, schema))
                break
            case 'array':
                this.validateKindReferences(schema.items, parent)
                break
            case 'ref':
                this.validateKindReferences(schema.ref, parent)
                break
            case 'enum':
            case 'bool':
            case 'int':
            case 'string':
                break
        }
    }

    private addImport = (sourceFile: SourceFile, decl: string | ImportDeclaration | KindSchema) => {
        let found1: ImportDeclaration | undefined

        if (typeof decl == 'string') {
            found1 = this.importMap.get(decl)!
        } else if ('kind' in decl) {
            const typ = this.getKindKind(decl)
            found1 = this.importMap.get(typ)
        } else {
            found1 = decl
        }

        if (!found1) return

        let found2 = sourceFile.getImportDeclaration((d) => d.getModuleSpecifierValue() == found1.moduleSpecifier)
        if (!found2) {
            found2 = sourceFile.addImportDeclaration(found1)
        }

        found1.namedImports.forEach(namedDecl => {
            let name = typeof namedDecl == 'string' ? namedDecl : namedDecl.name
            if (!found2.getNamedImports().find(n => n.getName() == name)) {
                found2.addNamedImport(namedDecl)
            }
        })
    }

    private registerImportDecl(decl: ImportDeclaration) {
        decl.namedImports.forEach(namedDecl => {
            const name = `${decl.moduleSpecifier}/${typeof namedDecl == 'string' ? namedDecl : namedDecl.name}`
            if (!this.importMap.has(name)) {
                this.importMap.set(name, decl)
            }
        })
    }

    private createGenPath(...parts: string[]): string {
        return npath.join(import.meta.dir, "gen", ...parts)
    }

    private processTopLevelKinds(schema: KindSchema) {
        let filepath = this.convertName('file', schema)
        filepath = npath.join(this.createGenPath(), filepath)
        const sourceFile = this.tsProject.createSourceFile(filepath, "", { overwrite: true })

        switch (schema.kind) {
            case 'object':
                this.processTypescriptClass(schema, sourceFile)
                this.processZodSchema(schema, sourceFile)
                // this.processDrizzleObject(schema, sourceFile)
                break
        }
    }

    private processJson(schema: KindSchema, sourceFile: SourceFile) {

    }

    // private processDrizzleObject(kind: KindSchema, sourceFile: SourceFile) {
    //     switch (kind.kind) {
    //         case 'object':
    //             kind.properties.forEach(property => this.processDrizzleObject(property, sourceFile))
    //             break
    //         case 'bool':
    //         case 'int':
    //             this.addImport(sourceFile, 'drizzle-orm/sqlite-core/int')
    //             this.addImport(sourceFile, 'drizzle-orm/sqlite-core/sqliteTable')
    //             break
    //         case 'string':
    //         case 'enum':
    //             this.addImport(sourceFile, 'drizzle-orm/sqlite-core/text')
    //             this.addImport(sourceFile, 'drizzle-orm/sqlite-core/sqliteTable')
    //     }
    // }

    private processTypescriptClass(kind: KindSchema, sourceFile: SourceFile, options: { classDecl?: ClassDeclaration } = {}) {
        switch (kind.kind) {
            case 'object':
                this.addImport(sourceFile, 'uuid/v4')
                this.addImport(sourceFile, 'uuid/NIL')
                const newclassDecl = sourceFile.addClass({
                    name: this.convertName('ts-class', kind),
                    isExported: true
                })
                newclassDecl.addProperty({
                    name: 'id',
                    type: 'string',
                    initializer: `NIL_UUID`
                })
                kind.properties.forEach(property => this.processTypescriptClass(
                    property, sourceFile, { classDecl: newclassDecl })
                )
                break
            case 'string':
                options?.classDecl?.addProperty({
                    name: this.convertName('ts-property', kind),
                    type: this.getKindKind(kind),
                    initializer: kind.optional ? undefined : `'-'`
                })
                break
            case 'bool':
                options?.classDecl?.addProperty({
                    name: this.convertName('ts-property', kind),
                    type: this.getKindKind(kind),
                    initializer: kind.optional ? undefined : `false`
                })
                break
            case 'float':
            case 'int':
                options?.classDecl?.addProperty({
                    name: this.convertName('ts-property', kind),
                    type: this.getKindKind(kind),
                    initializer: kind.optional ? undefined : `0`
                })
                break
            case 'enum':
                // name = this.createName(schema, utils.names.phrase2Pascal)
                // typ = this.getType(schema)
                break
            case 'array':
                options?.classDecl?.addProperty({
                    name: this.convertName('ts-property', kind),
                    type: this.getKindKind(kind),
                    initializer: kind.optional ? undefined : '[]'
                })
                break
            case 'ref':
                this.addImport(sourceFile, kind.ref)
                options?.classDecl?.addProperty({
                    name: this.convertName('ts-property', kind),
                    type: this.getKindKind(kind),
                    initializer: kind.optional ? undefined : 'null'
                })
                break
            default:
                // @ts-ignore
                throw new Error(`processTypescriptObject: unknown kind ${kind.kind}`)
        }
    }


    private processZodSchema(schema: KindSchema, sourceFile: SourceFile, options: { expressions?: string[], isArray?: boolean } = {}) {
        let expression: string
        switch (schema.kind) {
            case 'object':
                this.addImport(sourceFile, 'zod/z')
                this.addImport(sourceFile, 'uuid/NIL')

                const expressons: string[] = [`id: z.string().default(NIL_UUID)`]

                schema.properties.forEach(property => this.processZodSchema(property, sourceFile, { expressions: expressons }))

                const statement = sourceFile.addVariableStatement({
                    declarationKind: VariableDeclarationKind.Const,
                    isExported: true,
                    declarations: [{
                        name: this.convertName('zod-schema', schema),
                        initializer: writer => {
                            writer.write("z.object({").indent()
                            expressons.forEach(expression => { writer.writeLine(`${expression},`) })
                            writer.write("})");
                        }
                    }]
                })
                break
            case 'string':
                expression = `${this.convertName('zod-property', schema,)} : z.string()`
                if (schema.min) expression += `.min(${schema.min})`
                if (schema.max) expression += `.max(${schema.max})`
                if (schema.optional)
                    expression += `.optional()`
                else
                    expression += `.default('-')`
                options.expressions?.push(expression)
                break
            case 'float':
                expression = `${this.convertName('zod-property', schema,)} : z.number()`
                if (schema.min) expression += `.min(${schema.min})`
                if (schema.max) expression += `.max(${schema.max})`
                if (schema.optional)
                    expression += `.optional()`
                else
                    expression += `.default(0)`
                options.expressions?.push(expression)
                break
            case 'int':
                expression = `${this.convertName('zod-property', schema,)} : z.number().int()`
                if (schema.min) expression += `.min(${schema.min})`
                if (schema.max) expression += `.max(${schema.max})`
                if (schema.optional)
                    expression += `.optional()`
                else
                    expression += `.default(0)`
                options.expressions?.push(expression)
                break
            case 'bool':
                expression = `${this.convertName('zod-property', schema,)} : z.boolean()`
                if (schema.optional)
                    expression += `.optional()`
                else
                    expression += `.default(false)`
                options.expressions?.push(expression)
                break
            case 'enum':
                break
            case 'array':
                break
            case 'ref':
                break
            default:
                // @ts-ignore
                throw new Error(`processZodSchema: unknown kind ${schema.kind}`)
        }
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
