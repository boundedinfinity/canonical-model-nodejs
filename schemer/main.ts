import type { ProjectSchema, KindSchema } from './schema'
import { Generator } from './generator'

const testThing: KindSchema = {
    kind: 'object',
    name: 'Test Thing',
    properties: [
        { kind: 'string', name: 'Test String Required', min: 1, max: 2 },
        { kind: 'string', name: 'Test String Optional', optional: true, min: 1, max: 2 },
        { kind: 'int', name: 'Test Int Required', min: 1, max: 2, },
        { kind: 'int', name: 'Test Int Optional', optional: true, min: 1, max: 2, },
        { kind: 'float', name: 'Test Float Required', min: 1, max: 2, },
        { kind: 'float', name: 'Test Float Optional', optional: true, min: 1, max: 2, },
        { kind: 'bool', name: 'Test Boolean Required', },
        { kind: 'bool', name: 'Test Boolean Optional', optional: true },

        { kind: 'array', name: 'Test String Array Required', items: { kind: 'string', min: 1, max: 2 } },
        { kind: 'array', name: 'Test String Array Optional', optional: true, items: { kind: 'string', min: 1, max: 2 } },
        { kind: 'array', name: 'Test Int Array Required', items: { kind: 'int', min: 1, max: 2 } },
        { kind: 'array', name: 'Test Int Array Optional', optional: true, items: { kind: 'int', min: 1, max: 2 } },
        { kind: 'array', name: 'Test Float Array Required', items: { kind: 'float', min: 1, max: 2 } },
        { kind: 'array', name: 'Test Float Array Optional', optional: true, items: { kind: 'float', min: 1, max: 2 } },
        { kind: 'array', name: 'Test Boolean Array Required', items: { kind: 'bool' } },
        { kind: 'array', name: 'Test Boolean Array Optional', optional: true, items: { kind: 'bool' } },
    ]
}

const label: KindSchema = {
    kind: 'object',
    name: 'Label',
    properties: [
        { kind: 'string', name: 'Name', min: 2, max: 100 },
        { kind: 'string', name: 'Description', max: 500, optional: true },
    ]
}

const labelGroup: KindSchema = {
    kind: 'object',
    name: 'Label Group',
    properties: [
        { kind: 'string', name: 'Name', max: 100 },
        { kind: 'string', name: 'Description', max: 500, optional: true, },
        { kind: 'array', name: 'Label', items: { kind: 'ref', ref: label }, optional: true }
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
        { kind: 'array', items: { kind: 'ref', name: 'prefixes', ref: personNamePrefix } },
        { kind: 'array', name: 'firsts', items: personNameFragment },
        { kind: 'array', name: 'middles', items: personNameFragment },
        { kind: 'array', name: 'lasts', items: personNameFragment },
        { kind: 'array', items: { kind: 'ref', name: 'suffixes', ref: personNameSuffix } },
        { kind: 'ref', ref: personNameOrder, name: 'order' },
    ]
}

const project: ProjectSchema = {
    kinds: [
        testThing,
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
