import { Label } from './label'
import { type StringQuery, queryUtils } from './helper'
import { type LabelQuery, type LabelStore } from './label'
import { type Serializer } from './messenger'

export class LabelGroup {
    static kind = 'label-group'
    id?: string
    name?: string
    description?: string
    labelIds?: string[]
    labels?: Label[]

    constructor(args?: {
        id?: string
        name?: string
        description?: string
        labelIds?: string[]
    }) {
        this.id = args?.id
        this.name = args?.name
        this.description = args?.description
        this.labelIds = args?.labelIds
    }

    toJSON(): object {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            labelIds: this.labels?.map(label => label.id)
        }
    }

    matches(query?: LabelGroupQuery): boolean {
        if (!query) return false
        return queryUtils.query.string.found({ value: this.id, query: query.id })
            || queryUtils.query.string.found({ value: this.name, query: query.name })
            || queryUtils.query.string.found({ value: this.description, query: query.description })
            || this.labels?.some(label => label.matches(query.label))
            || false
    }
}

export type LabeLGroupSerializerOptions = {
    typed: boolean
    formatted: boolean | number
    labelIds: boolean
}

export class LabelGroupSerializer implements Serializer<LabelGroup> {
    options: LabeLGroupSerializerOptions = {
        typed: true,
        formatted: true,
        labelIds: true
    }

    constructor(options?: Partial<LabeLGroupSerializerOptions>) {
        this.options = { ...this.options, ...options }
    }

    canHandleRaw(raw: string): boolean {
        const obj = JSON.parse(raw)
        return obj.kind && obj.kind === LabelGroup.kind || false
    }

    canHandleType(typ: any): boolean {
        return typ instanceof LabelGroup
    }

    serialize(labelGroup: LabelGroup): string {
        let obj: Record<string, any> = {
            id: labelGroup.id,
            name: labelGroup.name,
            description: labelGroup.description,
            labels: labelGroup.labels?.map(label => label.id)
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

    deserialize(raw: string): LabelGroup {
        const obj = JSON.parse(raw)

        obj['labelIds'] = obj['labels']
        delete obj['labels']

        const inst = new LabelGroup()
        Object.assign(inst, obj)
        return inst
    }
}

export type LabeGroupStoreOptions = {
    load?: LabelGroupLoadOptions
}

export type LabelGroupLoadOptions = {
    labels?: boolean
}

export type LabelGroupQuery = {
    id?: string
    name?: StringQuery
    description?: StringQuery
    label?: LabelQuery
    load?: LabelGroupLoadOptions
}

export interface LabelGroupStore {
    findMany(query: LabelGroupQuery): LabelGroup[]
    findOne(query: LabelGroupQuery): LabelGroup | undefined
    save(labelGrouop: LabelGroup): void
    load(labelGroup: LabelGroup, options: LabelGroupLoadOptions): void
}

export class MemoryLabelGroupStore implements LabelGroupStore {
    private labelStore: LabelStore
    private labelGroups: LabelGroup[] = []
    options: LabeGroupStoreOptions = {}

    constructor(labelStore: LabelStore, options?: LabeGroupStoreOptions) {
        this.labelStore = labelStore
        this.options = { ...this.options, ...options }
    }

    findMany(query: LabelGroupQuery): LabelGroup[] {
        return this.labelGroups
            .filter(labelGroup => labelGroup.matches(query))
            .map(labelGroup => {
                if (query.load) this.load(labelGroup, query.load)
                return labelGroup
            })
    }

    findOne(query: LabelGroupQuery): LabelGroup | undefined {
        const found = this.findMany(query)
        switch (found.length) {
            case 0:
                return undefined
            case 1:
                return found[0]
            default:
                throw new Error('found more than one label group')
        }
    }

    save(...labelGroups: LabelGroup[]): void {
        labelGroups.forEach(labelGroup => {
            const existing = this.findOne({ id: labelGroup.id })
            if (existing) {
                Object.assign(existing, labelGroup)
            } else {
                this.labelGroups.push(labelGroup)
            }
        })
    }

    load(labelGroup: LabelGroup, options: LabelGroupLoadOptions): void {
        const found = this.findOne({ id: labelGroup.id })
        if (found) {
            if (options.labels) {
                if (!found.labels) found.labels = []

                found.labelIds?.forEach(id => {
                    found.labels?.push(...this.labelStore.findMany({ id }));
                })
            }
        }
    }
}
