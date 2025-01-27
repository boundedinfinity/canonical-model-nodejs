import npath from 'node:path'
import { writeFileSync } from 'node:fs'
import type { KindSchema } from './schema'
import utils from './utils'
import prettier from "@prettier/sync";
import type { getAsset } from 'node:sea';

const config = {
    tabWidth: 4,
    newline: '\n',
    indexPrefix: (indent?: number) => ' '.repeat(config.tabWidth * (indent || 0))
}

interface TsgEmitter {
    emit(indent: number): string
}

interface TypeScriptNamer {
    name: string | (() => string)
}

class Emitter implements TsgEmitter {
    emitted: string[] = []
    joiner: string

    constructor(joiner: string) {
        this.joiner = joiner
    }

    push(...emitted: string[]) { this.emitted.push(...emitted) }
    emit(indent?: number): string { return this.emitted.join(this.joiner) }
    clear() { this.emitted = [] }
}

class Worder extends Emitter {
    words: string[] = []

    constructor() { super(' ') }
    space() { this.push(' ') }
}

class Liner extends Emitter {
    lines: string[] = []
    indent: number

    constructor(indent: number = 0) {
        super(config.newline)
        this.indent = indent
    }

    push(...lines: string[]) {
        lines.forEach(line => super.push(config.indexPrefix(this.indent) + line))
    }
    newline() { this.lines.push(config.newline) }
}

function get<T extends TypeScriptNamer>(name: string, currents: T[]): T | undefined {
    return currents.find(current => {
        return typeof current.name == 'string'
            ? current.name == name
            : current.name() == name
    })
}

function getNamerOrFail<T extends TypeScriptNamer>(title: string, name: string, currents: T[]): T {
    let found = get<T>(name, currents)
    if (!found) throw new Error(`${title} ${name} not found`)
    return found
}

function has<T extends TypeScriptNamer>(name: string, currents: T[]): boolean {
    return get<T>(name, currents) !== undefined
}

function load<T extends { name: string }>(name: string, type: { new(name: string): T; }, currents: T[]): T {
    let found = currents.find(c => c.name == name)
    if (!found) {
        found = new type(name)
        addOrThrow('name', currents, found)
    }
    return found
}

function addEmitter<T extends TsgEmitter>(name: string, currents: T[], ...items: T[]) {
    currents.push(...items)
}

function addOrThrow<T extends { name: string }>(name: string, currents: T[], ...items: T[]) {
    items.forEach(item => {
        const found = currents.find(current => current.name == item.name)
        if (found)
            throw new Error(`${name} ${item.name} already exists`)
        currents.push(item)
    })
}

// https://www.qualdesk.com/blog/2021/type-guard-for-string-union-types-typescript/
// copilot:  "create a type guard for string union types in TypeScript for the following values ..."
const TsgBuiltInTypeList = ['string', 'number', 'boolean', 'object', 'any', 'void', 'null', 'undefined'] as const;
export type TsgBuiltInType = typeof TsgBuiltInTypeList[number];

const TsgProperyModifierList = ['private', 'readonly', 'static'] as const;
export type TsgProperyModifier = typeof TsgProperyModifierList[number];

const TsgVariableModifierList = ['export', 'default', 'const', 'let', 'variadic'] as const;
export type TsgVariableModifier = typeof TsgVariableModifierList[number];

export const tsutils = {
    isBuiltInType: (value: string): value is TsgBuiltInType => {
        return TsgBuiltInTypeList.includes(value as TsgBuiltInType)
    },
    isProperyModifier: (value: string): value is TsgProperyModifier => {
        return TsgProperyModifierList.includes(value as TsgProperyModifier)
    },
    isVariableModifier: (value: string): value is TsgVariableModifier => {
        return TsgVariableModifierList.includes(value as TsgVariableModifier)
    },
    defaultValue: (kind: KindSchema): string => {
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
                return tsutils.defaultValue(kind.ref)
                break
        }

        return value
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
                return tsutils.type(kind.items)
            case 'ref':
                return tsutils.type(kind.ref)
        }
    },
    name: (
        typ: 'ts-class' | 'ts-property' | 'file' | 'ts-module-specifier'
            | 'zod-schema' | 'zod-property' | 'ts-variable',
        input: string
    ): string => {
        let name: string

        switch (typ) {
            case 'ts-class':
                name = utils.string.phrase2Pascal(input)
                break
            case 'ts-variable':
            case 'ts-property':
                name = utils.string.phrase2Camel(input)
                break
            case 'zod-schema':
                name = tsutils.name('ts-class', input) + 'Zod'
                break
            case 'zod-property':
                name = utils.string.phrase2Camel(input)
                break
            case 'file':
                name = './' + utils.string.phrase2Kebab(input) + '.ts'
                break
            default:
                throw new Error(`unknown type ${typ}`)
        }

        return name
    }
}

