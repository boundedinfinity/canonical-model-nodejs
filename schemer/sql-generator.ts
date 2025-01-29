import type { foreignKey } from "drizzle-orm/mysql-core"

const config = {
    newline: '\n',
    wrapName: (name: string) => '`' + name + '`',
}

// ////////////////////////////////////////////////////////////////////////////
// SQL Generator
// ////////////////////////////////////////////////////////////////////////////

export type SqlGeneratorOptions = {
}

export class SqlGenerator {
    options: SqlGeneratorOptions = {}
    databases: SqlDatabase[] = []

    constructor(options?: SqlGeneratorOptions) {
        this.options = { ...this.options, ...options }
    }

    database(name: string, options?: SqlDatabaseOptions): SqlDatabase {
        const database = new SqlDatabase(this, name, options)
        this.databases.push(database)
        return database
    }
}

// ////////////////////////////////////////////////////////////////////////////
// SQL Database
// ////////////////////////////////////////////////////////////////////////////

export type SqlDatabaseOptions = {
    pragmas?: SqlPragma[]
}

export class SqlDatabase {
    generator: SqlGenerator
    name: string
    tables: SqlTable[] = []
    indexes: SqlIndex[] = []
    options: SqlDatabaseOptions = {}

    constructor(generator: SqlGenerator, name: string, options?: SqlDatabaseOptions) {
        this.generator = generator
        this.name = name
        this.options = { ...this.options, ...options }
    }

    table(name: string, options?: SqlTableOptions): SqlTable {
        const table = new SqlTable(this, name, options)
        this.tables.push(table)
        return table
    }

    addPragma(name: SqlPragma) {
        if (!this.options.pragmas) this.options.pragmas = []
        this.options.pragmas.push(name)
    }

    index(column: SqlColumn, options?: SqlIndexOptions): SqlIndex {
        const index = new SqlIndex(column, options)
        this.indexes.push(index)
        return index
    }

    emit(): string {
        const lines: string[] = []


        if (this.options.pragmas?.length)
            lines.push(this.emitPragma())

        if (this.tables.length)
            lines.push(...this.tables.map(t => t.create().emit()))

        if (this.indexes.length)
            lines.push(...this.indexes.map(i => i.emit()))

        return lines.join(config.newline)
    }

    emitPragma(): string {
        let text = ''
        return text
    }

    oneToOne(t0: SqlTable, t1: SqlTable, options?: SqlForeignKeyOptions) {
        const fk0 = t0.getPrimaryKeyOrThrow()
        const name = `${t0.name}_id`
        const ref = t1.column(name, 'TEXT', { unique: true })
        ref.foreignKey(fk0, options)
    }

    oneToMany(t0: SqlTable, t1: SqlTable, options?: SqlForeignKeyOptions) {
        const fk0 = t0.getPrimaryKeyOrThrow()
        const name = `${t0.name}_id`
        const ref = t1.column(name, 'TEXT')
        ref.foreignKey(fk0, options)
    }

    manyToOne(t0: SqlTable, t1: SqlTable, options?: SqlForeignKeyOptions) {
        this.oneToMany(t1, t0, options)
    }

    manyToMany(t0: SqlTable, t1: SqlTable): SqlTable {
        const fk0 = t0.getPrimaryKeyOrThrow()
        const fk1 = t1.getPrimaryKeyOrThrow()
        const name = `${fk0.table.name}__${fk1.table.name}`
        const table = new SqlTable(fk0.table.database, name)
        const pk0 = table.column(fk0.table.name + '_id', 'TEXT', { primary: true })
        const pk1 = table.column(fk1.table.name + '_id', 'TEXT', { primary: true })

        pk0.foreignKey(fk0)
        pk1.foreignKey(fk1)

        this.tables.push(table)
        return table
    }

}

// ////////////////////////////////////////////////////////////////////////////
// SQL Drop Table
// ////////////////////////////////////////////////////////////////////////////

export type SqlDropTableOptions = {
    ifExists?: boolean
    schema?: string
}

class SqlDropTable {
    database: SqlDatabase
    name: string
    options: SqlDropTableOptions = {}

    constructor(database: SqlDatabase, name: string, options?: SqlDropTableOptions) {
        this.database = database
        this.name = name
        this.options = { ...this.options, ...options }
    }

    emit(): string {
        let text = 'DROP TABLE'
        if (this.options.ifExists) text += ' IF EXISTS'
        if (this.options.schema)
            text += ` ${this.options.schema}.${this.name}`
        else
            text += ` ${this.name}`
        text += ';'
        return text
    }
}

