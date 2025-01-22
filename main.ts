import { drizzle } from 'drizzle-orm/libsql';

const db = drizzle({
    connection: {
        url: 'file:canonical.db',
    }
});

// const result = await db.get("select 1")
// console.log(result)

export enum PersonalNameOrder {
    Western = 'western',
    Eastern = 'eastern'
}

const vs = Object.values(PersonalNameOrder).map(k => k.toString())

console.log(vs)
console.log(typeof vs)
