import { expect, test } from "bun:test";
import { SqlGenerator, sqlUtil } from "./sql-generator";

test("SQLGenerator", () => {
    const generator = new SqlGenerator()
    const database = generator.database('canonical')

    const person = database.table('person')
    person.createPrimaryKey()
    person.column('email', 'TEXT', { unique: 'FAIL', index: true })
    person.column('name', 'TEXT', { index: true })
    person.column('first_name', 'TEXT', { index: true, array: true })

    const phone = database.table('phone');
    phone.createPrimaryKey()
    phone.column('number', 'TEXT', { index: true })

    const address = database.table('address');
    address.createPrimaryKey()
    address.column('zip_code', 'TEXT')

    const person_address = database.manyToMany(person, address)
    person_address.column('name', 'TEXT', { unique: true })

    const favorite = database.table('favorite')
    favorite.createPrimaryKey()
    favorite.column('thing', 'TEXT')

    database.oneToOne(person, favorite, { onDelete: 'CASCADE' })
    database.oneToMany(person, phone)

    const text = database.emit()
    console.log(text)
    expect(text).toBe('')
})
