const utils = {
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
    }
}

export default utils
