export type UUID = string

const DATE_MIN = new Date(-8640000000000000)
const DATE_MAX = new Date(8640000000000000)

export class DateTimeSpan {
    start: Date = DATE_MIN
    end: Date = DATE_MAX

    between(d: Date): boolean { return d > this.start && d < this.end }
    outside(d: Date): boolean { return !this.between(d) }
}


export abstract class WithIdModel {
    id: UUID = ''
}

export abstract class WithIdAndLabelsModel {
    id: UUID = ''
    labels: Label[] = []
}

export interface WithIdPersist {
    id: UUID
}

export interface WithIdAndLabelsPersist {
    id: UUID
    labels: UUID[]
}

export class Label {
    id: UUID = ''
    text: string = ''
    description: string = ''
}