export type TsgPropertyType = TsgClass | TsgBuiltInType
export class TsgProperty {
    name: string
    optional?: boolean
    modifiers: TsgProperyModifier[] = []
    kind?: TsgPropertyType
    array?: boolean
    default?: string

    constructor(name: string) {
        this.name = name
    }

    private static Builder = class {
        constructor(private klass: TsgProperty) { }
        optional(optional?: boolean) { this.klass.optional = optional; return this }
        modifiers(...modifiers: TsgProperyModifier[]) { this.klass.addModifier(...modifiers); return this }
        kind(kind?: TsgPropertyType) { this.klass.kind = kind; return this }
        array(array?: boolean) { this.klass.array = array; return this }
        default(d?: string) { this.klass.default = d; return this }
    }

    set() {
        return new TsgProperty.Builder(this)
    }

    addModifier(...modifiers: TsgProperyModifier[]) {
        this.modifiers = [...new Set([...this.modifiers, ...modifiers])]
    }

    emit(indent: number = 0): string {
        const worder = new Worder()
        this.modifiers.sort((a, b) => a.localeCompare(b)).forEach(m => { worder.push(m) })
        this.optional ? worder.push(this.name + '?') : worder.push(this.name)
        worder.push(':')

        let kind: string

        if (this.kind) {
            if (this.kind instanceof TsgClass) {
                kind = this.kind.name
            } else {
                kind = this.kind
            }
        } else {
            kind = 'any'
        }

        if (this.array) kind += '[]'
        worder.push(kind)

        if (this.default) {
            worder.push('=')
            worder.push(this.default)
        }

        worder.push(';')
        const liner = new Liner(indent)
        liner.push(worder.emit())

        return liner.emit()
    }
}

export type TsgFunctionInputArg = {
    name: string
    type?: string
    modifiers?: VariableOptions
}

export type TsgFunctionOutputArg = {
    type: string
    isArray?: boolean
    isVariadic?: boolean
}

export class TsgFuntion implements TsgEmitter {
    name: string
    inputs: TsgFunctionInputArg[] = []
    output?: TsgFunctionOutputArg
    body: string[] = []
    isMethod?: boolean
    exported?: boolean

    constructor(name: string) {
        this.name = name
    }

    emit(indent: number = 0): string {
        const liner = new Liner(indent)
        let line = ""

        if (!this.isMethod) {
            if (this.exported) line += ('export')
            line += 'function'
        }

        line += `${this.name} (`

        if (this.inputs.length > 0) {
            line += config.newline
            const inputs: string[] = []
            this.inputs.forEach((arg) => {
                let input = arg.name
                if (arg.modifiers?.optional) input += '?'
                if (arg.type) input += `: ${arg.type}`
                if (arg.modifiers?.array) input += '[]'
                inputs.push(input)
            })
            line += inputs.join(`,${config.newline}`)
            line += config.newline
        }
        line += ')'

        if (this.output) {
            line += ':'
            let output = this.output.type
            if (this.output.isArray) output += '[]'
            line += output
        }

        if (this.body.length > 0) {
            line += '{'
            liner.push(line)

            const bodyLiner = new Liner(indent)
            this.body.forEach(line => bodyLiner.push(line))
            liner.push(bodyLiner.emit())
            liner.push(`}`)
        } else {
            line += '{}'
            liner.push(line)
        }

        return liner.emit()
    }

    getInput(name: string): TsgFunctionInputArg {
        let found = this.inputs.find(input => input.name == name)
        if (found)
            return found
        else
            throw new Error(`input ${name} does not exist`)
    }

    hasInput(name: string): boolean {
        return this.inputs.find(input => input.name == name) != undefined
    }

    addInput(...inputs: TsgFunctionInputArg[]) {
        addOrThrow('input', this.inputs, ...inputs)
    }
}

export class TsgConstructor extends TsgFuntion {
    constructor() {
        super('constructor')
        this.isMethod = true
    }
}

export class TypeScriptFuntionCall implements TsgEmitter {
    name: string
    args: TsgEmitter[] = []

    constructor(name: string, args: TsgEmitter[] = []) {
        this.name = name
        this.args.push(...args)
    }