// ////////////////////////////////////////////////////////////////////////////
// SQL Create Table
// ////////////////////////////////////////////////////////////////////////////

export type CreateSqlTableOptions = {
    temporary?: boolean
    ifNotExists?: boolean
    schema?: string
    withoutRowId?: boolean
    strict?: boolean
    uuid?: boolean
}

export class CreateSqlTable {
    table: SqlTable
    options: CreateSqlTableOptions = {}

    constructor(table: SqlTable, options?: CreateSqlTableOptions) {
        this.table = table
        this.options = { ...this.options, ...options }
    }

    emit(): string {
        const words: string[] = ['CREATE']
        if (this.options.temporary) words.push('TEMPORARY')
        words.push('TABLE')
        if (this.options.ifNotExists) words.push('IF NOT EXISTS')
        words.push(config.wrapName(this.table.name))
        words.push('(')

        const middle: string[] = []
        middle.push(...this.table.columns.map(c => c.emit()))
        middle.push(...this.table.foreignKeys.map(fk => fk.emit()))
        words.push(middle.join(', '))

        words.push(')')

        if (this.options.withoutRowId) words.push('WITHOUT ROWID')
        if (this.options.strict) words.push('STRICT')

        let text = words.join(' ')
        text += ';'
        return text
    }
}

// ////////////////////////////////////////////////////////////////////////////
// SQL Foreign Key
// ////////////////////////////////////////////////////////////////////////////

// https://www.sqlite.org/syntax/foreign-key-clause.html
const SqlForeignKeyClauseOnList = ['SET NULL', 'SET DEFAULT', 'CASCADE', 'RESTRICT', 'NO ACTION'] as const;
export type SqlForeignKeyClauseOnType = typeof SqlForeignKeyClauseOnList[number];

export type SqlForeignKeyOptions = {
    onDelete?: SqlForeignKeyClauseOnType
    onUpdate?: SqlForeignKeyClauseOnType
}

export class SqlForeignKey {
    from: SqlColumn
    to: SqlColumn
    options: SqlForeignKeyOptions = {}

    constructor(from: SqlColumn, to: SqlColumn, options?: SqlForeignKeyOptions) {
        this.from = from
        this.to = to
        this.options = { ...this.options, ...options }
    }

    emit(): string {
        const words: string[] = ['FOREIGN KEY']
        words.push('(')
        words.push(config.wrapName(this.from.name))
        words.push(')')
        words.push('REFERENCES')
        words.push(config.wrapName(this.to.table.name))
        words.push('(')
        words.push(config.wrapName(this.to.name))
        words.push(')')

        if (this.options?.onDelete && sqlUtil.isForeignKeyClauseOnType(this.options.onDelete)) {
            words.push(`ON DELETE ${this.options.onDelete}`)
        }

        if (this.options?.onUpdate && sqlUtil.isForeignKeyClauseOnType(this.options.onUpdate)) {
            words.push(`ON UPDATE ${this.options.onUpdate}`)
        }

        return words.join(' ')
    }
}

// ////////////////////////////////////////////////////////////////////////////
// SQL Join Table
// ////////////////////////////////////////////////////////////////////////////

export type SqlJoinTableOptions = {
    name?: string
}

// ////////////////////////////////////////////////////////////////////////////
// SQL Table
// ////////////////////////////////////////////////////////////////////////////

export type SqlTableOptions = {
    create?: CreateSqlTableOptions
    drop?: SqlDropTableOptions
}

export class SqlTable {
    database: SqlDatabase
    name: string
    columns: SqlColumn[] = []
    foreignKeys: SqlForeignKey[] = []
    options: SqlTableOptions = {}

    constructor(database: SqlDatabase, name: string, options?: SqlTableOptions) {
        this.database = database
        this.name = name
        this.options = { ...this.options, ...options }
    }

    create(options?: CreateSqlTableOptions): CreateSqlTable {
        return new CreateSqlTable(this, { ...this.options.create, ...options })
    }

    drop(options?: SqlDropTableOptions): SqlDropTable {
        return new SqlDropTable(this.database, this.name, { ...this.options.drop, ...options })
    }

    column(name: string, type: SqlColumnType, options?: SqlColumnOptions): SqlColumn {
        if (options?.array) {
            const tablename = this.name + '__' + name
            const table = this.database.table(tablename)
            const column = table.column('name', type, options)
            this.database.oneToMany(this, table)
            return column
        } else {
            const column = new SqlColumn(this, name, type, options)
            this.columns.push(column)
            return column
        }
    }

