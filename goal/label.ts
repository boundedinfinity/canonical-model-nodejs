import { relations } from 'drizzle-orm';
import { index, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { uuid_pk, type StringQuery, queryUtils } from './helper'

export class Label {
    kind = this.constructor.name.toLocaleLowerCase()
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
            kind: this.kind,
            id: this.id,
            name: this.name,
            description: this.description
        }
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
        return this.labels.filter(label => {
            return queryUtils.query.string.found({ value: label.id, query: query.id })
                || queryUtils.query.string.found({ value: label.name, query: query.name })
                || queryUtils.query.string.found({ value: label.description, query: query.description })
        })
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

    save(label: Label): void {
        const existing = this.findOne({ id: label.id })
        if (existing) {
            Object.assign(existing, label)
        } else {
            this.labels.push(label)
        }
    }
}