    literal(value: string | number | boolean): TypeScriptFuntionCall {
        this.args.push(new TsgLiteral(value))
        return this
    }

    bareword(value: string): TypeScriptFuntionCall {
        this.args.push(new TsgBareword(value))
        return this
    }

    emit(indent: number = 0): string {
        const args = this.args.map(arg => arg.emit(indent))
        const line = `${this.name}(${args.join(', ')})`
        return line
    }
}

export class TsgFluidFunction implements TsgEmitter {
    builder: string
    calls: TsgEmitter[] = []
    private currentCall?: TypeScriptFuntionCall

    constructor(builder: string, calls: TsgEmitter[] = []) {
        this.builder = builder
        this.calls.push(...calls)
    }

    call(name: string): TypeScriptFuntionCall {
        if (this.currentCall) this.calls.push(this.currentCall)
        this.currentCall = new TypeScriptFuntionCall(name)
        return this.currentCall
    }

    emit(indent: number = 0): string {
        if (this.currentCall) this.calls.push(this.currentCall)
        const calls = this.calls.map(emitter => emitter.emit(indent))
        const line = `${this.builder}.${calls.join('.')}`
        return line
    }
}

export class TsgAssignement implements TsgEmitter {
    variable: TsgFunctionInputArg
    emitter: TsgEmitter

    constructor(variable: TsgFunctionInputArg, assigned: TsgEmitter) {
        this.variable = variable
        this.emitter = assigned
    }

    name(): string { return this.variable.name }

    emit(indent: number = 0): string {
        const worder = new Worder()
        if (this.variable.modifiers?.exported) worder.push('export')
        if (this.variable.modifiers?.const)
            worder.push('const')
        else
            worder.push('let')

        worder.push(this.variable.name, '=')
        worder.push(this.emitter.emit(indent))

        return worder.emit()
    }
}

export class TsgBareword implements TsgEmitter {
    value: string

    constructor(value: string) {
        this.value = value
    }

    emit(indent: number = 0): string {
        return this.value
    }
}

export class TsgLiteral implements TsgEmitter {
    value: string | number | boolean

    constructor(value: string | number | boolean) {
        this.value = value
    }

    emit(indent: number = 0): string {
        let word: string
        if (typeof this.value == 'string') {
            word = `'${this.value}'`
        } else {
            word = `${this.value}`
        }

        return word
    }
}


export type VariableOptions = {
    array?: boolean
    optional?: boolean
    isVariadic?: boolean
    exported?: boolean
    default?: boolean
    const?: boolean
}

export class TsgObjectLiteralProperty implements TsgEmitter {
    name: string
    emitter: TsgEmitter
    modifiers?: VariableOptions

    constructor(name: string, emitter: TsgEmitter, modifiers?: VariableOptions) {
        this.name = name
        this.emitter = emitter
        this.modifiers = modifiers
    }

    emit(indent: number = 0): string {
        const worder = new Worder()
        let name = this.name
        if (this.modifiers?.optional) name += '?'
        worder.push(config.indexPrefix(indent) + name)
        worder.push(':')
        worder.push(this.emitter.emit(indent))
        return worder.emit()
    }
}

export class TsgObjectLiteral implements TsgEmitter {
    properties: TsgObjectLiteralProperty[] = []

    constructor(properties: TsgObjectLiteralProperty[] = []) {
        this.properties.push(...properties)
    }

    emit(indent: number = 0): string {
        const liner = new Liner(indent)

        if (this.properties.length > 0) {
            liner.push('{')
            const lines = this.properties.map(property => property.emit(indent + 1)).join(',' + config.newline)
            liner.push(lines)
            liner.push('}')
        }

        return liner.emit()
    }
}

export class TsgInterface implements TsgEmitter {
    name: string
    object = new TsgObjectLiteral()
    exported?: boolean

    constructor(name: string, properties: TsgObjectLiteralProperty[] = []) {
        this.name = name
        this.object.properties.push(...properties)
    }

    addProperty(...properties: TsgObjectLiteralProperty[]) {
        properties.forEach(property => {
            const found = this.object.properties.find(p => p.name == property.name)
            if (found)
                throw new Error(`property ${property.name} already exists`)
            this.object.properties.push(property)
        })
    }

    emit(indent: number = 0): string {
        const liner = new Liner(indent)
        let words: string[] = []

        if (this.exported) words.push('export')
        words.push('interface')
        words.push(this.name)
        words.push('{')
        liner.push(words.join(' '))
        liner.push(this.object.emit(indent + 1))
        liner.push('}')

        return liner.emit()
    }
}


