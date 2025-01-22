import npath from 'node:path'
import { fromFileUrl, dirname } from "jsr:@std/path";

const __dirname = dirname(fromFileUrl(import.meta.url))
const __dataDir = npath.join(__dirname, "../specification")

export function loadData<T>(name: string): T {
    const input = npath.join(__dataDir, name)
    const data = Deno.readTextFileSync(input);
    const json: T = JSON.parse(data)
    return json
}
