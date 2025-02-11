import { relations } from 'drizzle-orm';
import { index, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { uuid_pk, type StringQuery, queryUtils } from './helper'
import { type Serializer } from './messenger'

export class Label {
    static kind = 'label'
    id?: string
    name?: string
    description?: string

    constructor(args?: {
        id?: string
        name?: string
        description?: string
    }) {
        this.id = args?.id
        this.name = args?.name
        this.description = args?.description
    }

    toJSON(): object {
        return {
            kind: Label.kind,
            id: this.id,
            name: this.name,
            description: this.description
        }
    }

    matches(query?: LabelQuery): boolean {
        if (!query) return false
        return queryUtils.query.string.found({ value: this.id, query: query.id })
            || queryUtils.query.string.found({ value: this.name, query: query.name })
            || queryUtils.query.string.found({ value: this.description, query: query.description })
    }
}

export type LabelSerializerOptions = {
    typed: boolean
    formatted: boolean | number
}

export class LabelSerializer implements Serializer<Label> {
    options: LabelSerializerOptions = {
        typed: true,
        formatted: true
    }

    constructor(options?: Partial<LabelSerializerOptions>) {
        this.options = { ...this.options, ...options }
    }

    canHandleRaw(raw: string): boolean {
        const obj = JSON.parse(raw)
        return obj.kind && obj.kind === Label.kind || false
    }

    canHandleType(typ: any): boolean {
        return typ instanceof Label
    }

    serialize(label: Label): string {
        let obj: Record<string, any> = {
            id: label.id,
            name: label.name,
            description: label.description
        }

        if (this.options.typed)
            obj.kind = Label.kind

        let formatted: number | undefined

        switch (typeof this.options.formatted) {
            case "number":
                formatted = this.options.formatted
                break
            case "boolean":
                formatted = 4
                break
        }

        return JSON.stringify(obj, null, formatted)
    }

    deserialize(raw: string): Label {
        const obj = JSON.parse(raw)
        const inst = new Label()
        Object.assign(inst, obj)
        return inst
    }
}

export type LabelQuery = {
    id?: string
    name?: StringQuery,
    description?: StringQuery,
}

export type LabeGroupStoreOptions = {

}

export interface LabelStore {
    findMany(query: LabelQuery): Label[]
    findOne(query: LabelQuery): Label | undefined
    save(label: Label): void
}

export class MemoryLabelStore implements LabelStore {
    labels: Label[] = []
    options: LabeGroupStoreOptions = {}

    constructor(options?: LabeGroupStoreOptions) {
        this.options = { ...this.options, ...options }
    }

    findMany(query: LabelQuery): Label[] {
        return this.labels.filter(label => label.matches(query))
    }

    findOne(query: LabelQuery): Label | undefined {
        const found = this.findMany(query)
        switch (found.length) {
            case 0:
                return undefined
            case 1:
                return found[0]
            default:
                throw new Error('found more than one label')
        }
    }

    save(...labels: Label[]): void {
        labels.forEach(label => {
            const existing = this.findOne({ id: label.id })
            if (existing) {
                Object.assign(existing, label)
            } else {
                this.labels.push(label)
            }
        })
    }
}
