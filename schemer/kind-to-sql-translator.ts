import { schemaUtils } from './schema'
import type { KindSchema } from './schema'
import { SqlGenerator, SqlSelect, SqlDatabase, SqlTable, SqlColumnStringMax, SqlColumnStringMin } from "./sql-generator";
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

    process(): SqlGenerator {
        const generator = new SqlGenerator()
        const database = generator.database('schemer')

        // https://www.sqlite.org/datatype3.html
        const process = (kind: KindSchema, table: SqlTable) => {
            const kindName = schemaUtils.getKindName(kind)
            const getKindKind = schemaUtils.getKindKind(kind)
            const columnName = utils.string.phrase2Snake(kindName)
            const options: SqlColumnOptions = {}

            if (schemaUtils.hasValidation(kind)) {
                options.checks = []
            }

            switch (kind.kind) {
                case 'string':
                    if (kind.min) options.checks!.push(new SqlColumnStringMin(kind.min))
                    if (kind.max) options.checks!.push(new SqlColumnStringMax(kind.max))
                    table.column(columnName, 'TEXT', options)
                    break
                case 'bool':
                case 'int':
                    table.column(columnName, 'INTEGER')
                    break
                case 'float':
                    table.column(columnName, 'REAL')
                    break
                case 'object':
                    break
                case 'array':
                    break
                case 'ref':
                    break
                default:
                    throw new Error(`kind not supported: ${kind.kind}`)
            }
        }

        this.registry.registry.forEach((kind) => {
            switch (kind.kind) {
                case 'object':
                    const kindKind = schemaUtils.getKindKind(kind)
                    const tableName = utils.string.phrase2Snake(kindKind)
                    const table = database.table(tableName)
                    table.createPrimaryKey()
                    kind.properties.forEach(property => process(property, table))
                    break
                default:
                    throw new Error(`kind not supported: ${kind.kind}`)
            }
        })

        return generator
    }
}
