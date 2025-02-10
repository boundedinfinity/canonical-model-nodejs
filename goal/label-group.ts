import { Label } from './label'
import { type StringQuery } from './helper'
import { type LabelQuery } from './label'

export class LabelGroup {
    kind = this.constructor.name.toLocaleLowerCase()
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
}

export type LabeLGroupSerializerOptions = {
    labelIds: boolean
}

export class LabeLGroupSerializer {
    options: LabeLGroupSerializerOptions = {
        labelIds: true
    }

    constructor(options?: LabeLGroupSerializerOptions) {
        this.options = { ...this.options, ...options }
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
    label: LabelQuery
    load?: LabelGroupLoadOptions
}

export interface LabelGroupStore {
    findMany(query: LabelGroupQuery): LabelGroup[]
    findOne(query: LabelGroupQuery): LabelGroup | undefined
    save(labelGrouop: LabelGroup): void
    load(labelGroup: LabelGroup, options: LabelGroupLoadOptions): void
}

export class MemoryLabelGroupStore implements LabelGroupStore {
    private labelGroups: LabelGroup[] = []
    options: LabeGroupStoreOptions = {}

    constructor(options?: LabeGroupStoreOptions) {
        this.options = { ...this.options, ...options }
    }

    findMany(query: LabelGroupQuery): LabelGroup[] {
        const found: LabelGroup[] = []

        this.labelGroups.forEach(v => {
            if (query.id == v.id) found.push(v)
        })

        return found
    }

    findOne(query: LabelGroupQuery): LabelGroup | undefined {
        const found = this.findMany(query)
        return found.length > 0 ? found[0] : undefined
    }

    save(labelGroup: LabelGroup): void {
        let found = this.findOne
    }

    load(abelGroup: LabelGroup, options: LabelGroupLoadOptions): void {
    }
}
