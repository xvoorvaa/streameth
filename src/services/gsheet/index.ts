import { Session, Stage, Speaker } from 'types'
import { DataConfig } from 'types/config'
import { google } from 'googleapis'
import { GetSlug } from 'utils/format'
import { datetimeToUnixTimestamp } from 'utils/dateTime'
import { promises as fs } from 'fs'
import path from 'path'
import PQueue from 'p-queue'

/* -------------------- */

const SPEAKER_SHEET = 'Speakers'
const SPEAKER_DATA_RANGE = 'B3:B'

const STAGE_SHEET = 'Stages'
const STAGE_DATA_RANGE = 'A3:D'

const SESSION_SHEET = 'Sessions'
const SESSION_DATA_RANGE = 'A3:E'

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

async function getSheetName(config: DataConfig) {
  const sheets = await connectToGoogleSheets(config)
  const sheetId = process.env.NEXT_PUBLIC_DATA_CONFIG_SHEETID as string

  const sheetsResponse = await API_QUEUE.add(() =>
    sheets.spreadsheets.get({
      spreadsheetId: sheetId,
    })
  )

  const sheetName = sheetsResponse?.data?.sheets?.map((i: any) => i.properties.title)[0]
  if (!sheetName) throw new Error('No valid sheet name found')

  return sheetName
}

async function getDataForRange(config: DataConfig, range: string): Promise<any> {
  const sheets = await connectToGoogleSheets(config)
  const sheetName = await getSheetName(config);
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
    id: GetSlug('Main Stage'),
    name: 'Main stage',
    stream: [
      {
        id: '0e577125-8b01-45bd-b058-c6f2731f73f9', // TODO: Not showing the stream
      },
    ],
  };

  return [mainStage];
}

export async function getSpeakers(config: DataConfig): Promise<Speaker[]> {
  const data = await getDataForRange(config, SPEAKER_DATA_RANGE)

  return data.map((row: any) => {
    const [ Name ] = row
    return {
      name: Name,
    }
  })
}

export async function getSessions(config: DataConfig): Promise<Session[]> {
  const data = await getDataForRange(config, SESSION_DATA_RANGE)
  const speakerData = await getSpeakers(config)
  const stageData = await GetStages(config)

  return data.map((row: any) => {
    const [Time, Speaker, Name, EM, Duration, video] = row
    if (GetSlug(Name) === '') return null

    console.log
    const speakersRaw = Speaker.map((id: string) => {
      let speaker
      console.log("Speaker")
      console.log(id)

      try {
        if (!id) return null

        if (!speaker) throw new Error(`No speaker found for id ${id}`)
      } catch (error) {
        console.log(error)
        return null
      }

      return speaker
    })
    console.log(speakersRaw)

    const speakers = speakersRaw.filter((i) => i !== null)

    let stage
    try {
      stage = stageData.find((i) => i.id === GetSlug("Main Stage"))
      if (!stage) throw new Error(`No stage found for id Main Stage`)
    } catch (error) {
      console.error(error)
      return null
    }

    let [TimeHours, TimeMinutes] = Time.split(':').map(Number);
    let [DurationHours, DurationMinutes] = Duration.split(':').map(Number);

    let startDate = new Date(2023, 6, 15, TimeHours, TimeMinutes);

    let endDate = new Date(startDate.getTime());
    endDate.setHours(endDate.getHours() + DurationHours);
    endDate.setMinutes(endDate.getMinutes() + DurationMinutes);

    let startStr = `2023-07-15 ${Time}`;
    let endStr = `2023-07-15 ${('0' + endDate.getHours()).slice(-2)}:${('0' + endDate.getMinutes()).slice(-2)}`;

    const start = datetimeToUnixTimestamp(startStr);
    const end = datetimeToUnixTimestamp(endStr);


    return {
      id: GetSlug(Name),
      name: Name,
      description: "Placeholder...", //TODO: Lil description?
      start,
      end,
      stage,
      speakers,
      video: video ?? null,
    }
  })
}

export async function GetSchedule(config: DataConfig): Promise<Session[]> {
  const a = await getSessions(config)
  console.log(a)
  return a.filter((i) => i !== null)
}
