import { UUID, Label, WithIdModel, WithIdAndLabelsModel, WithIdAndLabelsPersist } from './common.ts'
import { PersonalPrefixModel, PersonalPrefixPersist, PersonalNameModel, PersonalNamePersist, PersonalSuffixModel, PersonalSuffixPersist } from './person.ts'
import { ContactModel, ContactPersist } from './contact.ts'
import { BookmarkModel, BookmarkPersist } from './bookmark.ts'
import { ReferenceModel, ReferencePersist } from './reference.ts'

function t2id(m: WithIdModel[]): UUID[] { return m.map(x => x.id) }

function id2t<T>(ids: UUID[], getter: (id: UUID) => T): T[] { return ids.map(id => getter(id)) }

export function convert(
    getLabel: (id: UUID) => Label,
    getName: (id: UUID) => PersonalNameModel,
    getPrefix: (id: UUID) => PersonalPrefixModel,
    getSuffix: (id: UUID) => PersonalSuffixModel,
    getBookmark: (id: UUID) => BookmarkModel
) {
    function idAndLabelM2p(m: WithIdAndLabelsModel): WithIdAndLabelsPersist {
        return { id: m.id, labels: t2id(m.labels) }
    }

    function idAndLabelP2m(p: WithIdAndLabelsPersist): WithIdAndLabelsModel {
        return { id: p.id, labels: id2t(p.labels, getLabel) }
    }

    return {
        // bookmark: {
        //     m2p(m: BookmarkModel): BookmarkPersist {
        //         return {
        //             ...idAndLabelM2p(m),
        //             name: m.name,
        //             url: m.url,
        //             notes: [...m.notes],
        //         }
        //     },
        //     p2m(p: BookmarkPersist): BookmarkModel {
        //         return {
        //             ...idAndLabelP2m(p),
        //             name: p.name,
        //             url: p.url,
        //             notes: [...p.notes],
        //         }
        //     }
        // },
        contact: {
            m2p(m: ContactModel): ContactPersist {
                return {
                    ...idAndLabelM2p(m),
                    name: m.name.id,
                    aliases: t2id(m.aliases),
                }
            },
            p2m(p: ContactPersist): ContactModel {
                return Object.assign(new ContactModel(), {
                    ...idAndLabelP2m(p),
                    name: getName(p.name),
                    aliases: id2t(p.aliases, getName),
                })
            }
        },
        label: {

        },

        // person: {
        //     name: {
        //         prefix: {
        //             m2p(m: PersonalPrefixModel): PersonalPrefixPersist {
        //                 return {
        //                     ...idAndLabelM2p(m),
        //                     name: m.name,
        //                     acronyms: [...m.acronyms],
        //                     description: [...m.description],
        //                 }
        //             },
        //             p2m(p: PersonalPrefixPersist): PersonalPrefixModel {
        //                 return Object.assign(new PersonalPrefixModel(), {
        //                     ...idAndLabelP2m(p),
        //                     name: p.name,
        //                     acronyms: [...p.acronyms],
        //                     description: [...p.description],
        //                 })
        //             },
        //         },
        //         suffix: {
        //             m2p(m: PersonalSuffixModel): PersonalSuffixPersist {
        //                 return {
        //                     ...idAndLabelM2p(m),
        //                     name: m.name,
        //                     acronyms: [...m.acronyms],
        //                     description: m.description,
        //                 }
        //             },
        //             p2m(p: PersonalSuffixPersist): PersonalSuffixModel {
        //                 return Object.assign(new PersonalSuffixModel(), {
        //                     ...idAndLabelP2m(p),
        //                     text: p.name,
        //                     acronyms: [...p.acronyms],
        //                     description: p.description,
        //                 })
        //             },
        //         },
        //         name: {
        //             m2p(m: PersonalNameModel): PersonalNamePersist {
        //                 return {
        //                     ...idAndLabelM2p(m),
        //                     prefixes: t2id(m.prefixes),
        //                     firsts: [...m.firsts],
        //                     middles: [...m.middles],
        //                     lasts: [...m.lasts],
        //                     suffixes: t2id(m.suffixes),
        //                 }
        //             },
        //             p2m(p: PersonalNamePersist): PersonalNameModel {
        //                 return Object.assign(new PersonalNameModel(), {
        //                     ...idAndLabelP2m(p),
        //                     prefixes: id2t(p.prefixes, getPrefix),
        //                     firsts: [...p.firsts],
        //                     middles: [...p.middles],
        //                     lasts: [...p.lasts],
        //                     suffixes: id2t(p.suffixes, getSuffix),
        //                 })
        //             }
        //         }
        //     }
        // },

        reference: {
            m2p(m: ReferenceModel): ReferencePersist {
                return {
                    ...idAndLabelM2p(m),
                    name: m.name,
                    notes: [...m.notes],
                    bookmarks: t2id(m.bookmarks),
                }
            },
            p2m(p: ReferencePersist): ReferenceModel {
                return {
                    ...idAndLabelP2m(p),
                    name: p.name,
                    notes: [...p.notes],
                    bookmarks: id2t(p.bookmarks, getBookmark),
                }
            }
        }
    }
}

