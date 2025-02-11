import { expect, test } from "bun:test";
import { Messenger } from "./messenger";
import { Label, LabelSerializer } from './label'
import { LabelGroup, LabelGroupSerializer } from './label-group'
import npath from 'node:path'

test("Messenger", async () => {
    const path = npath.join(process.env.WORKSPACE_FOLDER!, 'goal/input.ndjson')
    const inputs = (await Bun.file(path).text()).split('\n').filter(line => line.length > 0)

    const messenger = new Messenger()

    messenger.registerSerializer(new LabelSerializer())
    messenger.registerSerializer(new LabelGroupSerializer())

    messenger.registerSendHandler(message => {
        const raw = JSON.stringify(message, null, 4)
        console.log(raw)
    })

    messenger.registerErrorHandler(err => {
        console.error(err.toString())
    })

    messenger.registerReceiveHandler({
        options: { kinds: [Label.kind] },
        handle: message => {
            switch (true) {
                case message instanceof Label:
                    const label = message as Label
                    console.log(`received label: ${label.name}`)
                    break
                default:
                    console.log(`unknown message kind: ${message.kind}`)
            }
        }
    })

    inputs.forEach(input => messenger.receive(input))
})
