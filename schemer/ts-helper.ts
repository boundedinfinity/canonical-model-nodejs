import { KindUtils, type KindSchema } from './kind'
import { utils, EnumHelper, Emitter, Indenter } from './utils'

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

// ////////////////////////////////////////////////////////////////////////////
// Typescript Keywords
// ////////////////////////////////////////////////////////////////////////////

export enum TypescriptKeyword {
    BREAK = "break", CASE = "case", CATCH = "catch", CLASS = "class", CONST = "const",
    CONTINUE = "continue", DEBUGGER = "debugger", DEFAULT = "default", DELETE = "delete",
    DO = "do", ELSE = "else", ENUM = "enum", EXPORT = "export", EXTENDS = "extends",
    FALSE = "false", FINALLY = "finally", FOR = "for", FUNCTION = "function", IF = "if",
    IMPORT = "import", IN = "in", INSTANCEOF = "instanceof", NEW = "new", NULL = "null",
    RETURN = "return", SUPER = "super", SWITCH = "switch", THIS = "this", THROW = "throw",
    TRUE = "true", TRY = "try", TYPEOF = "typeof", VAR = "var", VOID = "void",
    WHILE = "while", WITH = "with", AS = "as", IMPLEMENTS = "implements",
    INTERFACE = "interface", LET = "let", PACKAGE = "package", PRIVATE = "private",
    PROTECTED = "protected", PUBLIC = "public", STATIC = "static", YIELD = "yield",
    ANY = "any", BOOLEAN = "boolean", CONSTRUCTOR = "constructor", DECLARE = "declare",
    GET = "get", MODULE = "module", REQUIRE = "require", NUMBER = "number", SET = "set",
    STRING = "string", SYMBOL = "symbol", TYPE = "type", FROM = "from", OF = "of",
}

const TypescriptKeywords = new EnumHelper(TypescriptKeyword)


// ////////////////////////////////////////////////////////////////////////////
// Typescript Builder
// ////////////////////////////////////////////////////////////////////////////

type TypescriptBuilderOptions = {
    tabsOrSpaces: 'spaces' | 'tabs'
}

export class TypescriptBuilder {
    options: TypescriptBuilderOptions = {
        tabsOrSpaces: 'spaces'
    }
    indenter: Indenter
    emitters: Emitter[] = []

    constructor(options?: Partial<TypescriptBuilderOptions>) {
        this.options = { ...this.options, ...options }
        this.indenter = new Indenter(this.options)
    }

    private push(fn: () => string): TypescriptBuilder {
        this.emitters.push(new class extends Emitter {
            emit(): string { return fn() }
        })
        return this
    }

    emit(): string {
        return this.emitters.map(
            emitter => emitter.emit()
        ).join(' ')
    }

    class(): TypescriptBuilder { return this.push(() => TypescriptKeyword.CLASS) }
    import(): TypescriptBuilder { return this.push(() => TypescriptKeyword.IMPORT) }
    from(): TypescriptBuilder { return this.push(() => TypescriptKeyword.FROM) }
    export(): TypescriptBuilder { return this.push(() => TypescriptKeyword.EXPORT) }
    this(): TypescriptBuilder { return this.push(() => TypescriptKeyword.THIS) }
    const(): TypescriptBuilder { return this.push(() => TypescriptKeyword.CONST) }
    as(): TypescriptBuilder { return this.push(() => TypescriptKeyword.AS) }
    angle(): TypescriptBuilder { return this.push(() => '<>') }
    colon(): TypescriptBuilder { return this.push(() => ':') }
    semicolon(): TypescriptBuilder { return this.push(() => ';') }
    equals(): TypescriptBuilder { return this.push(() => '=') }
    comma(): TypescriptBuilder { return this.push(() => ',') }
    dot(): TypescriptBuilder { return this.push(() => '.') }
    arrow(): TypescriptBuilder { return this.push(() => '=>') }
    pipe(): TypescriptBuilder { return this.push(() => '|') }
    question(): TypescriptBuilder { return this.push(() => '?') }
    string(): TypescriptBuilder { return this.push(() => TypescriptKeyword.STRING) }
    parenOpen(): TypescriptBuilder { return this.push(() => '(') }
    parenClose(): TypescriptBuilder { return this.push(() => ')') }
    id(value: string): TypescriptBuilder { return this.push(() => value) }
    newline(): TypescriptBuilder { return this.push(() => '\n') }
    curlyOpen(): TypescriptBuilder { return this.push(() => '{') }
    curlyClose(): TypescriptBuilder { return this.push(() => '}') }
    indent(): TypescriptBuilder { this.indenter.indent(); return this }
    dedent(): TypescriptBuilder { this.indenter.dedent(); return this }

