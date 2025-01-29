// https://zod.dev/
// https://www.prisma.io/docs/orm/prisma-schema/data-model/relations
// https://orm.drizzle.team/docs/relations
// https://www.totaltypescript.com/concepts/the-prettify-helper

import utils from './utils'

// https://mvasilkov.animuchan.net/typescript-positive-integer-type
type PositiveInteger<T extends number> = `${T}` extends '0' | `-${any}` | `${any}.${any}` ? never : T
type Prettify<T> = { [K in keyof T]: T[K]; } & {};

export const schemaUtils = {
    hasValidation: (kind: KindSchema): boolean => {
        switch (kind.kind) {
            case 'object':
                return utils.type.isDefined(kind.optional)
            case 'string':
                return utils.type.isDefined(kind.optional)
                    || utils.type.isDefined(kind.min)
                    || utils.type.isDefined(kind.max)
                    || utils.type.isDefined(kind.pattern)
                    || utils.type.isDefined(kind.includes)
                    || utils.type.isDefined(kind.excludes)
                    || utils.type.isDefined(kind.startsWith)
                    || utils.type.isDefined(kind.endsWith)
                    || utils.type.isDefined(kind.trimmed)
            case 'bool':
                break
            case 'float':
            case 'int':
                return utils.type.isDefined(kind.optional)
                    || utils.type.isDefined(kind.min)
                    || utils.type.isDefined(kind.max)
                    || utils.type.isDefined(kind.includes)
                    || utils.type.isDefined(kind.excludes)
                    || utils.type.isDefined(kind.multipleOf)
                break
            case 'enum':
                return utils.type.isDefined(kind.optional)
            case 'array':
                return utils.type.isDefined(kind.optional)
                    || utils.type.isDefined(kind.min)
                    || utils.type.isDefined(kind.max)
                    || utils.type.isDefined(kind.sorted)
                    || utils.type.isDefined(kind.ordered)
                    || schemaUtils.hasValidation(kind.items)
            case 'ref':
                return utils.type.isDefined(kind.optional)
                    || schemaUtils.hasValidation(kind.ref)
        }

        return false
    },
    getKindName: (kind: KindSchema): string => {
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
                name = kind.name || schemaUtils.getKindName(kind.items)
                break
            case 'ref':
                name = kind.name || schemaUtils.getKindName(kind.ref)
                break
        }

        if (!name) {
            throw new Error(`getKindName: ${kind.kind} must have a name`)
        }

        return name!
    },
    getKindKind: (kind: KindSchema): string => {
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
                name = schemaUtils.getKindKind(kind.ref)
                break
            case 'array':
                name = schemaUtils.getKindKind(kind.items)
                break
            case 'enum':
                // TODO
                name = 'enum'
                break
            case 'object':
                name = kind.name
                break
        }

        if (!name) {
            throw new Error(`getKindKind: ${kind.kind} must have a name`)
        }

        return name!
    },
}

type SharedSchema = {
    name?: string
    description?: string
    version?: string
    persist?: {
        name?: string
    }
    serialize?: {
        name?: string
    }
    optional?: boolean
}

export type StringSchema = {
    kind: "string"
    min?: PositiveInteger<number>
    max?: PositiveInteger<number>
    pattern?: string
    includes?: string
    excludes?: string
    startsWith?: string
    endsWith?: string
    trimmed?: boolean
    default?: string
}

export type IntSchema = {
    kind: "int"
    min?: number
    max?: number
    includes?: number[]
    excludes?: number[]
    multipleOf?: PositiveInteger<number>
    default?: number
}

export type FloatSchema = {
    kind: "float"
    min?: number
    max?: number
    includes?: number[]
    excludes?: number[]
    multipleOf?: PositiveInteger<number>
    default?: number
}

export type EnumMember = {
    name: string
    description?: string,
    default?: boolean
}

export type EnumSchema = {
    kind: 'enum',
    members: EnumMember[],
    unkown?: boolean | {
        name?: boolean,
        default?: boolean
    }
}

export type BoolSchema = {
    kind: 'bool'
    default?: boolean
}

export type RefSchema = {
    kind: 'ref',
    ref: KindSchema
}


export type ArraySchema = {
    kind: "array"
    min?: PositiveInteger<number>
    max?: PositiveInteger<number>
    sorted?: boolean
    ordered?: boolean
    items: KindSchema
}

export type ObjectSchema = {
    kind: 'object'
    properties: KindSchema[]
}

export type KindSchema =
    (ObjectSchema | ArraySchema | StringSchema | IntSchema | FloatSchema | BoolSchema | RefSchema | EnumSchema) & SharedSchema


export type RelationshipSchema = {
    kind: "one-to-one"
    a: (KindSchema & { owner?: boolean })
    b: (KindSchema & { owner?: boolean })
} | {
    kind: | "one-to-many"
    one: KindSchema
    many: KindSchema
    owns?: boolean
} | {
    kind: "many-to-many"
    a: KindSchema
    b: KindSchema
}

export type OperationSchema = {
    name: string
    inputs?: KindSchema[]
    outputs?: KindSchema[]
}

export type ProjectOptions = {
    generation?: {
        kinds?: boolean
        operations?: boolean
        persistance?: boolean
    }
}

export type ProjectSchema = {
    options?: ProjectOptions
    kinds?: KindSchema[]
    relationships?: RelationshipSchema[]
    operations?: OperationSchema[]
}

export class SchemaBuilder {
    project: ProjectSchema = {}

    private s<T extends KindSchema>(s: T): T {
        if (!this.project.kinds) this.project.kinds = []
        this.project.kinds.push(s)
        return s
    }

    string(name: string): StringSchema { return this.s({ kind: 'string', name }) }
    int(name: string): IntSchema { return this.s({ kind: 'int', name }) }
    // enum(name: string, ...values: EnumMember[]): EnumSchema { return this.s({ kind: 'enum', name, values }) }
    bool(name: string): BoolSchema { return this.s({ kind: 'bool', name }) }
    array(name: string, items: KindSchema): ArraySchema { return this.s({ kind: 'array', name, items }) }

    getType(name: string): KindSchema | undefined { return this.project?.kinds?.find((s => s.name == name)) }

    getRef(nameOrSchema: string | KindSchema): RefSchema | undefined {
        return undefined
    }
}