    foreignKey(from: SqlColumn, to: SqlColumn, options?: SqlForeignKeyOptions): SqlForeignKey {
        const foreignKey = new SqlForeignKey(from, to, options)
        this.foreignKeys.push(foreignKey)
        return foreignKey
    }

    createPrimaryKey(options?: SqlColumnOptions): SqlColumn {
        return this.column('id', 'TEXT', { primary: true, ...options })
    }

    getPrimaryKey(): SqlColumn | undefined {
        return this.columns.find(c => c.options.primary)
    }

    getPrimaryKeyOrThrow(): SqlColumn {
        const found = this.getPrimaryKey()
        if (!found)
            throw new Error(`table ${this.name} has no primary key`)
        return found
    }
}

// ////////////////////////////////////////////////////////////////////////////
// SQL Column
// ////////////////////////////////////////////////////////////////////////////

// https://www.qualdesk.com/blog/2021/type-guard-for-string-union-types-typescript/
// copilot:  "create a type guard for string union types in TypeScript for the following values ..."
const SqlColumnTypeList = ['TEXT', 'NUMERIC', 'INTEGER', 'REAL', 'BLOB'] as const;
export type SqlColumnType = typeof SqlColumnTypeList[number];

const SqlColumnOnConflictTypeList = ['ROLLBACK', 'ABORT', 'FAIL', 'IGNORE', 'REPLACE'] as const;
export type SqlColumnOnConflictType = typeof SqlColumnOnConflictTypeList[number];

const SqlColumnCollatingTypeList = ['BINARY', 'NOCASE', 'RTRIM'] as const;
export type SqlColumnCollatingType = typeof SqlColumnCollatingTypeList[number];

const SqlColumnPrimaryKeyDirectionList = ['ASC', 'DESC'] as const;
export type SqlPrimaryKeyDirection = typeof SqlColumnPrimaryKeyDirectionList[number];

// https://www.sqlite.org/lang_createtable.html#the_default_clause
const SqlColumnDefaultBuiltInList = ['BINARY', 'NOCASE', 'RTRIM'] as const;
export type SqlColumnDefaultBuiltInType = typeof SqlColumnDefaultBuiltInList[number];

export type SqlColumnOptions = {
    primary?: boolean | SqlPrimaryKeyDirection
    index?: boolean
    notNull?: boolean | SqlColumnOnConflictType
    unique?: boolean | SqlColumnOnConflictType
    default?: number | string | SqlColumnDefaultBuiltInType | (() => string)
    collate?: SqlColumnCollatingType
    array?: boolean
}

// https://www.sqlite.org/syntax/column-def.html
export class SqlColumn {
    table: SqlTable
    name: string
    type: SqlColumnType
    options: SqlColumnOptions = {}

    constructor(table: SqlTable, name: string, type: SqlColumnType, options?: SqlColumnOptions) {
        this.table = table
        this.name = name
        this.type = type
        this.options = { ...this.options, ...options }

        if (this.options.index) {
            const index = new SqlIndex(this)
            this.table.database.indexes.push(index)
        }
    }

    qualifiedName(): string {
        return `${this.table.name}.${this.name}`
    }

    isPrimaryKey(): boolean {
        if (this.options.primary)
            return true
        return false
    }

    isPrimaryKeyOrThrow() {
        if (!this.isPrimaryKey())
            throw new Error(`column ${this.qualifiedName()} is not a primary key`)
    }

    emit(): string {
        const words: string[] = []
        words.push(config.wrapName(this.name))
        words.push(this.type)

        if (this.options.primary) {
            words.push('PRIMARY KEY')
            if (typeof this.options.primary === 'string' && sqlUtil.isColumnPrimaryKeyDirection(this.options.primary)) {
                words.push(this.options.primary)
            }
        }

        if (this.options.notNull) {
            words.push('NOT NULL')
            if (typeof this.options.notNull === 'string' && sqlUtil.isColumnOnConflictType(this.options.notNull)) {
                words.push(`ON CONFLICT ${this.options.notNull}`)
            }
        }

        if (this.options.unique) {
            words.push('UNIQUE')
            if (typeof this.options.unique === 'string' && sqlUtil.isColumnOnConflictType(this.options.unique)) {
                words.push(`ON CONFLICT ${this.options.unique}`)
            }
        }

        if (this.options.collate)
            words.push(`COLLATE ${this.options.collate}`)

        const text = words.join(' ')
        return text
    }