    singleLineComment(...lines: string[]): TypescriptBuilder {
        lines.forEach(line => this.push(() => `// ${line}`))
        return this
    }

    multLineComment(...lines: string[]): TypescriptBuilder {
        for (let i = 0; i < lines.length; i++) {
            switch (i) {
                case 0:
                    this.push(() => '/* ' + lines[i])
                    break
                case lines.length - 1:
                    this.push(() => lines[i] + ' */')
                    break
                default:
                    this.push(() => lines[i])
            }
        }
        return this
    }

    tab(): TypescriptBuilder {
        return this.push(() => this.indenter.emit())
    }

    literal(value: string | number | boolean): TypescriptBuilder {
        switch (typeof value) {
            case 'string':
                this.push(() => `'${value}'`)
                break
            case 'number':
                this.push(() => `${value}`)
                break
            case 'boolean':
                this.push(() => value ? 'true' : 'false')
                break
            default:
                throw new Error(`literal: ${JSON.stringify(value)} unknown type ${typeof value}`)
        }
        return this
    }

    square(builder: TypescriptBuilder): TypescriptBuilder {
        return this.push(() => '[' + builder.emitters.map(e => e.emit()).join(',') + ']')
    }

    parens(...builders: TypescriptBuilder[]): TypescriptBuilder {
        this.parenOpen()

        for (let i = 0; i < builders.length; i++) {
            this.emitters.push(...builders[i].emitters)
            if (i < builders.length - 1) this.comma()
        }

        return this.parenClose()
    }

    chain(...builders: TypescriptBuilder[]): TypescriptBuilder {
        for (let i = 0; i < builders.length; i++) {
            this.emitters.push(...builders[i].emitters)
            if (i < builders.length - 1) this.dot()
        }

        return this
    }

    body(...builders: TypescriptBuilder[]): TypescriptBuilder {
        this.curlyOpen().newline()

        for (let i = 0; i < builders.length; i++) {
            const builder = builders[i]
            builder.indent()
            this.emitters.push(...builder.emitters)
            if (i < builders.length - 1) this.newline()
        }

        this.dedent()
        return this.newline().curlyClose()
    }

    object(...builders: TypescriptBuilder[]): TypescriptBuilder {
        this.curlyOpen()

        if (builders.length > 0) this.newline()
        this.indent()

        for (let i = 0; i < builders.length; i++) {
            const builder = builders[i]
            this.emitters.push(...builder.emitters)
            this.comma()
            this.newline()
        }

        this.dedent()
        return this.curlyClose()
    }
}

export const b = {
    o: function (options: Partial<TypescriptBuilderOptions>) { return new TypescriptBuilder(options) },
    export: function () { return new TypescriptBuilder().export() },
    import: function () { return new TypescriptBuilder().import() },
    id: function (value: string) { return new TypescriptBuilder().id(value) },
    literal: function (value: string | number | boolean) { return new TypescriptBuilder().literal(value) },
    object: function (...builders: TypescriptBuilder[]) { return new TypescriptBuilder().object(...builders) },
}
