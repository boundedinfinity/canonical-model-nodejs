import { relations } from 'drizzle-orm';
import { uuid_pk } from './helper'
import { integer, index, text, sqliteTable } from "drizzle-orm/sqlite-core";
import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod'

interface pn {
    prefixes: { type: string, name: string }[]
    firsts: string[]
    middles: string[]
    lasts: string[]
    suffixes: { type: string, name: string }[]

}

export enum PersonalNameOrder {
    Western = 'western',
    Eastern = 'eastern'
}

const vs = Object.keys(PersonalNameOrder).map(k => k.toString())

export const person_names_table = sqliteTable('person_names', {
    id: uuid_pk(),
    order: text('order').$type<PersonalNameOrder>().default(PersonalNameOrder.Western).notNull()
})

function createTable(name: string) {
    return sqliteTable(`person_names_${name}`, {
        personNamesId: text('person_names_id').references(() => person_names_table.id),
        name: text('name'),
        index: integer('index'),
    }, (table) => [
        index(`person_names_${name}_idx`).on(table.name),
    ])
}

function createRelation(table: any) {
    return relations(table, ({ one }) => ({
        firstName: one(person_names_table, {
            fields: [table.personNamesId],
            references: [person_names_table.id],
        }),
    }));
}

export const person_names_first_table = createTable("first")
export const person_names_first_relations = createRelation(person_names_first_table)

export const person_names_middle_table = createTable('middle');
export const person_names_middle_relations = createRelation(person_names_middle_table)

export const person_names_last_table = createTable("last");
export const person_names_last_relations = createRelation(person_names_last_table)

export enum PersonalNameHonorificType {
    Unkown = 'unkown',
    Common = "common",
    Formal = "formal",
    Nobility = 'nobility',
    Royalty = 'royalty',
    Military = 'military',
    Academic = "academic",
    Professional = "professional",
    Religious = 'religious'
}

function createNfixTable(name: string) {
    const table = sqliteTable(`person_names_${name}es`, {
        id: uuid_pk(),
        name: text("name"),
        type: text("type").default(PersonalNameHonorificType.Common),
        description: text('description'),
    }, (table) => [
        index(`person_names_${name}es_idx`).on(table.name)
    ])

    const alias = sqliteTable(`person_names_${name}es_aliases`, {
        id: text(`${name}_id`),
        name: text("name"),
        index: integer('index')
    }, (table) => [
        index(`person_names_${name}es_aliases_idx`).on(table.name)
    ])

    const rel = relations(alias, ({ one }) => ({
        [`${name}es`]: one(table, {
            fields: [alias.id],
            references: [table.id],
        }),
    }))

    return [table, alias, rel]
}

export const [person_names_prefixes_tabel, person_names_prefixes_aliases_tabel, person_name_prefix_alias_to_person_name_prefix] = createNfixTable('prefix')
export const [person_names_suffixes_tabel, person_names_suffixes_aliases_tabel, person_name_suffix_alias_to_person_name_suffix] = createNfixTable('suffix')

export const person_names_schema = createSelectSchema(person_names_table, {

})

export type PersonName = z.infer<typeof person_names_schema>;
