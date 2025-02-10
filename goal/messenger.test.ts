import { expect, test } from "bun:test";
import { Messenger } from "./messenger";
import { Label } from './label'

test("Messenger", () => {
    const label = new Label({ id: '1B5826EC-D7BE-4FE3-B9BE-58EE0EF01781', name: 'test' })

    const messenger = new Messenger()

    messenger.registerSendHandler(message => {
        const raw = JSON.stringify(message, null, 4)
        console.log(raw)
    })

    messenger.registerReceiveHandler({
        options: { kinds: [new Label().kind] },
        handle: message => {
            switch (true) {
                case message instanceof Label:
                    const label = message as Label
                    console.log(`received label: ${label.name}`)
                    break
                default:
                    throw new Error(`unknown message kind: ${message.kind}`)
            }

        }
    })

    messenger.registerFactory('label', () => new Label())
    messenger.receive(JSON.stringify(label))


    messenger.send(label)
})
