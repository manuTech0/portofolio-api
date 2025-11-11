import { readFileSync } from "fs"
import { join } from "path"
import * as googleapis from "googleapis"

const json = readFileSync(join(process.cwd(), "config/credentials.json"), "utf-8")
const credentials = JSON.parse(json)

export async function createGRow({name, email, message}: { name: string; email: string; message: string; }) {
    const auth = new googleapis.google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/spreadsheets"]
    })
    const sheets = googleapis.google.sheets({
        version: "v4",
        auth
    })
    const spreadsheetsId = "1yW1mOFSugp0KD-M1lhilaiujgpD_rV-Weg4arArE1A8"
    const range = "data!A1:D1"
    return sheets.spreadsheets.values.append({
        spreadsheetId: spreadsheetsId,
        range,
        requestBody: {
            values: [[name, email, message, new Date().toISOString()]]
        },
        valueInputOption: "USER_ENTERED"
    })
}