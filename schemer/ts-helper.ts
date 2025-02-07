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
    buffer: string = ''

    constructor(options?: Partial<TypescriptBuilderOptions>) {
        this.options = { ...this.options, ...options }
        this.indenter = new Indenter(this.options)
    }

    add<T extends string>(value: T, nospace?: boolean): TypescriptBuilder {
        this.buffer += value
        if (!nospace) this.buffer += ' '
        return this
    }

    emit(): string {
        return this.buffer
    }

    b(builder: TypescriptBuilder): TypescriptBuilder {
        this.buffer += builder.emit()
        return this
    }

    class(): TypescriptBuilder { return this.add(TypescriptKeyword.CLASS) }
    import(): TypescriptBuilder { return this.add(TypescriptKeyword.IMPORT) }
    from(): TypescriptBuilder { return this.add(TypescriptKeyword.FROM) }
    export(): TypescriptBuilder { return this.add(TypescriptKeyword.EXPORT) }
    this(): TypescriptBuilder { return this.add(TypescriptKeyword.THIS) }
    const(): TypescriptBuilder { return this.add(TypescriptKeyword.CONST) }
    as(): TypescriptBuilder { return this.add(TypescriptKeyword.AS) }
    angleOpen(): TypescriptBuilder { return this.add('<') }
    angleClose(): TypescriptBuilder { return this.add('>') }
    colon(): TypescriptBuilder { return this.add(':') }
    semicolon(): TypescriptBuilder { return this.add(';') }
    equals(): TypescriptBuilder { return this.add('=') }
    comma(): TypescriptBuilder { return this.add(',') }
    dot(): TypescriptBuilder { return this.add('.') }
    arrow(): TypescriptBuilder { return this.add('=>') }
    pipe(): TypescriptBuilder { return this.add('|') }
    question(): TypescriptBuilder { return this.add('?') }
    string(): TypescriptBuilder { return this.add(TypescriptKeyword.STRING) }
    parenOpen(): TypescriptBuilder { return this.add('(') }
    parenClose(): TypescriptBuilder { return this.add(')') }
    id(value: string): TypescriptBuilder { return this.add(value) }
    newline(): TypescriptBuilder { return this.add('\n') }
    curlyOpen(): TypescriptBuilder { return this.add('{') }
    curlyClose(): TypescriptBuilder { return this.add('}') }
    squareOpen(): TypescriptBuilder { return this.add('[') }
    squareClose(): TypescriptBuilder { return this.add(']') }
    indent(): TypescriptBuilder { this.indenter.indent(); return this }
    dedent(): TypescriptBuilder { this.indenter.dedent(); return this }
    raw(value: string): TypescriptBuilder { return this.add(value) }
    tab(): TypescriptBuilder { return this.add(this.indenter.emit()) }
    noop(): TypescriptBuilder { return new NoopBuilder() }
    self(): TypescriptBuilder { return this.add(TypescriptKeyword.THIS) }


    singleLineComment(...lines: string[]): TypescriptBuilder {
        for (let i = 0; i < lines.length; i++) {
            this.add(`// ${lines[i]}`)
            if (i < lines.length - 1) this.newline()
        }
        return this
    }

    multLineComment(...lines: string[]): TypescriptBuilder {
        for (let i = 0; i < lines.length; i++) {
            switch (i) {
                case 0:
                    this.add('/* ' + lines[i])
                    break
                case lines.length - 1:
                    this.add(lines[i] + ' */')
                    break
                default:
                    this.add(lines[i])
            }

            if (i < lines.length - 1) this.newline()
        }
        return this
    }

    literal(value: string | number | boolean): TypescriptBuilder {
        switch (typeof value) {
            case 'string':
                this.add(`'${value}'`)
                break
            case 'number':
                this.add(`${value}`)
                break
            case 'boolean':
                this.add(value ? 'true' : 'false')
                break
            default:
                throw new Error(`literal: ${JSON.stringify(value)} unknown type ${typeof value}`)
        }
        return this
    }

    private bracked(open: () => TypescriptBuilder, close: () => TypescriptBuilder, ...builders: TypescriptBuilder[]): TypescriptBuilder {
        open()

        let bufffer = builders
            .filter(b => !(b instanceof NoopBuilder))
            .map(b => b.emit())
            .join(', ')
        this.add(bufffer)

        return close()
    }

    square(...builders: TypescriptBuilder[]): TypescriptBuilder {
        return this.bracked(() => this.squareOpen(), () => this.squareClose(), ...builders)
    }

    parens(...builders: TypescriptBuilder[]): TypescriptBuilder {
        return this.bracked(() => this.parenOpen(), () => this.parenClose(), ...builders)
    }

    angle(...builders: TypescriptBuilder[]): TypescriptBuilder {
        return this.bracked(() => this.angleOpen(), () => this.angleClose(), ...builders)
    }

    curly(...builders: TypescriptBuilder[]): TypescriptBuilder {
        return this.bracked(() => this.curlyOpen(), () => this.curlyClose(), ...builders)
    }

    ctor(...builders: TypescriptBuilder[]): TypescriptBuilder {
        this.add(TypescriptKeyword.CONSTRUCTOR)
        return this.parens(...builders)
    }

    chain(...builders: TypescriptBuilder[]): TypescriptBuilder {
        for (let i = 0; i < builders.length; i++) {
            this.add(builders[i].emit())
            if (notLast(builders, i)) this.dot()
        }

        return this
    }

    body(...builders: TypescriptBuilder[]): TypescriptBuilder {
        this.curlyOpen().newline()
        this.indent()

        for (let i = 0; i < builders.length; i++) {
            if (!(builders[i] instanceof NoopBuilder)) {
                this.tab()
                this.add(builders[i].emit())
                if (notLast(builders, i)) this.newline()
            }
        }

        this.dedent()
        return this.newline().curlyClose()
    }

    object(...builders: TypescriptBuilder[]): TypescriptBuilder {
        this.curlyOpen()

        if (builders.length > 0) {
            this.newline()
            this.indent()
        }

        for (let i = 0; i < builders.length; i++) {
            this.tab()
            this.add(builders[i].emit())

            if (notLast(builders, i)) {
                this.comma()
            }

            if (builders.length > 0) {
                this.newline()
            }
        }

        if (builders.length > 0) {
            this.dedent()
        }

        return this.curlyClose()
    }
}

