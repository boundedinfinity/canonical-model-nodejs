export class CountryCodeModel {
    name: { [code: string]: string[] }
    iso2: string
    iso3: string
    genc: string
    fips: string
}

const iso22country: { [code: string]: CountryCodeModel } = {}
const iso32country: { [code: string]: CountryCodeModel } = {}
const genc2country: { [code: string]: CountryCodeModel } = {}
const fips2country: { [code: string]: CountryCodeModel } = {}

