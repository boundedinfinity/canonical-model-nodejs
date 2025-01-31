import { foreignKey } from "drizzle-orm/mysql-core"

const config = {
    newline: '\n',
    wrapName: (name: string) => '`' + name + '`',
}

class Indenter {
    level: number = 0
    char: string = '    '

    indent(text: string): string {
        let prefix = this.char.repeat(this.level)
        return prefix + text
    }

    indentLines(lines: string[]): string[] {
        return lines.map(l => this.indent(l))
    }

    inc() {
        this.level++
    }

    dec() {
        this.level--
        if (this.level < 0) this.level = 0
    }
}

abstract class Emitter {
    abstract emit(): string
}

// ////////////////////////////////////////////////////////////////////////////
// SQL Generator
// ////////////////////////////////////////////////////////////////////////////

export type SqlGeneratorOptions = {
    array_suffix: string
}

const defaultOptions: SqlGeneratorOptions = {
    array_suffix: '__array'
}

export class SqlGenerator {
    databases: SqlDatabase[] = []
    options: SqlGeneratorOptions = defaultOptions

    constructor(options?: Partial<SqlGeneratorOptions>) {
        this.options = { ...this.options, ...options }
    }

    validate() {
        this.databases.forEach(d => {
            d.tables.filter(t => !t.name.endsWith(this.options.array_suffix)).forEach(t => {
                if (!t.columns.some(c => c.isPrimaryKey()))
                    throw new Error(`table ${t.name} has no primary key`)

                t.columns.forEach(c => {
                    if (c.type === undefined || c.type === null)
                        throw new Error(`column ${c.qualifiedName()} has column with no type`)
                })
            })
        })
    }

    database(name: string, options?: SqlDatabaseOptions): SqlDatabase {
        const database = new SqlDatabase(this, name, options)
        this.databases.push(database)
        return database
    }

