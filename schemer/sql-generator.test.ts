import { expect, test } from "bun:test";
import { SqlGenerator, SqlSelect } from "./sql-generator";

test("SQLGenerator", () => {
    const generator = new SqlGenerator()
    const database = generator.database('canonical')

    const person = database.addTable('person')
    person.createPrimaryKey()

    const personName = database.addTable('person_name')
    personName.createPrimaryKey()
    personName.column('first_name', 'TEXT', { indexed: true })
    personName.column('middle_name', 'TEXT', { indexed: true })
    personName.column('last_name', 'TEXT', { indexed: true })

    const email = database.addTable('email');
    email.createPrimaryKey()
    email.column('address', 'TEXT', { indexed: true })
    database.manyToManyBytable(personName, email)

    const phone = database.addTable('phone');
    phone.createPrimaryKey()
    phone.column('number', 'TEXT', { indexed: true })
    database.manyToManyBytable(personName, phone)

    const mailingAddress = database.addTable('mailing_address');
    mailingAddress.createPrimaryKey()
    mailingAddress.column('address', 'TEXT', { indexed: true })
    mailingAddress.column('zip_code', 'TEXT')
    database.manyToManyBytable(personName, mailingAddress)

    const label = database.addTable('label');
    label.createPrimaryKey()
    label.column('name', 'TEXT', { indexed: true })

    const labelGroup = database.addTable('label_group');
    labelGroup.createPrimaryKey()
    labelGroup.column('name', 'TEXT', { indexed: true })

    database.manyToManyBytable(labelGroup, label)

    database.oneToOneByTable(person, personName)
    database.manyToManyBytable(personName, label)
    database.manyToManyBytable(phone, label)
    database.manyToManyBytable(email, label)
    database.manyToManyBytable(mailingAddress, label)

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