export type TsgThirdPartyModule = {
    repositoryName: string
    fromName: string
    namedImports: { name: string, typeOnly?: boolean }[]
}

export type TsgImport = { name: string, alias?: string, typeOnly?: boolean, default?: boolean }

export class TsgImportDescriptor implements TsgEmitter {
    name: string
    namedImports: TsgImport[] = []

    constructor(identifier: string) {
        this.name = identifier
    }

    private emitNamedImport(namedImport: TsgImport): string {
        let words: string[] = []
        words.push(namedImport.name)
        if (namedImport.alias) {
            words.push('as')
            words.push(namedImport.alias)
        }
        return words.join(' ')
    }

    emit(indent: number = 0): string {
        const normals = this.namedImports.filter(namedImport => !namedImport.typeOnly)
        const typeOnlys = this.namedImports.filter(namedImport => namedImport.typeOnly)
        const lines: string[] = []

        const build = (imp: TsgImport[], typeOnly?: boolean) => {
            let words: string[] = []
            words.push('import')
            if (typeOnly) words.push('type')
            words.push('{')
            words.push(imp.map(n => this.emitNamedImport(n)).join(', '))
            words.push('}')
            words.push('from')
            words.push(`'${this.name}'`)
            words.push(';')
            lines.push(words.join(' '))

        }

        if (normals.length > 0) build(normals)
        if (typeOnlys.length > 0) build(typeOnlys, true)

        return lines.join(config.newline)
    }

    addNamedImport(...namedImports: (string | TsgImport)[]) {
        namedImports.forEach(input => {
            const namedImport = typeof input == 'string' ? { name: input } : input

            let found = this.namedImports.find(currentNamedImport => {
                return currentNamedImport.name == namedImport.name
            })

            if (!found) {
                this.namedImports.push(namedImport)
            } else {
                if (found.alias != namedImport.alias) {
                    throw new Error(`named import ${namedImport.name} alias mismatch ${found.alias} != ${namedImport.alias}`)
                }
            }
        })
    }
}

export class TsgClass implements TsgEmitter {
    name: string
    properties: TsgProperty[] = []
    constructors: TsgConstructor[] = []
    methods: TsgFuntion[] = []
    exported?: boolean

    constructor(name: string) {
        this.name = name
    }

    emit(indent: number = 0): string {
        const lines = new Liner(indent)
        let worder = new Worder()

        if (this.exported) worder.push('export')
        worder.push('class')
        worder.push(this.name)
        worder.push('{')
        lines.push(worder.emit())

        this.properties.forEach(property => {
            lines.push(property.emit(indent + 1))
        })

        this.constructors.forEach(constructor => {
            lines.push(constructor.emit(indent + 1))
        })

        this.methods.forEach(method => {
            lines.push(method.emit(indent + 1))
        })

        lines.push('}')

        return lines.emit()
    }

    addProperty(...properties: TsgProperty[]) {
        properties.forEach(property => {
            const found = this.properties.find(p => p.name == property.name)
            if (found)
                throw new Error(`property ${property.name} already exists`)
            this.properties.push(property)
        })
    }

    getProperty(name: string): TsgProperty {
        let found = this.properties.find(p => p.name == name)
        if (!found) {
            found = new TsgProperty(name)
            this.properties.push(found)
        }
        return found
    }

    private addFunction(name: string, current: TsgFuntion[], ...functions: TsgFuntion[]) {
        functions.forEach(fn => {
            const found = current.find(c => c.name == fn.name)
            if (found)
                throw new Error(`${fn.name} already exists in ${name}`)
            fn.isMethod = true
            current.push(fn)
        })
    }

    addConstructor(...constructors: TsgFuntion[]) {
        this.addFunction('constructors', this.constructors, ...constructors)
    }

    addMethod(...methods: TsgFuntion[]) {
        this.addFunction('methods', this.methods, ...methods)
    }
}

export class TsgFile implements TsgEmitter {
    name: string
    imports: TsgImportDescriptor[] = []
    classes: TsgClass[] = []
    interfaces: TsgInterface[] = []
    functions: TsgFuntion[] = []
    assignments: TsgAssignement[] = []

    constructor(path: string) {
        this.name = path
    }

