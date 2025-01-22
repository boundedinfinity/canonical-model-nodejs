import { WithIdAndLabelsModel, WithIdAndLabelsPersist } from './common.ts'

export class BookmarkModel extends WithIdAndLabelsModel {
    name: string = ''
    url: string = ''
    notes?: string[]
}

export interface BookmarkPersist extends WithIdAndLabelsPersist {
    name: string
    url: string
    notes?: string[]
}
