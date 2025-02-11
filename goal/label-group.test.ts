import { expect, test } from "bun:test";
import { Label, MemoryLabelStore } from './label'
import { LabelGroup, MemoryLabelGroupStore } from './label-group'


test("Label Group", () => {
    const labels: Label[] = [
        new Label({ id: '1B5826EC-D7BE-4FE3-B9BE-58EE0EF01781', name: 'Work' }),
        new Label({ id: '6EC3B346-0753-49ED-8667-B243AEAF0F45', name: 'Home' }),
        new Label({ id: '8BC2A5EE-A1ED-4AA7-9C32-93B100F98C6D', name: 'Family' }),
    ]



    const labelStore = new MemoryLabelStore()
    labelStore.save(...labels)


    const labelGroup = new LabelGroup({
        id: 'B1D148CC-AC66-4F97-A04F-866AD0E23BB5',
        name: 'Home Group',
        description: 'Home Group Description',
        labelIds: ['6EC3B346-0753-49ED-8667-B243AEAF0F45']
    })

    const labelGroupStore = new MemoryLabelGroupStore(labelStore)
    labelGroupStore.save(labelGroup)
    const found = labelGroupStore.findOne({ id: labelGroup.id, load: { labels: true } })

    expect(found).toBeDefined()
    expect(found!.id!).toBe(labelGroup!.id!)
    expect(found!.labelIds!.length).toBe(labelGroup!.labelIds!.length)
    expect(found!.labels!.length).toBe(labelGroup!.labelIds!.length)
})
