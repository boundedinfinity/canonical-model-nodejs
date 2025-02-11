

export interface Serializer<T> {
    canHandleRaw(s: string): boolean
    canHandleType(a: any): boolean
    serialize(t: T): string
    deserialize(s: string): T
}

export interface Message {
    kind: string
}

export type ReceiveHandler = {
    options?: { kinds: string[] }
    handle: (message: Message) => void
}

export type SendHandler = (message: any) => void
export type ErrorHandler = (err: Error) => void
export type FactoryHandler = { kind: string, factory: () => Message }
export type MessengerOptions = {}

export class Messenger {
    options: MessengerOptions = {}
    private serializers: Serializer<any>[] = []
    private receiveHandlers: ReceiveHandler[] = []
    private sendHandlers: SendHandler[] = []
    private errorHandlers: ErrorHandler[] = []

    constructor(options?: MessengerOptions) {
        this.options = { ...this.options, ...options }
    }

    registerSerializer(serializer: Serializer<any>) {
        this.serializers.push(serializer)
    }

    error(err: Error) {
        this.errorHandlers.forEach(handler => handler(err))
    }

    registerErrorHandler(handler: ErrorHandler) {
        this.errorHandlers.push(handler)
    }

    serialize(message: object): string | undefined {
        const serializer = this.serializers.find(serializer => serializer.canHandleType(message))

        if (!serializer) {
            const err = new Error(`unable to serialize message: ${JSON.stringify(message)}`)
            this.error(err)
            return
        }

        return serializer.serialize(message)
    }

    send(data: object) {
        this.sendHandlers.forEach(handler => handler(data))
    }

    registerSendHandler(handler: SendHandler) {
        this.sendHandlers.push(handler)
    }

    receive(raw: string) {
        const serializer = this.serializers.find(serializer => serializer.canHandleRaw(raw))

        if (!serializer) {
            const err = new Error(`unable to handle message ${raw}`)
            this.error(err)
            return
        }

        const message = serializer.deserialize(raw)

        try {
            this.receiveHandlers
                .filter(
                    handler => handler?.options?.kinds?.includes(message.kind) ||
                        handler.options?.kinds?.includes('*'))
                .forEach(handler => handler.handle(message))
        } catch (err) {
            if (err instanceof Error)
                this.error(err)
            else
                this.error(new Error(`${err}`))
        }
    }

    registerReceiveHandler(handler: ReceiveHandler) {
        this.receiveHandlers.push(handler)
    }
}
