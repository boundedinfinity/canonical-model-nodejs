

export interface Message {
    kind: string
}

export type ReceiveHandler = {
    options?: { kinds: string[] }
    handle: (message: Message) => void
}

export type SendHandler = (message: Message) => void
export type ErrorHandler = (raw: string, err: any) => void
export type FactoryHandler = { kind: string, factory: () => Message }
export type MessengerOptions = {}

export class Messenger {
    options: MessengerOptions = {}
    private receiveHandlers: ReceiveHandler[] = []
    private sendHandlers: SendHandler[] = []
    private errorHandlers: ErrorHandler[] = []
    private factoryHandlers = new Map<string, () => Message>()

    constructor(options?: MessengerOptions) {
        this.options = { ...this.options, ...options }
    }

    registerFactory(kind: string, factory: () => Message) {
        this.factoryHandlers.set(kind, factory)
    }

    error(raw: string, err: any) {
        this.errorHandlers.forEach(handler => handler(raw, err))
    }

    registerErrorHandler(handler: ErrorHandler) {
        this.errorHandlers.push(handler)
    }

    send(data: Message) {
        this.sendHandlers.forEach(handler => handler(data))
    }

    registerSendHandler(handler: SendHandler) {
        this.sendHandlers.push(handler)
    }

    receive(raw: string) {
        let message: Message = JSON.parse(raw)

        if (!message.kind) {
            this.errorHandlers.forEach(handler => handler(raw, new Error('No kind provided')))
            return
        }

        if (this.factoryHandlers.has(message.kind)) {
            const inst = this.factoryHandlers.get(message.kind)!()
            Object.assign(inst, message)
            message = inst
        }

        try {
            this.receiveHandlers
                .filter(
                    handler => handler?.options?.kinds?.includes(message.kind) ||
                        handler.options?.kinds?.includes('*'))
                .forEach(handler => handler.handle(message))
        } catch (err) {
            this.errorHandlers.forEach(handler => handler(raw, err))
        }
    }

    registerReceiveHandler(handler: ReceiveHandler) {
        this.receiveHandlers.push(handler)
    }
}
