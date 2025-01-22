import { relations } from 'drizzle-orm';
import { index, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { uuid_pk } from './helper'

export const labels_table = sqliteTable('labels', {
    id: uuid_pk(),
    name: text('name').notNull(),
    description: text('description'),
}, (table) => [
    index('labels_name_idx').on(table.name)
])

export const label_groups_table = sqliteTable('label_groups', {
    id: uuid_pk(),
    name: text('name').notNull(),
    description: text('description'),
}, (table) => [
    index('label_groups_name_idx').on(table.name)
])

export const labels__label_groups_table = sqliteTable('labels__label_groups', {
    labelId: text('label_id').notNull().references(() => labels_table.id),
    labelGroupId: text('label_group_id').notNull().references(() => label_groups_table.id),
})

export const labels_to_label_groups_relations = relations(labels__label_groups_table, ({ one }) => ({
    label: one(labels_table, {
        fields: [labels__label_groups_table.labelId],
        references: [labels_table.id],
    }),
    labelGroups: one(label_groups_table, {
        fields: [labels__label_groups_table.labelGroupId],
        references: [label_groups_table.id],
    })
}))

type StringSearchTerm = string | {
    term?: string,
    caseSensitive?: boolean,
    includes?: string | string[],
    excludes?: string | string[],
}

type NumberSearchTerm<T extends number> = T | {
    includes?: T | T[] | { gt?: T, lt?: T, gte?: T, lte?: T, positive?: boolean, negative?: boolean }[],
    excludes?: T | T[] | { gt?: T, lt?: T, gte?: T, lte?: T, positive?: boolean, negative?: boolean }[],
}


interface LabelSearchQuery {
    id?: string
    name?: StringSearchTerm,
    description: StringSearchTerm
    labels?: StringSearchTerm[]
}


const x: StringSearchTerm = { excludes: 'foo' }

interface LabelGroupSearchQuery {
    exact: {
        id?: string
        name?: string
        description?: string
        labels?: string[]
    },
    includes: {
        name?: string | { term: string, caseSensitive: boolean }[]
        description?: string | { term: string, caseSensitive: boolean }[]
        labels?: string | { term: string, caseSensitive: boolean }[]
    },
    excludes: {
        name?: string | { term: string, caseSensitive: boolean }[]
        description?: string | { term: string, caseSensitive: boolean }[]
        labels?: string | { term: string, caseSensitive: boolean }[]
    }

}


type ListMutate<T> = { op: 'append' | 'prepend' | 'overwrite', values: T[] }