    emit(indent: number = 0): string {
        let liner = new Liner()

        if (this.imports.length > 0) {
            this.imports.forEach(v => liner.push(v.emit(indent)))
            liner.push(config.newline)
        }

        if (this.classes.length > 0) {
            this.classes.forEach(v => liner.push(v.emit(indent)))
            liner.push(config.newline)
        }

        if (this.interfaces.length > 0) {
            this.interfaces.forEach(v => liner.push(v.emit(indent)))
            liner.push(config.newline)
        }

        if (this.functions.length > 0) {
            this.functions.forEach(v => liner.push(v.emit(indent)))
            liner.push(config.newline)
        }

        if (this.assignments.length > 0) {
            this.assignments.forEach(v => liner.push(v.emit(indent)))
            liner.push(config.newline)
        }

        return liner.emit()
    }



    addAssignment(...assignments: TsgAssignement[]) {
        addEmitter('assignement', this.assignments, ...assignments)
    }
    getAssignment(name: string): TsgAssignement {
        return getNamerOrFail('assignement', name, this.assignments)
    }


    hasClass(name: string): boolean { return has(name, this.classes) }
    getClass(name: string): TsgClass { return load(name, TsgClass, this.classes) }
    addClass(...classes: TsgClass[]) { addOrThrow('class', this.classes, ...classes) }

    hasFunction(name: string): boolean { return has(name, this.functions) }
    getFunction(name: string): TsgFuntion { return load(name, TsgFuntion, this.functions) }
    addFunction(...functions: TsgFuntion[]) { addOrThrow('function', this.functions, ...functions) }


    hasInterface(name: string): boolean { return has(name, this.interfaces) }
    getInterface(name: string): TsgInterface { return load(name, TsgInterface, this.interfaces) }
    addInterface(...interfaces: TsgInterface[]) { addOrThrow('interface', this.interfaces, ...interfaces) }

    hasImport(name: string): boolean { return has(name, this.imports) }
    getImport(name: string): TsgImportDescriptor {
        return load(name, TsgImportDescriptor, this.imports)
    }
    addImport(...imports: TsgImportDescriptor[]) {
        addOrThrow('import', this.imports, ...imports)
    }
}

export type TsgLanguageGeneratorConfig = {
    rootDir: string
    tsConfigPath: string
    formatOutput?: boolean
    validateUnique?: boolean
}

const defaultConfig: TsgLanguageGeneratorConfig = {
    rootDir: './gen',
    tsConfigPath: './tsconfig.json',
}

export class TsgLanguageGenerator {
    config: TsgLanguageGeneratorConfig
    files: TsgFile[] = []

    constructor(config?: Partial<TsgLanguageGeneratorConfig>) {
        this.config = { ...defaultConfig, ...config }
    }

    getFile(name: string): TsgFile {
        let found = this.files.find(file => file.name == name)
        if (!found) {
            found = new TsgFile(name)
            this.files.push(found)
        }
        return found
    }

    addFile(...files: TsgFile[]) {
        files.forEach(file => {
            const found = this.files.find(current => current.name == file.name)
            if (found)
                throw new Error(` ${file.name} already exists`)
            this.files.push(file)
        })
    }

    getClass(name: string): TsgClass | undefined {
        let found: TsgClass | undefined

        for (const file of this.files) {
            found = file.classes.find(c => c.name == name)
            if (found) break
            break
        }

        return found
    }

    findClassFile(nameOrClass: string | TsgClass): TsgFile | undefined {
        let name: string = typeof nameOrClass == 'string' ? nameOrClass : nameOrClass.name
        let found = this.files.find(file => file.getClass(name) != undefined)
        return found
    }

    findFile(name: string): TsgFile | undefined {
        return this.files.find(file =>
            has(name, file.assignments)
            || has(name, file.classes)
            || has(name, file.functions)
            || has(name, file.interfaces)
        )
    }

    findAssignementFile(nameOrClass: string | TsgAssignement): TsgFile | undefined {
        let name: string = typeof nameOrClass == 'string' ? nameOrClass : nameOrClass.variable.name
        let found = this.files.find(file => file.getClass(name) != undefined)
        return found
    }

    generate(): { [name: string]: string } {
        const contents: { [name: string]: string } = {}

        this.files.forEach(file => {
            const path = npath.join(this.config.rootDir, file.name)
            let content = file.emit()
            // if (this.config.formatOutput) content = prettier.format(content)
            contents[path] = content
        })

        return contents
    }

    saveSync() {
        Object.entries(this.generate()).forEach(([path, contents]) => {
            writeFileSync(path, contents)
        })
    }
}
