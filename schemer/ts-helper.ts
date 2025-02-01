import { KindUtils, type KindSchema } from './kind'
import utils from './utils'

// https://www.qualdesk.com/blog/2021/type-guard-for-string-union-types-typescript/
// copilot:  "create a type guard for string union types in TypeScript for the following values ..."
const TsgBuiltInTypeList = ['string', 'number', 'boolean', 'object', 'any', 'void', 'null', 'undefined'] as const;
export type TsgBuiltInType = typeof TsgBuiltInTypeList[number];

const TsgProperyModifierList = ['private', 'readonly', 'static'] as const;
export type TsgProperyModifier = typeof TsgProperyModifierList[number];

const TsgVariableModifierList = ['export', 'default', 'const', 'let', 'variadic'] as const;
export type TsgVariableModifier = typeof TsgVariableModifierList[number];

export const tsHelper = {
    defaults: {
        kindValue: (kind: KindSchema): string => {
            let value: string = 'undefined'
            switch (kind.kind) {
                case 'object':
                    value = 'null'
                    break
                case 'string':
                    value = `'-'`
                    break
                case 'bool':
                    value = 'false'
                    break
                case 'float':
                case 'int':
                    value = '0'
                    break
                case 'enum':
                    // TODO
                    break
                case 'array':
                    value = '[]'
                    break
                case 'ref':
                    return tsHelper.defaults.kindValue(kind.ref)
                    break
            }

            return value
        },
    },
    type: (kind: KindSchema): TsgBuiltInType => {
        switch (kind.kind) {
            case 'object':
                return 'object'
            case 'string':
                return 'string'
            case 'bool':
                return 'boolean'
            case 'float':
            case 'int':
                return 'number'
            case 'enum':
                // TODO
                return 'string'
            case 'array':
                return tsHelper.type(kind.items)
            case 'ref':
                return tsHelper.type(kind.ref)
        }
    },
    is: {
        builtInType: (value: string): value is TsgBuiltInType => {
            return TsgBuiltInTypeList.includes(value as TsgBuiltInType)
        },
        properyModifier: (value: string): value is TsgProperyModifier => {
            return TsgProperyModifierList.includes(value as TsgProperyModifier)
        },
        variableModifier: (value: string): value is TsgVariableModifier => {
            return TsgVariableModifierList.includes(value as TsgVariableModifier)
        },
    },
    name: {
        ts: {
            class: (input: string | KindSchema): string => utils.string.phrase2Pascal(n(input)),
            variable: (input: string | KindSchema): string => utils.string.phrase2Camel(n(input)),
            property: (input: string | KindSchema): string => utils.string.phrase2Camel(n(input)),
            file: (input: string | KindSchema): string => './' + utils.string.phrase2Kebab(n(input)) + '.ts'
        },
        zod: {
            schema: (input: string | KindSchema): string => tsHelper.name.ts.class(input) + 'Zod',
            property: (input: string | KindSchema): string => tsHelper.name.ts.property(input)
        },
    }
}

function n(input: string | KindSchema): string {
    return typeof input === 'string' ? input : KindUtils.resolveName(input)
}
