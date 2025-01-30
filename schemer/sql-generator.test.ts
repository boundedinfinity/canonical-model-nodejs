import { expect, test } from "bun:test";
import { SqlGenerator, SqlSelect } from "./sql-generator";

test("SQLGenerator", () => {
    const generator = new SqlGenerator()
    const database = generator.database('canonical')

    const person = database.table('person')
    person.createPrimaryKey()

    const personName = database.table('person_name')
    personName.createPrimaryKey()
    personName.column('first_name', 'TEXT', { index: true, array: true })
    personName.column('middle_name', 'TEXT', { index: true, array: true })
    personName.column('last_name', 'TEXT', { index: true, array: true })

    const email = database.table('email');
    email.createPrimaryKey()
    email.column('address', 'TEXT', { index: true })
    database.manyToMany(personName, email)

    const phone = database.table('phone');
    phone.createPrimaryKey()
    phone.column('number', 'TEXT', { index: true })
    database.manyToMany(personName, phone)

    const mailingAddress = database.table('mailing_address');
    mailingAddress.createPrimaryKey()
    mailingAddress.column('address', 'TEXT', { index: true, array: true })
    mailingAddress.column('zip_code', 'TEXT')
    database.manyToMany(personName, mailingAddress)

    const label = database.table('label');
    label.createPrimaryKey()
    label.column('name', 'TEXT', { index: true })

    const labelGroup = database.table('label_group');
    labelGroup.createPrimaryKey()
    labelGroup.column('name', 'TEXT', { index: true })

    database.manyToMany(labelGroup, label)

    database.oneToOne(person, personName)
    database.manyToMany(personName, label)
    database.manyToMany(phone, label)
    database.manyToMany(email, label)
    database.manyToMany(mailingAddress, label)

    const databaseEmit = database.emit()
    console.log(databaseEmit)

    const select1 = new SqlSelect()
    select1.addColums([person])
    select1.joinOnTable(person, personName)
    console.log(select1.emit())

    const select2 = new SqlSelect()
    const tableX = database.getTableOrThrow('person_name__first_name')
    select2.addColums([tableX])
    select2.where(tableX.getColumnOrThrow('person_name_id'), 1)
    console.log(select2.emit())

    // expect(databaseEmit).toBe('')
})
