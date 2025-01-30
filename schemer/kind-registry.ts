import type { KindSchema } from './schema'
import { schemaUtils } from './schema'

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
            const typ = schemaUtils.getKindKind(current)
            const name = schemaUtils.getKindName(current)

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
                name = schemaUtils.getKindName(nameOrKind)

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
            name = schemaUtils.getKindName(nameOrKind)

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
}
