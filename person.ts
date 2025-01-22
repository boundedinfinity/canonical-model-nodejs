import { UUID, WithIdAndLabelsModel, WithIdAndLabelsPersist, WithIdModel, WithIdPersist } from './common.ts'
import { loadData } from './load.ts'

const personalNameHonorificDatas = loadData<PersonalNameHonorificData>("personal-name-honorifics.json")

export const personalNames = {
    honorific: {
        all(): PersonalNameHonorific[] { return personalNameHonorificDatas.records },
        find(term: string): PersonalNameHonorific[] {
            const lc = term.toLocaleLowerCase()
            return personalNameHonorificDatas.records.filter(record => {
                return record.name.toLocaleLowerCase() == lc || record.aliases?.find(alias => alias.toLocaleLowerCase() == lc)
            })
        }
    }
}

// ////////////////////////////////////////////////////////////////////////////////////////////////
// Honorific Type
// ////////////////////////////////////////////////////////////////////////////////////////////////

// https://en.wikipedia.org/wiki/English_honorifics
export enum PersonalNameHonorificType {
    Unkown = 'unkown',
    Common = "common",
    Formal = "formal",
    Nobility = 'nobility',
    Royalty = 'royalty',
    Military = 'military',
    Academic = "academic",
    Professional = "professional",
    Religious = 'religious'
}

export class PersonalNameHonorific {
    name: string = ''
    type: PersonalNameHonorificType = PersonalNameHonorificType.Unkown
    aliases?: string[]
    description?: string[]
}

interface PersonalNameHonorificData {
    records: PersonalNameHonorific[]
}

// ////////////////////////////////////////////////////////////////////////////////////////////////
// Prefix / Suffix
// ////////////////////////////////////////////////////////////////////////////////////////////////

abstract class PersonalNfixModel extends WithIdModel {
    name: string = ''
    acronyms?: string[]
    description?: string[]
    type: PersonalNameHonorificType = PersonalNameHonorificType.Unkown

    override toString(): string {
        if (this.acronyms && this.acronyms.length > 0) return this.acronyms[0]
        return this.name
    }
}

export class PersonalPrefixModel extends PersonalNfixModel { }
export class PersonalSuffixModel extends PersonalNfixModel { }

interface PersonalNfixPersist extends WithIdPersist {
    name: string
    acronyms?: string[]
    description?: string[]
    type: PersonalNameHonorificType
}

export interface PersonalPrefixPersist extends PersonalNfixPersist { }
export interface PersonalSuffixPersist extends PersonalNfixPersist { }


// ////////////////////////////////////////////////////////////////////////////////////////////////
// Name
// ////////////////////////////////////////////////////////////////////////////////////////////////

export enum PersonalNameOrder {
    Western = 'western',
    Eastern = 'eastern'
}

export enum PersonalNameStyle {
    FullWithout = 'full-without-honerifics',
    FullWithHonerifics = "full-with-honerifics",
    Professional = 'professional',
    Gendered = 'gendered',
    Abbreviated = 'abbreviated',
}

export class PersonalNameModel extends WithIdAndLabelsModel {
    prefixes: PersonalPrefixModel[] = []
    firsts: string[] = []
    middles: string[] = []
    lasts: string[] = []
    suffixes: PersonalSuffixModel[] = []

    full(): string {
        return [
            ...this.prefixes.map(p => p.toString()),
            ...this.firsts, ...this.middles, ...this.lasts,
            ...this.suffixes.map(p => p.toString())
        ].join(" ")
    }
}

export interface PersonalNamePersist extends WithIdAndLabelsPersist {
    prefixes: UUID[]
    firsts: string[]
    middles: string[]
    lasts: string[]
    suffixes: UUID[]
}

