import { Session, Stage, Speaker } from 'types'
import { DataConfig } from 'types/config'
import { google } from 'googleapis'
import { GetSlug } from 'utils/format'
import { datetimeToUnixTimestamp } from 'utils/dateTime'
import { promises as fs } from 'fs'
import path from 'path'
import PQueue from 'p-queue'

/* -------------------- */

const SPEAKER_DATA_RANGE = 'B3:F'

const SESSION_DATA_RANGE = 'A3:K'

/* -------------------- */

const API_QUEUE = new PQueue({ concurrency: 1, interval: 1500 })

/* -------------------- */

async function createLocalJsonCache(data: any, filename: string) {
  const cachePath = path.join(process.cwd(), 'cache')
  await fs.mkdir(cachePath, { recursive: true })
  await fs.writeFile(path.join(cachePath, `${filename}.json`), JSON.stringify(data))
}

async function connectToGoogleSheets(config: DataConfig) {
  if (!process.env.NEXT_PUBLIC_DATA_CONFIG_SHEETID) throw new Error('No valid sheetId set for gsheet module')
  if (!process.env.GOOGLE_API_KEY) throw new Error("gsheet module requires a valid 'GOOGLE_API_KEY' env variable")

  const sheets = google.sheets({
    version: 'v4',
    auth: process.env.GOOGLE_API_KEY,
  })

  return sheets
}

async function getSheetNames(config: DataConfig) {
  const sheets = await connectToGoogleSheets(config)
  const sheetId = process.env.NEXT_PUBLIC_DATA_CONFIG_SHEETID as string

  const sheetsResponse = await API_QUEUE.add(() =>
    sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    })
  )

  const sheetNames = sheetsResponse?.data?.sheets?.map((i: any) => i.properties.title)
  if (!sheetNames || sheetNames.length === 0) throw new Error('No valid sheet names found')

  return sheetNames
}

async function getDataForRange(config: DataConfig, sheetName: string, range: string): Promise<any> {
  const sheets = await connectToGoogleSheets(config)
  const sheetId = process.env.NEXT_PUBLIC_DATA_CONFIG_SHEETID as string

  const response = (await API_QUEUE.add(() =>
    sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!${range}`,
    })
  )) as any

  const rows = response.data.values
  if (!rows) return []

  await createLocalJsonCache(rows, range)
  return rows
}

export async function GetStages(config: DataConfig): Promise<Stage[]> {
  const mainStage: Stage = {
    id: GetSlug('main-stage'),
    name: 'Main stage',
    stream: [
      {
        id: '0e577125-8b01-45bd-b058-c6f2731f73f9', // TODO: API Token
      },
    ],
  }

  return [mainStage]
}

export async function getSpeakers(config: DataConfig): Promise<Speaker[]> {
  const sheetNames = await getSheetNames(config);
  
  let allSpeakers: Speaker[] = [];

  for (const sheetName of sheetNames) {
    if (sheetName === 'Presentation Schedule - 15 July' || sheetName === 'Presentation Schedule - 16 July') { 
      const data = await getDataForRange(config, sheetName, SPEAKER_DATA_RANGE);
      
      const speakerNames = [...new Set(data.flat().filter(Boolean))];

      const speakers = speakerNames.map(name => ({
        id: name,
        name,
      }));

      // @ts-ignore
      allSpeakers.push(...speakers);
    }
  }

  return allSpeakers;
}

export async function getSessions(config: DataConfig): Promise<Session[]> {
  const sheetNames = await getSheetNames(config)
  const speakerData = await getSpeakers(config)
  const stageData = await GetStages(config)

  const sessions: Session[] = []

  for (const sheetName of sheetNames) {
    if (sheetName.includes('Presentation Schedule')) {
      const data = await getDataForRange(config, sheetName, SESSION_DATA_RANGE)

      const dateString = sheetName.replace('Presentation Schedule - ', '')
      const date = new Date(`2023 ${dateString}`)

      const sessionData = data.map((row: any) => {
        const [Time, Speaker1, Speaker2, Speaker3, Speaker4, Speaker5, Talk, EM, Duration, video] = row
        if (GetSlug(Talk) === '') return null

        const speakersRaw = [Speaker1, Speaker2, Speaker3, Speaker4, Speaker5].map((id: string) => {
          let speaker

          try {
            if (!id) return null

            speaker = speakerData.find((i) => {
              return i.id === id
            })
            if (!speaker) throw new Error(`No speaker found for id ${id}`)
          } catch (error) {
            console.log(error)
            return null
          }

          return speaker
        })

        const speakers = speakersRaw.filter((i) => i !== null)

        let stage
        try {
          stage = stageData.find((i) => i.id === GetSlug('Main Stage'))
          if (!stage) throw new Error(`No stage found for id Main Stage`)
        } catch (error) {
          console.error(error)
          return null
        }

        let [TimeHours, TimeMinutes] = Time.split(':').map(Number)
        let [DurationHours, DurationMinutes] = Duration.split(':').map(Number)

        let startDate = new Date(date.getTime())
        startDate.setHours(TimeHours, TimeMinutes)

        let endDate = new Date(startDate.getTime())
        endDate.setHours(endDate.getHours() + DurationHours)
        endDate.setMinutes(endDate.getMinutes() + DurationMinutes)

        let startStr = `${date.getFullYear()}-${('0' + (date.getMonth()+1)).slice(-2)}-${('0' + date.getDate()).slice(-2)} ${Time}`
        let endStr = `${date.getFullYear()}-${('0' + (date.getMonth()+1)).slice(-2)}-${('0' + date.getDate()).slice(-2)} ${('0' + endDate.getHours()).slice(-2)}:${('0' + endDate.getMinutes()).slice(-2)}`

        const start = datetimeToUnixTimestamp(startStr)
        const end = datetimeToUnixTimestamp(endStr)

        return {
          id: GetSlug(Talk),
          name: Talk,
          description: 'Placeholder...', //TODO: Lil description?
          start,
          end,
          stage,
          speakers,
          video: video ?? null,
        }
      })

      sessions.push(...sessionData.filter(i => i !== null))
    }
  }

  return sessions
}

export async function GetSchedule(config: DataConfig): Promise<Session[]> {
  const a = await getSessions(config)
  console.log(a)
  return a.filter((i) => i !== null)
}
