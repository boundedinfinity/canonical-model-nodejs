import type { ProjectSchema, KindSchema } from './kind'
import { Generator } from './generator'

const stringArgs = { min: 1, max: 2, startsWith: 'a', endsWith: 'z', pattern: '.*', includes: 'b', excludes: 'y', trimmed: true }
const numberArgs = { min: 1, max: 100, includes: [5], excludes: [99], multipleOf: 5 }

const testThing: KindSchema = {
    kind: 'object',
    name: 'Test Thing',
    properties: [
        // { kind: 'string', name: 'Test String Required', ...stringArgs },
        // { kind: 'string', name: 'Test String Optional', ...stringArgs, optional: true },
        // { kind: 'int', name: 'Test Int Required', ...numberArgs },
        // { kind: 'int', name: 'Test Int Optional', ...numberArgs, optional: true, },
        // { kind: 'float', name: 'Test Float Required', ...numberArgs },
        // { kind: 'float', name: 'Test Float Optional', ...numberArgs, optional: true, },
        // { kind: 'bool', name: 'Test Boolean Required', },
        // { kind: 'bool', name: 'Test Boolean Optional', optional: true },

        { kind: 'array', name: 'Test String Array Required', items: { kind: 'string', ...stringArgs } },
        // { kind: 'array', name: 'Test String Array Optional', items: { kind: 'string', ...stringArgs }, optional: true },
        // { kind: 'array', name: 'Test Int Array Required', items: { kind: 'int', ...numberArgs } },
        // { kind: 'array', name: 'Test Int Array Optional', items: { kind: 'int', ...numberArgs }, optional: true },
        // { kind: 'array', name: 'Test Float Array Required', items: { kind: 'float', ...numberArgs } },
        // { kind: 'array', name: 'Test Float Array Optional', items: { kind: 'float', ...numberArgs }, optional: true },
        // { kind: 'array', name: 'Test Boolean Array Required', items: { kind: 'bool' } },
        // { kind: 'array', name: 'Test Boolean Array Optional', items: { kind: 'bool' }, optional: true },
    ]
}

const label: KindSchema = {
    kind: 'object',
    name: 'Label',
    properties: [
        { kind: 'string', name: 'Name', min: 2, max: 100, searchable: true },
        { kind: 'string', name: 'Description', max: 500, optional: true },
    ]
}

const labelGroup: KindSchema = {
    kind: 'object',
    name: 'Label Group',
    properties: [
        { kind: 'string', name: 'Name', min: 2, max: 100, searchable: true },
        { kind: 'string', name: 'Description', max: 500, optional: true, },
        { kind: 'array', name: 'Labels', items: { kind: 'ref', ref: label }, optional: true }
    ]
}

const personNameFragment: KindSchema = { kind: 'string', min: 1, max: 255 }

const personNameHonorificType: KindSchema = {
    kind: 'enum',
    name: 'Person Name Honorific',
    members: [
        { name: 'Common' },
        { name: 'Formal' },
        { name: 'Nobility' },
        { name: 'Royalty' },
        { name: 'Military' },
        { name: 'Academic' },
        { name: 'Professional' },
        { name: 'Religious' },
    ],
    unkown: { default: true }
}

const personNameFixFragment: KindSchema = {
    kind: 'object',
    properties: [
        { kind: 'string', name: 'name', min: 2, max: 20 },
        // { ...personNameHonorificType, name: 'type' },
    ]
}

const personNamePrefix: KindSchema = { ...personNameFixFragment, name: 'Person Name Prefix' }
const personNameSuffix: KindSchema = { ...personNameFixFragment, name: 'Person Name Prefix' }

const personNameOrder: KindSchema = {
    kind: 'enum',
    name: 'Person Name Order',
    members: [
        { name: 'Western' },
        { name: 'Eastern' },
    ],
    unkown: { default: true }
}

const personName: KindSchema = {
    kind: 'object',
    name: 'Person Name',
    properties: [
        // { kind: 'array', items: { kind: 'ref', name: 'prefixes', ref: personNamePrefix } },
        { kind: 'array', name: 'firsts', items: personNameFragment, searchable: ['name'] },
        { kind: 'array', name: 'middles', items: personNameFragment, searchable: ['name'] },
        { kind: 'array', name: 'lasts', items: personNameFragment, searchable: ['name'] },
        // { kind: 'array', items: { kind: 'ref', name: 'suffixes', ref: personNameSuffix } },
        // { kind: 'ref', ref: personNameOrder, name: 'order' },
    ]
}

const project: ProjectSchema = {
    kinds: [
        // testThing,
        label,
        labelGroup,
        // personName,
        // personNameHonorificType, 
        // personNameOrder, 
        // personNamePrefix
    ],
    relationships: [
        // { type: 'one-to-many', one: labelGroup, many: label },
        // { type: 'many-to-many', a: personName, b: label }
    ]
}


try {
    console.log('====================================')
    new Generator(project).processProject()
    console.log('====================================')
} catch (e) {
    console.log(e)
}


// const labelSchema = z.object({
//     id: z.string().default(NIL_UUID),
//     name: z.string().min(2).max(100).default('-'),
//     description: z.string().max(500).optional(),
// })
