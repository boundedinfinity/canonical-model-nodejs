import npath from 'node:path'
import { writeFileSync } from 'node:fs'
import type { KindSchema } from './schema'
import utils from './utils'
import prettier from "@prettier/sync";

const config = {
    tabWidth: 4,
    newline: '\n',
    indexPrefix: (indent?: number) => ' '.repeat(config.tabWidth * (indent || 0))
}

export interface TypeScriptNamer {
    name(): string
}

interface TypeScriptEmitter {
    emit(indent: number): string
}

class Emitter implements TypeScriptEmitter {
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

function addNamedOrThrow<T extends { name: string }>(name: string, currents: T[], ...items: T[]) {
    items.forEach(item => {
        const found = currents.find(current => current.name == item.name)
        if (found)
            throw new Error(`${name} ${item.name} already exists`)
        currents.push(item)
    })
}

function hasNamed<T extends { name: string }>(currents: T[], name: string): boolean {
    return currents.find(current => current.name == name) != undefined
}

// https://www.qualdesk.com/blog/2021/type-guard-for-string-union-types-typescript/
// copilot:  "create a type guard for string union types in TypeScript for the following values ..."
const TypeScriptBuiltInTypeList = ['string', 'number', 'boolean', 'object', 'any', 'void', 'null', 'undefined'] as const;
export type TypeScriptBuiltInType = typeof TypeScriptBuiltInTypeList[number];

const TypeScriptProperyModifierList = ['private', 'readonly', 'static'] as const;
export type TypeScriptProperyModifier = typeof TypeScriptProperyModifierList[number];

const TypeScriptVariableModifierList = ['export', 'default', 'const', 'let'] as const;
export type TypeScriptVariableModifier = typeof TypeScriptVariableModifierList[number];

export const tsutils = {
    isBuiltInType: (value: string): value is TypeScriptBuiltInType => {
        return TypeScriptBuiltInTypeList.includes(value as TypeScriptBuiltInType)
    },
    isProperyModifier: (value: string): value is TypeScriptProperyModifier => {
        return TypeScriptProperyModifierList.includes(value as TypeScriptProperyModifier)
    },
    isVariableModifier: (value: string): value is TypeScriptVariableModifier => {
        return TypeScriptVariableModifierList.includes(value as TypeScriptVariableModifier)
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
    type: (kind: KindSchema): TypeScriptBuiltInType => {
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
                name = utils.string.phrase2Pascal(input) + 'Zod'
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

export type TypeScriptPropertyType = TypeScriptClass | TypeScriptBuiltInType
export class TypeScriptProperty {
    name: string
    optional?: boolean
    modifiers: TypeScriptProperyModifier[] = []
    kind?: TypeScriptPropertyType
    array?: boolean
    default?: string

    constructor(name: string) {
        this.name = name
    }

    private static Builder = class {
        constructor(private klass: TypeScriptProperty) { }
        optional(optional?: boolean) { this.klass.optional = optional; return this }
        modifiers(...modifiers: TypeScriptProperyModifier[]) { this.klass.addModifier(...modifiers); return this }
        kind(kind?: TypeScriptPropertyType) { this.klass.kind = kind; return this }
        array(array?: boolean) { this.klass.array = array; return this }
        default(d?: string) { this.klass.default = d; return this }
    }

    set() {
        return new TypeScriptProperty.Builder(this)
    }

    addModifier(...modifiers: TypeScriptProperyModifier[]) {
        this.modifiers = [...new Set([...this.modifiers, ...modifiers])]
    }

    emit(indent: number = 0): string {
        const worder = new Worder()
        this.modifiers.sort((a, b) => a.localeCompare(b)).forEach(m => { worder.push(m) })
        this.optional ? worder.push(this.name + '?') : worder.push(this.name)
        worder.push(':')

        let kind: string

        if (this.kind) {
            if (this.kind instanceof TypeScriptClass) {
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

export type TypeScriptVariable = {
    name: string
    type?: string
    isArray?: boolean
    isVariadic?: boolean
}

export type TypeScriptFunctionOutput = {
    type: string
    isArray?: boolean
    isVariadic?: boolean
}

export class TypeScriptFuntion {
    name: string
    inputs: TypeScriptVariable[] = []
    output?: TypeScriptFunctionOutput
    body: string[] = []
    isMethod?: boolean
    exported?: boolean

    constructor(name: string) {
        this.name = name
    }

    emit(indent: number = 0): string {
        const liner = new Liner(indent)
        const worder = new Worder()


        if (!this.isMethod) {
            if (this.exported) worder.push('export')
            worder.push('function')
        }

        worder.push(this.name)

        if (this.inputs.length > 0) {
            worder.push('(')
            const inputs: string[] = []
            this.inputs.forEach((input) => {
                let newInput = input.name + ':' + input.type
                if (input.isArray) newInput += '[]'
                inputs.push(newInput)
            })
            worder.push(inputs.join(', '))
            worder.push(')')
        } else {
            worder.push('()')
        }

        if (this.output) {
            worder.push(':')
            let output = this.output.type
            if (this.output.isArray) output += '[]'
            worder.push(output)
        }

        if (this.body.length > 0) {
            worder.push('{')
            liner.push(worder.emit())

            const bodyLiner = new Liner(indent)
            this.body.forEach(line => bodyLiner.push(line))
            liner.push(bodyLiner.emit())
            liner.push('}')
        } else {
            worder.push('{}')
            liner.push(worder.emit())
        }

        return liner.emit()
    }

    getInput(name: string): TypeScriptVariable {
        let found = this.inputs.find(input => input.name == name)
        if (found)
            return found
        else
            throw new Error(`input ${name} does not exist`)
    }

    hasInput(name: string): boolean {
        return this.inputs.find(input => input.name == name) != undefined
    }

    addInput(...inputs: TypeScriptVariable[]) {
        addNamedOrThrow('input', this.inputs, ...inputs)
    }
}

export class TypeScriptConstructor extends TypeScriptFuntion {
    constructor() {
        super('constructor')
        this.isMethod = true
    }
}

export type TypeScriptFuntionCallInput = {
    name: string
    isArray?: boolean
    isVariadic?: boolean
}

export class TypeScriptFuntionCall {
    name: string
    inputs: TypeScriptFuntionCallInput[] = []

    constructor(name: string) {
        this.name = name
    }

    addInput(...inputs: TypeScriptFuntionCallInput[]) {
        addNamedOrThrow('input', this.inputs, ...inputs)
    }

    emit(indent: number = 0): string {
        const worder = new Worder()

        if (this.inputs.length > 0) {
            this.inputs.forEach((input) => {
                let word = ''
                if (input.isVariadic) word += '...'
                word += input.name
                if (input.isArray || input.isVariadic) word += '[]'
                worder.push(word)
            })

            worder.push(')')
        } else {
            worder.push(`${this.name}()`)
        }

        return worder.emit()
    }
}

export class TypescriptFluidFunction {
    builder: string
    functions: TypeScriptFuntion[] = []

    constructor(builder: string) {
        this.builder = builder
    }

    emit(indent: number = 0): string {
        const liner = new Liner(indent)

        for (let i = 0; i < this.functions.length; i++) {
            if (i == 0) {
                liner.push(`${this.builder}.${this.functions[i].emit()}`)
            } else {
                liner.push(`${config.newline}${config.indexPrefix(indent + 1)}.${this.functions[i].emit()}`)
            }
        }

        liner.push(';')

        return liner.emit()
    }
}

export class TypeScriptAssignement {
    modidiers: TypeScriptVariableModifier[] = []
    variable: TypeScriptVariable
    assignements: TypeScriptEmitter[] = []

    constructor(variable: TypeScriptVariable, modidiers: TypeScriptVariableModifier[] = []) {
        this.variable = variable
        this.modidiers.push(...modidiers)
    }

    emit(indent: number = 0): string {
        const worder = new Worder()

        if (this.modidiers.length > 0) {
            worder.push(...this.modidiers)
        } else {
            worder.push('const')
        }

        worder.push(this.variable.name, '=')

        this.assignements.forEach(assignement => worder.push(assignement.emit(indent)))

        return worder.emit()
    }
}

export class TypeScriptInterface {
    name: string
    properties: TypeScriptProperty[] = []
    exported?: boolean

    constructor(name: string) {
        this.name = name
    }

    addProperty(...properties: TypeScriptProperty[]) {
        properties.forEach(property => {
            const found = this.properties.find(p => p.name == property.name)
            if (found)
                throw new Error(`property ${property.name} already exists`)
            this.properties.push(property)
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

        this.properties.forEach(property => liner.push(property.emit(indent + 1)))
        liner.push('}')

        return liner.emit()
    }
}


export type ThirdPartyModule = {
    repositoryName: string
    fromName: string
    namedImports: { name: string, typeOnly?: boolean }[]
}

export type TypeScriptImport = { name: string, alias?: string, typeOnly?: boolean, default?: boolean }

export class TypeScriptImportDescriptor {
    name: string
    namedImports: TypeScriptImport[] = []

    constructor(identifier: string) {
        this.name = identifier
    }

    private emitNamedImport(namedImport: TypeScriptImport): string {
        let words: string[] = []
        words.push(namedImport.name)
        if (namedImport.alias) {
            words.push('as')
            words.push(namedImport.alias)
        }
        return words.join(' ')
    }

    emit(): string {
        const normals = this.namedImports.filter(namedImport => !namedImport.typeOnly)
        const typeOnlys = this.namedImports.filter(namedImport => namedImport.typeOnly)
        const lines: string[] = []

        const build = (imp: TypeScriptImport[], typeOnly?: boolean) => {
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

    addNamedImport(...namedImports: (string | TypeScriptImport)[]) {
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

export class TypeScriptClass {
    name: string
    properties: TypeScriptProperty[] = []
    constructors: TypeScriptConstructor[] = []
    methods: TypeScriptFuntion[] = []
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

    addProperty(...properties: TypeScriptProperty[]) {
        properties.forEach(property => {
            const found = this.properties.find(p => p.name == property.name)
            if (found)
                throw new Error(`property ${property.name} already exists`)
            this.properties.push(property)
        })
    }

    getProperty(name: string): TypeScriptProperty {
        let found = this.properties.find(p => p.name == name)
        if (!found) {
            found = new TypeScriptProperty(name)
            this.properties.push(found)
        }
        return found
    }

    private addFunction(name: string, current: TypeScriptFuntion[], ...functions: TypeScriptFuntion[]) {
        functions.forEach(fn => {
            const found = current.find(c => c.name == fn.name)
            if (found)
                throw new Error(`${fn.name} already exists in ${name}`)
            fn.isMethod = true
            current.push(fn)
        })
    }

    addConstructor(...constructors: TypeScriptFuntion[]) {
        this.addFunction('constructors', this.constructors, ...constructors)
    }

    addMethod(...methods: TypeScriptFuntion[]) {
        this.addFunction('methods', this.methods, ...methods)
    }
}

export class TypeScriptFile {
    name: string
    imports: TypeScriptImportDescriptor[] = []
    classes: TypeScriptClass[] = []
    interfaces: TypeScriptInterface[] = []
    functions: TypeScriptFuntion[] = []

    constructor(path: string) {
        this.name = path
    }

    emit(): string {
        let liner = new Liner()

        if (this.imports.length > 0) {
            this.imports.forEach(v => liner.push(v.emit()))
            liner.push(config.newline)
        }

        if (this.classes.length > 0) {
            this.classes.forEach(v => liner.push(v.emit()))
            liner.push(config.newline)
        }

        if (this.interfaces.length > 0) {
            this.interfaces.forEach(v => liner.push(v.emit()))
            liner.push(config.newline)
        }

        if (this.functions.length > 0) {
            this.functions.forEach(v => liner.push(v.emit()))
            liner.push(config.newline)
        }

        return liner.emit()
    }

    private get<T extends { name: string }>(name: string, type: { new(name: string): T; }, currents: T[]): T {
        let found = currents.find(c => c.name == name)
        if (!found) {
            found = new type(name)
            addNamedOrThrow('name', currents, found)
        }
        return found
    }

    hasClass(name: string): boolean { return hasNamed(this.classes, name) }
    getClass(name: string): TypeScriptClass { return this.get(name, TypeScriptClass, this.classes) }
    addClass(...classes: TypeScriptClass[]) { addNamedOrThrow('class', this.classes, ...classes) }

    hasFunction(name: string): boolean { return hasNamed(this.functions, name) }
    getFunction(name: string): TypeScriptFuntion { return this.get(name, TypeScriptFuntion, this.functions) }
    addFunction(...functions: TypeScriptFuntion[]) { addNamedOrThrow('function', this.functions, ...functions) }


    hasInterface(name: string): boolean { return hasNamed(this.interfaces, name) }
    getInterface(name: string): TypeScriptInterface { return this.get(name, TypeScriptInterface, this.interfaces) }
    addInterface(...interfaces: TypeScriptInterface[]) { addNamedOrThrow('interface', this.interfaces, ...interfaces) }

    hasImport(name: string): boolean { return hasNamed(this.imports, name) }
    getImport(name: string): TypeScriptImportDescriptor {
        return this.get(name, TypeScriptImportDescriptor, this.imports)
    }
    addImport(...imports: TypeScriptImportDescriptor[]) {
        addNamedOrThrow('import', this.imports, ...imports)
    }
}

export type TypeScriptLanguageGeneratorConfig = {
    rootDir: string
    tsConfigPath: string
    formatOutput?: boolean
}

const defaultConfig: TypeScriptLanguageGeneratorConfig = {
    rootDir: './gen',
    tsConfigPath: './tsconfig.json',
}

export class TypeScriptLanguageGenerator {
    config: TypeScriptLanguageGeneratorConfig
    files: TypeScriptFile[] = []

    constructor(config?: Partial<TypeScriptLanguageGeneratorConfig>) {
        this.config = { ...defaultConfig, ...config }
    }

    getFile(name: string): TypeScriptFile {
        let found = this.files.find(file => file.name == name)
        if (!found) {
            found = new TypeScriptFile(name)
            this.files.push(found)
        }
        return found
    }

    addFile(...files: TypeScriptFile[]) {
        files.forEach(file => {
            const found = this.files.find(current => current.name == file.name)
            if (found)
                throw new Error(` ${file.name} already exists`)
            this.files.push(file)
        })
    }

    getClass(name: string): TypeScriptClass | undefined {
        let found: TypeScriptClass | undefined

        for (const file of this.files) {
            found = file.classes.find(c => c.name == name)
            if (found) break
            break
        }

        return found
    }

    findClassFile(nameOrClass: string | TypeScriptClass): TypeScriptFile | undefined {
        let name: string = typeof nameOrClass == 'string' ? nameOrClass : nameOrClass.name
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