    index(options?: SqlIndexOptions): SqlIndex {
        const index = new SqlIndex(this, options)
        this.table.database.indexes.push(index)
        return index
    }

    foreignKey(to: SqlColumn, options?: SqlForeignKeyOptions): SqlForeignKey {
        return this.table.foreignKey(this, to, options)
    }
}

// ////////////////////////////////////////////////////////////////////////////
// SQL Index
// ////////////////////////////////////////////////////////////////////////////

export type SqlIndexOptions = {
    name?: string
    ifNotExists?: boolean
    unique?: boolean
    onConflict?: SqlColumnOnConflictType
}

export class SqlIndex {
    column: SqlColumn
    options: SqlIndexOptions = {}

    constructor(column: SqlColumn, options?: SqlIndexOptions) {
        this.column = column
        this.options = { ...this.options, ...options }
    }

    emit(): string {
        const words: string[] = ['CREATE']

        if (this.options.unique) words.push(' UNIQUE')
        words.push('INDEX')
        if (this.options.ifNotExists) words.push('IF NOT EXISTS')

        if (this.options.name)
            words.push(`${config.wrapName(this.options.name)}`)
        else
            words.push(config.wrapName(`${this.column.table.name}_${this.column.name}_index`))

        words.push(`ON`)
        words.push(config.wrapName(this.column.table.name))
        words.push('(')
        words.push(config.wrapName(this.column.name))
        words.push(')')

        let text = words.join(' ')
        text += ';'
        return text
    }
}

// ////////////////////////////////////////////////////////////////////////////
// SQL Pragma
// ////////////////////////////////////////////////////////////////////////////

const SqlPragmaList = ["analysis_limit", "application_id", "auto_vacuum", "automatic_index", "busy_timeout", "cache_size", "cache_spill", "case_sensitive_like", "cell_size_check", "checkpoint_fullfsync", "collation_list", "compile_options", "count_changes", "data_store_directory", "data_version", "database_list", "default_cache_size", "defer_foreign_keys", "empty_result_callbacks", "encoding", "foreign_key_check", "foreign_key_list", "foreign_keys", "freelist_count", "full_column_names", "fullfsync", "function_list", "hard_heap_limit", "ignore_check_constraints", "incremental_vacuum", "index_info", "index_list", "index_xinfo", "integrity_check", "journal_mode", "journal_size_limit", "legacy_alter_table", "legacy_file_format", "locking_mode", "max_page_count", "mmap_size", "module_list", "optimize", "page_count", "page_size", "parser_trace", "pragma_list", "query_only", "quick_check", "read_uncommitted", "recursive_triggers", "reverse_unordered_selects", "schema_version³", "secure_delete", "short_column_names", "shrink_memory", "soft_heap_limit", "stats³", "synchronous", "table_info", "table_list", "table_xinfo", "temp_store", "temp_store_directory", "threads", "trusted_schema", "user_version", "vdbe_addoptrace", "vdbe_debug", "vdbe_listing", "vdbe_trace", "wal_autocheckpoint"] as const;
export type SqlPragma = typeof SqlPragmaList[number];

export const sqlUtil = {
    isPragma: (value: string): value is SqlPragma => {
        return SqlPragmaList.includes(value as SqlPragma)
    },
    isColumnType: (value: string): value is SqlColumnType => {
        return SqlColumnTypeList.includes(value as SqlColumnType)
    },
    isColumnOnConflictType: (value: string): value is SqlColumnOnConflictType => {
        return SqlColumnOnConflictTypeList.includes(value as SqlColumnOnConflictType)
    },
    isColumnCollatingType: (value: string): value is SqlColumnCollatingType => {
        return SqlColumnCollatingTypeList.includes(value as SqlColumnCollatingType)
    },
    isColumnDefaultBuiltIn: (value: string): value is SqlColumnDefaultBuiltInType => {
        return SqlColumnDefaultBuiltInList.includes(value as SqlColumnDefaultBuiltInType)
    },
    isColumnPrimaryKeyDirection: (value: string): value is SqlPrimaryKeyDirection => {
        return SqlColumnPrimaryKeyDirectionList.includes(value as SqlPrimaryKeyDirection)
    },
    isForeignKeyClauseOnType: (value: string): value is SqlForeignKeyClauseOnType => {
        return SqlForeignKeyClauseOnList.includes(value as SqlForeignKeyClauseOnType)
    },


}
