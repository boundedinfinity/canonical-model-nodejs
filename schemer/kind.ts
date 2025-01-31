// https://zod.dev/
// https://www.prisma.io/docs/orm/prisma-schema/data-model/relations
// https://orm.drizzle.team/docs/relations
// https://www.totaltypescript.com/concepts/the-prettify-helper

import utils from './utils'

export type KindRegistryOptions = {
    failOnDuplicate?: boolean
}

export class KindRegistry {
    registry = new Map<string, KindSchema>()
    options: KindRegistryOptions = {}

    constructor(options?: KindRegistryOptions) {
        this.options = { ...this.options, ...options }
    }

    register(...kinds: KindSchema[]): void {
        const register = (current: KindSchema) => {
            const typ = KindUtils.getKindKind(current)
            const name = KindUtils.getKindName(current)

            if (!this.registry.has(name)) {
                console.log(`registering ${name}`)
                this.registry.set(name, current)
            } else {
                if (this.options.failOnDuplicate) {
                    throw new Error(`duplicate kind: ${name}`)
                } else {
                    console.log(`already registered ${name}`)
                }
            }
        }

        kinds.forEach(kind => register(kind))
    }

    private check(nameOrKind: string | KindSchema): void {
        const found = this.isRegistered(nameOrKind)
        if (!found) {
            let name: string
            if (typeof nameOrKind === 'string')
                name = nameOrKind
            else
                name = KindUtils.getKindName(nameOrKind)

            throw new Error(`kind not found: ${name}`)
        }
    }

    validate() {
        const validate = (kind: KindSchema, parent?: KindSchema) => {
            switch (kind.kind) {
                case 'object':
                    this.check(kind)
                    kind.properties.forEach(property => validate(property, kind))
                    break
                case 'array':
                    validate(kind.items, parent)
                    break
                case 'ref':
                    validate(kind.ref, parent)
                    break
                case 'enum':
                case 'bool':
                case 'int':
                case 'string':
                    break
            }
        }

        this.registry.values().forEach(kind => validate(kind))
    }

    isRegistered(nameOrKind: string | KindSchema): boolean {
        let name: string
        if (typeof nameOrKind === 'string')
            name = nameOrKind
        else
            name = KindUtils.getKindName(nameOrKind)

        return this.registry.has(name)
    }

    get(name: string): KindSchema | undefined {
        return this.registry.get(name)
    }

    getOrThrow(name: string): KindSchema {
        const kind = this.get(name)
        if (!kind) {
            throw new Error(`Kind not found: ${name}`)
        }
        return kind
    }

    isPrimitive(kind: KindSchema): boolean {
        const resolved = KindUtils.getKindKind(kind)
        return KindUtils.isPrimitive(resolved)
    }
}


// https://mvasilkov.animuchan.net/typescript-positive-integer-type
type PositiveInteger<T extends number> = `${T}` extends '0' | `-${any}` | `${any}.${any}` ? never : T
type Prettify<T> = { [K in keyof T]: T[K]; } & {};

export const KindUtils = {
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
                    || KindUtils.hasValidation(kind.items)
            case 'ref':
                return utils.type.isDefined(kind.optional)
                    || KindUtils.hasValidation(kind.ref)
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
                name = kind.name || KindUtils.getKindName(kind.items)
                break
            case 'ref':
                name = kind.name || KindUtils.getKindName(kind.ref)
                break
        }

        if (!name) {
            throw new Error(`getKindName: ${kind.kind} must have a name: ${JSON.stringify(kind)}`)
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
                name = KindUtils.getKindKind(kind.ref)
                break
            case 'array':
                name = KindUtils.getKindKind(kind.items)
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
            throw new Error(`getKindKind: ${kind.kind} must have a name: ${JSON.stringify(kind)}`)
        }

        return name!
    },

    isPrimitive: (value: string): value is KindType => {
        return KindTypeList.includes(value as KindType)
    },
}

const KindTypeList = ['string', 'int', 'float', 'bool'] as const;
type KindType = typeof KindTypeList[number];

type SharedSchema = {
    name?: string
    description?: string
    version?: string
    searchable?: boolean
    persist?: {
        name?: string
        indexed?: boolean
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



