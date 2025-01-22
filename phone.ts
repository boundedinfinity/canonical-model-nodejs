import { WithIdAndLabelsModel } from './common.ts'

// https://blog.insycle.com/phone-number-formatting-crm
// https://en.wikipedia.org/wiki/North_American_Numbering_Plan


export enum NanpNumberFormat {
    None = "none",
    ParenthesesAndDash = "parentheses-and-dash",
    Spaces = "spaces",
    Dashes = "dashes",
    Dots = "dots"
}

export class NanpNumber extends WithIdAndLabelsModel {
    format?: NanpNumberFormat
    countryCode?: number
    areaCode: number = 0
    prefix: number = 0
    lineNumber: number = 0

    override toString(): string {
        return this.toFormat(this.format || NanpNumberFormat.None)
    }

    toFormat(format: NanpNumberFormat): string {
        let number: string

        switch (format) {
            case NanpNumberFormat.Dashes:
                number = `${this.areaCode}-${this.prefix}-${this.lineNumber}`
                break
            case NanpNumberFormat.Dots:
                number = `${this.areaCode}.${this.prefix}.${this.lineNumber}`
                break
            case NanpNumberFormat.ParenthesesAndDash:
                number = `(${this.areaCode}) ${this.prefix}-${this.lineNumber}`
                break
            case NanpNumberFormat.Spaces:
                number = `${this.areaCode} ${this.prefix} ${this.lineNumber}`
                break
            case NanpNumberFormat.None:
            default:
                number = `${this.areaCode}${this.prefix}${this.lineNumber}`
        }

        if (this.countryCode) {
            number = `+${this.countryCode} ${number}`
        }

        return number
    }
}

// https://en.wikipedia.org/wiki/List_of_country_calling_codes
interface CountryCallingCode {
    code: number
    territoryOrUse?: string[]
}

const countryCodes: CountryCallingCode[] = [
    {
        code: 1,
        territoryOrUse: [
            'United States',
            'Canada',
            'United States Virgin Islands',
            'Northern Mariana Islands',
            'Guam',
            'American Samoa',
            'Puerto Rico',
            'Bahamas',
            'Barbados',
            'Anguilla',
            'Antigua and Barbuda',
            'British Virgin Islands',
        ]
    }
]

const countryCodeMap: { [code: number]: NanpAreaCode } = {}
countryCodes.forEach(code => countryCodeMap[code.code] = code)

// https://en.wikipedia.org/wiki/List_of_North_American_Numbering_Plan_area_codes
interface NanpAreaCode {
    code: number
    territoryOrUse?: string[]
    year?: number
}

const areaCodes: NanpAreaCode[] = [
    {
        code: 200,
        territoryOrUse: ['not in use; available for non-geographic assignment'],
    },
    {
        code: 201,
        territoryOrUse: ['New Jersey (Bergen County and Hudson County)'],
        year: 1947,
    }
]

const areaCodeMap: { [code: number]: NanpAreaCode } = {}
areaCodes.forEach(code => areaCodeMap[code.code] = code)
