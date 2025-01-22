import { UUID, DateTimeSpan, Label } from './common'

export enum UsernamePasswordState {
    Enabled = 'enabled',
    Disabled = 'disabled',
    Expired = 'expired',
    Used = 'used'
}

export class UsernamePasswordCredentialsModel {
    id: UUID
    username: string
    password: string
    state: UsernamePasswordState
    validThrough?: DateTimeSpan
    usedThrough?: DateTimeSpan
    labels: Label[]
}

export class AuthyModel {
    id: UUID
    name: string
    code: string
    used?: Date
    labels: Label[]
}
