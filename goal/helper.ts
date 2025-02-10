import { text } from "drizzle-orm/sqlite-core";
import { v4 as uuid } from 'uuid';


export function uuid_pk(name?: string) {
    return text(name || 'id').primaryKey().$defaultFn(() => uuid())
}

// =================================================================================================

export const queryUtils = {
    query: {
        string: {
            defined(query?: StringQuery): boolean {
                if (!query) return false
                if (query.eq !== undefined || query.contains !== undefined)
                    return true
                return false
            },
            empty(query?: StringQuery): boolean {
                return !queryUtils.query.string.defined(query)
            },
            found(args: { value?: string, query?: string | StringQuery }): boolean {
                const query = typeof args.query === 'string' ? { eq: args.query } : args.query
                let found = false

                if (args.value && query) {
                    if (query.eq !== undefined && query.eq === args.value)
                        found = true
                    if (query.contains !== undefined && args.value?.includes(query.contains))
                        found = true
                }

                return found
            }
        }
    }
}

export type StringQuery = {
    eq?: string,
    contains?: string
}

export type ArrayQuery<T> = {
    eq?: T[],
    contains?: T[]
}
