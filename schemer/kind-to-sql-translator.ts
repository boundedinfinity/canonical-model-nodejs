import { schemaUtils } from './schema'
import type { KindSchema, ObjectSchema } from './schema'
import {
    SqlGenerator, SqlSelect, SqlDatabase, SqlTable,
    SqlColumnTextMax, SqlColumnTextMin, SqlColumnNumberMin, SqlColumnNumberMax
} from "./sql-generator";
import type { SqlColumnOptions } from './sql-generator'
import { KindRegistry } from './kind-registry'
import utils from './utils'

export type KindToSqlTranslatorOptions = {
    name?: string
}

const defaultOptions: KindToSqlTranslatorOptions = {
    name: 'schemer'
}

export class KindToSqlTranslator {
    registry: KindRegistry
    options: KindToSqlTranslatorOptions = defaultOptions

    constructor(registry: KindRegistry, options?: KindToSqlTranslatorOptions) {
        this.registry = registry
        this.options = { ...this.options, ...options }
    }

    // https://www.sqlite.org/datatype3.html
    process(): SqlGenerator {
        const generator = new SqlGenerator()
        const database = generator.database('schemer')

        const dbname = (kind: KindSchema) => {
            const kindName = schemaUtils.getKindName(kind)
            const name = utils.string.phrase2Snake(kindName)
            return name
        }

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

        type Round2Context = {
            columnName?: string
            isArray?: boolean
            isRef?: boolean
        }

        const round2 = (obj: KindSchema, prop: KindSchema, context: Round2Context = {}) => {
            const options: SqlColumnOptions = { checks: [] }
            const tableName = dbname(obj)
            const columnName = context.columnName ?? dbname(prop)

            if (prop.optional !== undefined)
                options.notNull = !prop.optional

            switch (prop.kind) {
                case 'string':
                    if (prop.min) options.checks!.push(new SqlColumnTextMin(prop.min))
                    if (prop.max) options.checks!.push(new SqlColumnTextMax(prop.max))
                    database.getTableOrThrow(tableName).column(columnName, 'TEXT', options)
                    break
                case 'bool':
                    database.getTableOrThrow(tableName).column(columnName, 'INTEGER', options)
                    break
                case 'int':
                    if (prop.min) options.checks!.push(new SqlColumnNumberMin(prop.min))
                    if (prop.max) options.checks!.push(new SqlColumnNumberMax(prop.max))
                    database.getTableOrThrow(tableName).column(columnName, 'INTEGER', options)
                    break
                case 'float':
                    if (prop.min) options.checks!.push(new SqlColumnNumberMin(prop.min))
                    if (prop.max) options.checks!.push(new SqlColumnNumberMax(prop.max))
                    database.getTableOrThrow(tableName).column(columnName, 'REAL', options)
                    break
                case 'object':
                    const currentTable = database.getTableOrThrow(tableName)
                    const foreignTable = database.getTableOrThrow(dbname(prop))

                    if (context.isArray) {
                        database.manyToMany(currentTable, foreignTable)
                    } else {
                        const primaryKey = foreignTable.getPrimaryKeyOrThrow()
                        const foreignKey = currentTable.column(primaryKey.foreignKeyName(), primaryKey.type)
                        currentTable.foreignKey(foreignKey, primaryKey)
                    }
                    break
                case 'array':
                    context.isArray = true
                    round2(obj, prop.items, { ...context, columnName: columnName })
                    break
                case 'ref':
                    context.isRef = true
                    round2(obj, prop.ref, { ...context, columnName: columnName })
                    break
                default:
                    throw new Error(`kind not supported: ${prop.kind}`)
            }
        }

        this.registry.registry.forEach((kind) => round1(kind))
        this.registry.registry.forEach((obj) => (obj as ObjectSchema).properties.forEach((prop) => round2(obj, prop)))

        return generator
    }
}
