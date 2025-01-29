import { expect, test } from "bun:test";
import { SqlGenerator } from "./sql-generator";

test("SQLGenerator", () => {
    const generator = new SqlGenerator()
    const database = generator.database('test')
    const test_table = database.table('test_table', { create: { ifNotExists: true }, drop: { ifExists: true } })
    test_table.column('id', 'TEXT', { primary: 'ASC' })
    test_table.column('email', 'TEXT', { unique: 'FAIL' })
    const text = database.emit()
    expect(text).toBe('')
})