class NoopBuilder extends TypescriptBuilder {
    constructor(options?: Partial<TypescriptBuilderOptions>) { super(options) }
    emit(): string { return '' }
}

class ChainBuilder extends TypescriptBuilder {
    builders: TypescriptBuilder[] = []
    constructor(options?: Partial<TypescriptBuilderOptions>) { super(options) }
    emit(): string {
        for (let i = 0; i < this.builders.length; i++) {
            this.add(this.builders[i].emit())
            if (notLast(this.builders, i)) this.dot()
        }

        return this.buffer
    }
}

function notLast<T>(arr: T[], i: number): boolean {
    return i < arr.length - 1
}

export const b = {
    o: function (options?: Partial<TypescriptBuilderOptions>) { return new TypescriptBuilder(options) },
    export: function () { return new TypescriptBuilder().export() },
    import: function () { return new TypescriptBuilder().import() },
    id: function (value: string) { return new TypescriptBuilder().id(value) },
    literal: function (value: string | number | boolean) { return new TypescriptBuilder().literal(value) },
    object: function (...builders: TypescriptBuilder[]) { return new TypescriptBuilder().object(...builders) },
    ctor: function (...builders: TypescriptBuilder[]) { return new TypescriptBuilder().ctor(...builders) },
    noop: function () { return new TypescriptBuilder().noop() },
    body: function (...builders: TypescriptBuilder[]) { return new TypescriptBuilder().body(...builders) },
    self: function () { return new TypescriptBuilder().self() },
    const: function () { return new TypescriptBuilder().const() },
    newline: function () { return new TypescriptBuilder().newline() }
}