    emit(): string {
        this.validate()
        const lines: string[] = []
        lines.push(...this.databases.map(d => d.emit()))
        return lines.join(config.newline)
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

    getTable(name: string): SqlTable | undefined {
        return this.tables.find(t => t.name === name)
    }

    getTableOrThrow(name: string): SqlTable {
        const found = this.getTable(name)
        if (!found)
            throw new Error(`database ${this.name} has no table ${name}`)
        return found
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

    oneToOneByTable(t0: SqlTable, t1: SqlTable, options?: SqlForeignKeyOptions) {
        const fk0 = t0.getPrimaryKeyOrThrow()
        const ref = t1.column(fk0.foreignKeyName(), fk0.type, { unique: true })
        ref.foreignKey(fk0, options)
    }

    oneToManyByTable(t0: SqlTable, t1: SqlTable, options?: SqlForeignKeyOptions) {
        const fk0 = t0.getPrimaryKeyOrThrow()
        const ref = t1.column(fk0.foreignKeyName(), fk0.type, { notNull: true })
        ref.foreignKey(fk0, options)
    }

    oneToMany(col0: SqlColumn, table1: SqlTable, options?: SqlForeignKeyOptions) {
        const ref = table1.column(col0.foreignKeyName(), col0.type)
        ref.foreignKey(col0, options)
    }

    manyToOneByTable(t0: SqlTable, t1: SqlTable, options?: SqlForeignKeyOptions) {
        this.oneToManyByTable(t1, t0, options)
    }

    manyToManyBytable(t0: SqlTable, t1: SqlTable): SqlTable {
        const fk0 = t0.getPrimaryKeyOrThrow()
        const fk1 = t1.getPrimaryKeyOrThrow()

        const table = this.table(sqlUtil.joinTableName(fk0, fk1))
        const pk0 = table.column(fk0.foreignKeyName(), fk0.type, { primary: true })
        const pk1 = table.column(fk1.foreignKeyName(), fk1.type, { primary: true })

        pk0.foreignKey(fk0)
        pk1.foreignKey(fk1)

        return table
    }

    manyToMany(col0: SqlColumn, col1: SqlColumn): SqlTable {
        const table = this.table(sqlUtil.joinTableName(col0, col1))
        const pk0 = table.column(col0.foreignKeyName(), col0.type, { primary: true })
        const pk1 = table.column(col1.foreignKeyName(), col1.type, { primary: true })

        pk0.foreignKey(col0)
        pk1.foreignKey(col1)

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
        const indenter = new Indenter()
        const lines: string[] = []
        let words: string[] = ['CREATE']

        if (this.options.temporary) words.push('TEMPORARY')
        words.push('TABLE')

        if (this.options.ifNotExists) words.push('IF NOT EXISTS')
        words.push(config.wrapName(this.table.name))
        words.push('(')

        lines.push(words.join(' '))
        words = []

        indenter.inc()

        if (this.table.columns.length > 0) {
            const emits = this.table.columns
                .map(c => c.emit())
                .map(c => indenter.indent(c))
                .join(",|")
                .split('|')
            lines.push(...emits)
        }

        if (this.table.checks.length > 0) {
            lines.push(indenter.indent('CHECK ('))
            indenter.inc()
            const emits = this.table.checks
                .map(c => c.emit())
                .map(c => indenter.indent(c))
                .join(' AND|')
                .split('|')
            lines.push(...emits)
            indenter.dec()
            lines.push(indenter.indent(')'))
        }

        if (this.table.foreignKeys.length > 0) {
            const emits = this.table.foreignKeys
                .map(fk => fk.emit())
                .map(c => indenter.indent(c))
                .join(',|')
                .split('|')
            lines.push(...emits)
        }

        indenter.dec()

        if (this.options.withoutRowId) words.push('WITHOUT ROWID')
        if (this.options.strict) words.push('STRICT')
        words.push(')')

        let text = words.join(' ')
        text += ';'
        lines.push(words.join(' '))
        words = []
        return lines.join(config.newline)
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

        if (this.options?.onDelete && sqlUtil.is.foreignKeyClauseOnType(this.options.onDelete)) {
            words.push(`ON DELETE ${this.options.onDelete}`)
        }

        if (this.options?.onUpdate && sqlUtil.is.foreignKeyClauseOnType(this.options.onUpdate)) {
            words.push(`ON UPDATE ${this.options.onUpdate}`)
        }

        return words.join(' ')
    }
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
    checks: Emitter[] = []
    options: SqlTableOptions = {}

    constructor(database: SqlDatabase, name: string, options?: SqlTableOptions) {
        this.database = database
        this.name = name
        this.options = { ...this.options, ...options }
    }

    escapedName(): string {
        return config.wrapName(this.name)
    }

    create(options?: CreateSqlTableOptions): CreateSqlTable {
        return new CreateSqlTable(this, { ...this.options.create, ...options })
    }

    drop(options?: SqlDropTableOptions): SqlDropTable {
        return new SqlDropTable(this.database, this.name, { ...this.options.drop, ...options })
    }

    addCheck(check: Emitter) {
        this.checks.push(check)
    }

    column(name: string, typ?: SqlColumnType, options?: SqlColumnOptions): SqlColumn {
        const column = new SqlColumn(this, name, typ, options)
        this.columns.push(column)
        return column
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

    getColumn(name: string): SqlColumn | undefined {
        return this.columns.find(c => c.name === name)
    }

    getColumnOrThrow(name: string): SqlColumn {
        const found = this.getColumn(name)
        if (!found)
            throw new Error(`table ${this.name} has no column ${name}`)
        return found
    }
}

// ////////////////////////////////////////////////////////////////////////////
// SQL Column
// ////////////////////////////////////////////////////////////////////////////

// https://www.qualdesk.com/blog/2021/type-guard-for-string-union-types-typescript/
// copilot:  "create a type guard for string union types in TypeScript for the following values ..."

// https://www.sqlite.org/datatype3.html
const SqlColumnTypeList = ['TEXT', 'NUMERIC', 'INTEGER', 'REAL', 'BLOB'] as const;
export type SqlColumnType = typeof SqlColumnTypeList[number];

const SqlColumnOnConflictTypeList = ['ROLLBACK', 'ABORT', 'FAIL', 'IGNORE', 'REPLACE'] as const;
export type SqlColumnOnConflictType = typeof SqlColumnOnConflictTypeList[number];

const SqlColumnCollatingTypeList = ['BINARY', 'NOCASE', 'RTRIM'] as const;
export type SqlColumnCollatingType = typeof SqlColumnCollatingTypeList[number];

const SqlColumnDirectionList = ['ASC', 'DESC'] as const;
export type SqlColumnDirection = typeof SqlColumnDirectionList[number];

// https://www.sqlite.org/lang_createtable.html#the_default_clause
const SqlColumnDefaultBuiltInList = ['BINARY', 'NOCASE', 'RTRIM'] as const;
export type SqlColumnDefaultBuiltInType = typeof SqlColumnDefaultBuiltInList[number];

export type SqlColumnOptions = {
    primary?: boolean | SqlColumnDirection
    notNull?: boolean | SqlColumnOnConflictType
    unique?: boolean | SqlColumnOnConflictType
    default?: number | string | SqlColumnDefaultBuiltInType | (() => string)
    collate?: SqlColumnCollatingType
    ordered?: SqlColumnDirection
}

export class SqlColumnTextMax {
    column: SqlColumn
    max: number
    constructor(column: SqlColumn, max: number) {
        this.column = column
        this.max = max
    }
    emit(): string {
        return `LENGTH(${this.column.escapedName()}) <= ${this.max}`
    }
}

export class SqlColumnTextMin {
    column: SqlColumn
    min: number
    constructor(column: SqlColumn, max: number) {
        this.column = column
        this.min = max
    }
    emit(): string {
        return `LENGTH(${this.column.escapedName()}) >= ${this.min}`
    }
}

export class SqlColumnNumberMax {
    column: SqlColumn
    max: number
    constructor(column: SqlColumn, max: number) {
        this.column = column
        this.max = max
    }
    emit(): string {
        return `${this.column.escapedName()} <= ${this.max}`
    }
}

export class SqlColumnNumberMin {
    column: SqlColumn
    min: number
    constructor(column: SqlColumn, max: number) {
        this.column = column
        this.min = max
    }
    emit(): string {
        return `${this.column.escapedName()} >= ${this.min}`
    }
}

// https://www.sqlite.org/syntax/column-def.html
export class SqlColumn {
    table: SqlTable
    name: string
    type?: SqlColumnType
    options: SqlColumnOptions = {}

    constructor(table: SqlTable, name: string, typ?: SqlColumnType, options?: SqlColumnOptions) {
        this.table = table
        this.type = typ;
        this.name = name
        this.options = { ...this.options, ...options }
    }

    foreignKeyName(): string {
        return sqlUtil.foreignKeyName(this)
    }

    qualifiedName(): string {
        return `${this.table.name}.${this.name}`
    }

    escapedName(): string {
        return `${config.wrapName(this.name)}`
    }

    escapedQualifiedName(): string {
        return `${config.wrapName(this.table.name)}.${config.wrapName(this.name)}`
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
        words.push(this.type!)

        if (this.options.primary) {
            words.push('PRIMARY KEY')
            if (typeof this.options.primary === 'string' && sqlUtil.is.columnDirection(this.options.primary)) {
                words.push(this.options.primary)
            }
        }

        if (this.options.notNull) {
            words.push('NOT NULL')
            if (typeof this.options.notNull === 'string' && sqlUtil.is.columnOnConflictType(this.options.notNull)) {
                words.push(`ON CONFLICT ${this.options.notNull}`)
            }
        }

        if (this.options.unique) {
            words.push('UNIQUE')
            if (typeof this.options.unique === 'string' && sqlUtil.is.columnOnConflictType(this.options.unique)) {
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
    is: {
        pragma: (value: string): value is SqlPragma => {
            return SqlPragmaList.includes(value as SqlPragma)
        },
        columnType: (value: string): value is SqlColumnType => {
            return SqlColumnTypeList.includes(value as SqlColumnType)
        },
        columnOnConflictType: (value: string): value is SqlColumnOnConflictType => {
            return SqlColumnOnConflictTypeList.includes(value as SqlColumnOnConflictType)
        },
        columnCollatingType: (value: string): value is SqlColumnCollatingType => {
            return SqlColumnCollatingTypeList.includes(value as SqlColumnCollatingType)
        },
        columnDefaultBuiltIn: (value: string): value is SqlColumnDefaultBuiltInType => {
            return SqlColumnDefaultBuiltInList.includes(value as SqlColumnDefaultBuiltInType)
        },
        columnDirection: (value: string): value is SqlColumnDirection => {
            return SqlColumnDirectionList.includes(value as SqlColumnDirection)
        },
        foreignKeyClauseOnType: (value: string): value is SqlForeignKeyClauseOnType => {
            return SqlForeignKeyClauseOnList.includes(value as SqlForeignKeyClauseOnType)
        },

    },

    foreignKeyName: (column: SqlColumn): string => {
        const name = `${column.table.name}_${column.name}`
        return name
    },
    joinTableName: (c1: SqlColumn, c2: SqlColumn): string => {
        const name = `${c1.table.name}__${c2.table.name}`
        return name
    }
}

// ////////////////////////////////////////////////////////////////////////////
// SQL Select
// ////////////////////////////////////////////////////////////////////////////

export type SqlSelectOptions = {
    placeholder: string
}

export class SqlSelect {
    emitters: Emitter[] = []
    options: SqlSelectOptions = {
        placeholder: '?'
    }

    constructor(options?: Partial<SqlSelectOptions>) {
        this.options = { ...this.options, ...options }
    }

    private push(fn: () => string): SqlSelect {
        this.emitters.push(new class extends Emitter {
            emit(): string { return fn() }
        })
        return this
    }

    select(...vs: (SqlTable | SqlColumn)[]): SqlSelect {
        this.push(() => { return SqlKeyword.SELECT })

        const selects = vs.map(v => {
            if (v instanceof SqlTable)
                v.columns.forEach(c => this.push(() => c.escapedQualifiedName()))
            if (v instanceof SqlColumn)
                this.push(() => v.escapedQualifiedName())
        })

        return this
    }

    where(): SqlSelect {
        return this.push(() => { return SqlKeyword.WHERE })
    }

    column(c: SqlColumn): SqlSelect {
        return this.push(() => c.escapedQualifiedName())
    }

    placeholder(): SqlSelect {
        return this.push(() => `${this.options.placeholder}`)
    }

    private op(op: SqlOperator): SqlSelect { return this.push(() => op) }
    eq(): SqlSelect { return this.op(SqlOperator.Eq) }
    ne(): SqlSelect { return this.op(SqlOperator.Ne) }
    not(): SqlSelect { return this.op(SqlOperator.NOT) }
    and(): SqlSelect { return this.op(SqlOperator.AND) }
    or(): SqlSelect { return this.op(SqlOperator.OR) }
    between(): SqlSelect { return this.op(SqlOperator.BETWEEN) }
    isNot(): SqlSelect { this.op(SqlOperator.IS); return this.op(SqlOperator.NOT) }
    semicolon(): SqlSelect { return this.push(() => ';') }

    emit(): string {
        const words: string[] = []

        this.emitters.forEach(e => words.push(e.emit()))

        return words.join(' ')
    }
}

class EnumHelper<T extends { [k: string]: string }, S extends string> {
    private e: T

    constructor(e: T) { this.e = e }

    includes(s: S): boolean {
        return typeof s === 'string' && Object.values(this.e).includes(s);
    }

    list(): string[] {
        return Object.values(this.e)
    }

    parse(s: S): T | undefined {
        for (const [k, v] of Object.entries(this.e)) {
            if (v === s) return k as unknown as T
        }
        return undefined
    }

    parseOrThrow(s: S): T {
        const found = this.parse(s)
        if (!found) throw new Error(`unknown value: ${s}`)
        return found
    }
}

enum SqlKeyword { ACTION = "ACTION", ADD = "ADD", AFTER = "AFTER", ALL = "ALL", ALTER = "ALTER", ALWAYS = "ALWAYS", ANALYZE = "ANALYZE", AND = "AND", AS = "AS", ASC = "ASC", ATTACH = "ATTACH", AUTOINCREMENT = "AUTOINCREMENT", BEFORE = "BEFORE", BEGIN = "BEGIN", BETWEEN = "BETWEEN", BY = "BY", CASCADE = "CASCADE", CASE = "CASE", CAST = "CAST", CHECK = "CHECK", COLLATE = "COLLATE", COLUMN = "COLUMN", COMMIT = "COMMIT", CONFLICT = "CONFLICT", CONSTRAINT = "CONSTRAINT", CREATE = "CREATE", CROSS = "CROSS", CURRENT = "CURRENT", CURRENT_DATE = "CURRENT_DATE", CURRENT_TIME = "CURRENT_TIME", CURRENT_TIMESTAMP = "CURRENT_TIMESTAMP", DATABASE = "DATABASE", DEFAULT = "DEFAULT", DEFERRABLE = "DEFERRABLE", DEFERRED = "DEFERRED", DELETE = "DELETE", DESC = "DESC", DETACH = "DETACH", DISTINCT = "DISTINCT", DO = "DO", DROP = "DROP", EACH = "EACH", ELSE = "ELSE", END = "END", ESCAPE = "ESCAPE", EXCEPT = "EXCEPT", EXCLUDE = "EXCLUDE", EXCLUSIVE = "EXCLUSIVE", EXISTS = "EXISTS", EXPLAIN = "EXPLAIN", FAIL = "FAIL", FILTER = "FILTER", FIRST = "FIRST", FOLLOWING = "FOLLOWING", FOR = "FOR", FOREIGN = "FOREIGN", FROM = "FROM", FULL = "FULL", GENERATED = "GENERATED", GLOB = "GLOB", GROUP = "GROUP", GROUPS = "GROUPS", HAVING = "HAVING", IF = "IF", IGNORE = "IGNORE", IMMEDIATE = "IMMEDIATE", IN = "IN", INDEX = "INDEX", INDEXED = "INDEXED", INITIALLY = "INITIALLY", INNER = "INNER", INSERT = "INSERT", INSTEAD = "INSTEAD", INTERSECT = "INTERSECT", INTO = "INTO", IS = "IS", ISNULL = "ISNULL", JOIN = "JOIN", KEY = "KEY", LAST = "LAST", LEFT = "LEFT", LIKE = "LIKE", LIMIT = "LIMIT", MATCH = "MATCH", MATERIALIZED = "MATERIALIZED", NATURAL = "NATURAL", NO = "NO", NOT = "NOT", NOTHING = "NOTHING", NOTNULL = "NOTNULL", NULL = "NULL", NULLS = "NULLS", OF = "OF", OFFSET = "OFFSET", ON = "ON", OR = "OR", ORDER = "ORDER", OTHERS = "OTHERS", OUTER = "OUTER", OVER = "OVER", PARTITION = "PARTITION", PLAN = "PLAN", PRAGMA = "PRAGMA", PRECEDING = "PRECEDING", PRIMARY = "PRIMARY", QUERY = "QUERY", RAISE = "RAISE", RANGE = "RANGE", RECURSIVE = "RECURSIVE", REFERENCES = "REFERENCES", REGEXP = "REGEXP", REINDEX = "REINDEX", RELEASE = "RELEASE", RENAME = "RENAME", REPLACE = "REPLACE", RESTRICT = "RESTRICT", RETURNING = "RETURNING", RIGHT = "RIGHT", ROLLBACK = "ROLLBACK", ROW = "ROW", ROWS = "ROWS", SAVEPOINT = "SAVEPOINT", SELECT = "SELECT", SET = "SET", TABLE = "TABLE", TEMP = "TEMP", TEMPORARY = "TEMPORARY", THEN = "THEN", TIES = "TIES", TO = "TO", TRANSACTION = "TRANSACTION", TRIGGER = "TRIGGER", UNBOUNDED = "UNBOUNDED", UNION = "UNION", UNIQUE = "UNIQUE", UPDATE = "UPDATE", USING = "USING", VACUUM = "VACUUM", VALUES = "VALUES", VIEW = "VIEW", VIRTUAL = "VIRTUAL", WHEN = "WHEN", WHERE = "WHERE", WINDOW = "WINDOW", WITH = "WITH", WITHOUT = "WITHOUT", }
const SqlKeyWords = new EnumHelper(SqlKeyword)

enum SqlOperator { Eq = "=", Ne = "<>", AND = 'AND', OR = 'OR', IS = 'IS', BETWEEN = 'BETWEEN', IN = 'IN', LIKE = 'LIKE', NOT = 'NOT', }
const SqlOperators = new EnumHelper(SqlOperator)

class SqlDdl {
    emitters: Emitter[] = []

    private emit(fn: () => string): SqlDdl {
        this.emitters.push(new class extends Emitter {
            emit(): string { return fn() }
        })
        return this
    }

    select(...vs: (SqlTable | SqlColumn)[]): SqlDdl {
        this.emit(() => { return SqlKeyword.SELECT })

        const selects = vs.map(v => {
            if (v instanceof SqlTable)
                v.columns.forEach(c => this.emit(() => c.escapedQualifiedName()))
            if (v instanceof SqlColumn)
                this.emit(() => v.escapedQualifiedName())
        })

        return this
    }
}
