import { KindUtils, KindRegistry } from './kind'
import type { KindSchema, ObjectSchema } from './kind'
import {
    SqlGenerator, SqlSelect, SqlDatabase, SqlTable,
    SqlColumnTextMax, SqlColumnTextMin, SqlColumnNumberMin, SqlColumnNumberMax
} from "./sql-generator";
import type { SqlColumn, SqlColumnOptions, SqlGeneratorOptions } from './sql-generator'
import utils from './utils'

export type KindToSqlTranslatorOptions = {
    name: string
} & SqlGeneratorOptions

const dbname = (kind: KindSchema) => {
    if (kind.persist?.name) return kind.persist.name
    const kindName = KindUtils.getKindName(kind)
    const name = utils.string.phrase2Snake(kindName)
    return name
}

const getKindTableFn = (database: SqlDatabase): (kind: KindSchema) => SqlTable => {
    return function (kind: KindSchema): SqlTable {
        const name = dbname(kind)
        const table = database.getTableOrThrow(name)
        return table
    }
}

export class KindToSqlDdlTranslator {
    generator: SqlGenerator
    registry: KindRegistry
    options: KindToSqlTranslatorOptions = {
        name: 'schemer',
        array_suffix: '__array'
    }

    constructor(registry: KindRegistry, generator: SqlGenerator, options?: Partial<KindToSqlTranslatorOptions>) {
        this.generator = generator
        this.registry = registry
        this.options = { ...this.options, ...options }
    }

    // https://www.sqlite.org/datatype3.html
    process() {
        const database = this.generator.database('schemer')
        const getKindTable = getKindTableFn(database)

        const round1 = (kind: KindSchema) => {
            const tableName = dbname(kind)
            switch (kind.kind) {
                case 'object':
                    const table = database.table(tableName)
                    table.createPrimaryKey()
                    break
                case 'string':
                case 'bool':
                case 'int':
                case 'float':
                case 'array':
                case 'ref':
                default:
                    throw new Error(`kind not supported: ${kind.kind}`)
            }
        }

        const round2 = (obj: KindSchema, prop: KindSchema, column?: SqlColumn) => {
            const table = getKindTable(obj)

            switch (prop.kind) {
                case 'string':
                    {
                        column = column ?? table.column(dbname(prop))
                        column.type = 'TEXT'
                        if (prop.searchable || prop.persist?.indexed) database.index(column)
                        if (prop.min) table.addCheck(new SqlColumnTextMin(column, prop.min))
                        if (prop.max) table.addCheck(new SqlColumnTextMax(column, prop.max))
                    }
                    break
                case 'bool':
                    column = column ?? table.column(dbname(prop))
                    column.type = 'INTEGER'
                    break
                case 'int':
                    {
                        column = column ?? table.column(dbname(prop))
                        column.type = 'INTEGER'
                        if (prop.min) table.addCheck(new SqlColumnNumberMin(column, prop.min))
                        if (prop.max) table.addCheck(new SqlColumnNumberMax(column, prop.max))
                    }
                    break
                case 'float':
                    {
                        column = column ?? table.column(dbname(prop))
                        column.type = 'REAL'
                        if (prop.min) table.addCheck(new SqlColumnNumberMin(column, prop.min))
                        if (prop.max) table.addCheck(new SqlColumnNumberMax(column, prop.max))
                        column.options.notNull = !prop.optional
                    }
                    break
                case 'object':
                    {
                        const propTable = getKindTable(prop)
                        database.manyToManyBytable(table, propTable)
                        console.log("object")
                    }
                    break
                case 'array':
                    {
                        if (this.registry.isPrimitive(prop)) {
                            const arrayTable = database.table(dbname(obj) + '__' + dbname(prop) + this.options.array_suffix)
                            arrayTable.column('index', 'INTEGER', { ordered: 'ASC' })
                            column = arrayTable.column(dbname(prop))
                            database.oneToManyByTable(getKindTable(obj), arrayTable)
                            round2(obj, prop.items, column)
                        } else {
                            round2(obj, prop.items)
                        }
                    }
                    break
                case 'ref':
                    round2(obj, prop.ref, column)
                    break
                default:
                    throw new Error(`kind not supported: ${prop.kind}`)
            }

            if (column) {
                column.options.notNull = !prop.optional
            }
        }

        this.registry.registry.forEach((kind) => round1(kind))
        this.registry.registry.forEach((obj) => (obj as ObjectSchema).properties.forEach((prop) => round2(obj, prop)))
    }
}

export type KindToSqlQueryTranslatorOptions = {
    placeholder: string
} & SqlGeneratorOptions

export class KindToSqlQueryTranslator {
    generator: SqlGenerator
    registry: KindRegistry
    options: KindToSqlQueryTranslatorOptions = {
        placeholder: '?',
        array_suffix: '__array'
    }

    constructor(registry: KindRegistry, generator: SqlGenerator, options?: Partial<KindToSqlQueryTranslatorOptions>) {
        this.generator = generator
        this.registry = registry
        this.options = { ...this.options, ...options }
    }

    // https://www.sqlite.org/datatype3.html
    process(): { [name: string]: string } {
        const database = this.generator.databases[0]
        const getKindTable = getKindTableFn(database)
        const queries = new Map<string, SqlSelect>()

        const queryName = (prefix: string, column: SqlColumn) => {
            let name: string = column.name
            name = utils.string.upperFirst(name)
            name = prefix + name
            name = column.table.name + '.' + name
            return name
        }

        const round1 = (obj: KindSchema) => {
            switch (obj.kind) {
                case 'object':
                    {
                        const table = getKindTable(obj)
                        const pk = table.getPrimaryKeyOrThrow()
                        const name = queryName('by', pk)
                        const query = new SqlSelect(this.options).select(table).where().column(pk).eq().placeholder()
                        queries.set(name, query)
                        obj.properties.forEach((prop) => round2(obj, prop))
                    }
                    break
                case 'string':
                case 'bool':
                case 'int':
                case 'float':
                case 'array':
                case 'ref':
                default:
                    throw new Error(`kind not supported: ${obj.kind}`)
            }
        }

        const round2 = (obj: KindSchema, prop: KindSchema, name?: string) => {
            name = name ?? dbname(prop)

            switch (prop.kind) {
                case 'object':
                    {

                    }
                    break
                case 'string':
                case 'bool':
                case 'int':
                case 'float':
                    {
                        if (prop.searchable || prop.persist?.indexed) {
                            const table = getKindTable(obj)
                            const column = table.getColumnOrThrow(name)
                            const qname = queryName('by', column)

                            const query = new SqlSelect(this.options)
                                .select(table)
                                .where()
                                .column(column)
                                .eq()
                                .placeholder()

                            queries.set(qname, query)
                        }
                    }
                    break
                case 'array':
                    round2(obj, prop.items, name)
                    break
                case 'ref':
                    round2(obj, prop.ref, name)
                    break
                default:
                    throw new Error(`kind not supported: ${obj.kind}.${prop.kind}`)
            }
        }



        this.registry.registry.forEach((obj) => round1(obj))
        const output: { [name: string]: string } = {}
        queries.keys().forEach(name => { output[name] = queries.get(name)!.emit() })

        return output
    }

    emit(): string {
        return JSON.stringify(this.process(), null, 4)
    }
}
