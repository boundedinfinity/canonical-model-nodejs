export type primaryKeyType = 'uuid' | 'integer' | 'string'
export type SchemaType = 'string' | 'integer' | 'boolean' | 'enumeration' | 'array' | 'object'

export interface Schema {
    name: string,
    type: SchemaType
}

interface WithPrimaryKey {
    primaryKey?: boolean
    primaryKeyType?: primaryKeyType
}

export interface StringField {
    name: string,
    min?: number
    max?: number
    unique?: boolean
    required?: boolean
    pattern?: string
}

export interface ObjectStringField extends WithPrimaryKey, StringField { }

export interface IntegerField {
    name: string,
    min?: number
    max?: number
    unique?: boolean
    required?: boolean
    pattern?: string
}

export interface ObjectIntegerField extends WithPrimaryKey, IntegerField { }
