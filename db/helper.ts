import { text } from "drizzle-orm/sqlite-core";
import { v4 as uuid } from 'uuid';


export function uuid_pk(name?: string) {
    return text(name || 'id').primaryKey().$defaultFn(() => uuid())
}
