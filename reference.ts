import { UUID, Label } from './common'
import { BookmarkModel } from './bookmark'

export class ReferenceModel {
    id: UUID
    name: string
    notes: string[]
    bookmarks: BookmarkModel[]
    labels: Label[]
}


export class ReferencePersist {
    id: UUID
    name: string
    notes: string[]
    bookmarks: UUID[]
    labels: UUID[]
}
