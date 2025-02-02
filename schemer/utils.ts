

export type IdenterOpotions = {
    tabsOrSpaces: 'spaces' | 'tabs'
    level: number
    tabWidth: number
}

export class Indenter {
    options: IdenterOpotions = {
        tabsOrSpaces: 'spaces',
        level: 0,
        tabWidth: 4
    }

    constructor(options?: Partial<IdenterOpotions>) {
        this.options = { ...this.options, ...options }
    }

    emit(text?: string): string {
        let output: string

        switch (this.options.tabsOrSpaces) {
            case 'tabs':
                output = '\t'.repeat(this.options.level)
                break
            default:
                output = ' '.repeat(this.options.level * this.options.tabWidth)
        }

        if (text) output += text

        return output
    }

    emitLines(lines: string[]): string[] {
        return lines.map(l => this.emit(l))
    }

    indent() { this.options.level += 1 }
    dedent() {
        this.options.level -= 1
        if (this.options.level < 0) this.options.level = 0
    }
}

export abstract class Emitter {
    abstract emit(): string
}

export const utils = {
    string: {
        normal(s: string): string {
            return utils.string.singleSpace(s.trim())
        },
        singleSpace(s: string): string {
            return s.replace(/  +/g, ' ')
        },
        upperFirst(s: string): string {
            return String(s).charAt(0).toLocaleUpperCase() + String(s).slice(1);
        },
        lowerFirst(s: string): string {
            return String(s).charAt(0).toLocaleLowerCase() + String(s).slice(1);
        },
        phrase2Pascal(s: string): string {
            return utils.string.normal(s).split(" ").map(c => utils.string.upperFirst(c)).join("")
        },
        phrase2Camel(s: string): string {
            const words = utils.string.normal(s).split(" ")
            return utils.string.lowerFirst(words[0]) + utils.string.phrase2Pascal(words.splice(1).join(" "))
        },
        phrase2Snake(s: string): string {
            return utils.string.normal(s).toLocaleLowerCase().replaceAll(" ", "_")
        },
        phrase2SnakeUpper(s: string): string {
            return utils.string.normal(s).toLocaleUpperCase().replaceAll(" ", "_")
        },
        phrase2Kebab(s: string): string {
            return utils.string.normal(s).toLocaleLowerCase().replaceAll(" ", "-")
        },
        phrase2KebabUpper(s: string): string {
            return utils.string.normal(s).toLocaleUpperCase().replaceAll(" ", "-")
        }
    },
    type: {
        isDefined: (t: any): boolean => t !== 'undefined' && t !== 'null'
    },
    array: {
        append<T>(a?: T[], ...b: T[]): T[] {
            return [...(a || []), ...b]
        }
    }
}

export class EnumHelper<T extends { [k: string]: string }, S extends string> {
    private e: T

    constructor(e: T) { this.e = e }

    includes(s: S): boolean {
        return typeof s === 'string' && Object.values(this.e).includes(s);
    }

    list(): string[] {
        return Object.values(this.e)
    }

    parse(s: S): T | undefined {
        for (const [k, v] of Object.entries(this.e)) {
            if (v === s) return k as unknown as T
        }
        return undefined
    }

    parseOrThrow(s: S): T {
        const found = this.parse(s)
        if (!found) throw new Error(`unknown value: ${s}`)
        return found
    }
}
