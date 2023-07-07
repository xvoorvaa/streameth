import { Session, Stage, Speaker } from 'types'
import { DataConfig } from 'types/config'
import { google } from 'googleapis'
import { GetSlug } from 'utils/format'
import { datetimeToUnixTimestamp } from 'utils/dateTime'
import { promises as fs } from 'fs'
import path from 'path'
import PQueue from 'p-queue'
import { Z_UNKNOWN } from 'zlib'

/* -------------------- */

const SPEAKER_DATA_RANGE = 'D3:H'

const SESSION_DATA_RANGE = 'A3:M'

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
  let allSpeakers: Speaker[] = [];

  const data = await getDataForRange(config, 'Presentation Schedule', SPEAKER_DATA_RANGE);

  const speakerNames = [...new Set(data.flat().filter(Boolean))];

  const speakers = speakerNames.map(name => ({
    id: name,
    name,
  }));

  // @ts-ignore
  allSpeakers.push(...speakers);

  return allSpeakers;
}

function getEndTime(time: string, duration: string) {
  const [startHours, startMinutes] = time.split(':').map(Number);
  const [durationHours, durationMinutes] = duration.split(':').map(Number);

  let endHours = startHours + durationHours;
  let endMinutes = startMinutes + durationMinutes;

  if (endMinutes >= 60) {
    endHours += Math.floor(endMinutes / 60);
    endMinutes = endMinutes % 60;
  }

  const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;

  return endTime;
}

export async function getSessions(config: DataConfig): Promise<Session[]> {
  const sheetName = 'Presentation Schedule';
  const speakerData = await getSpeakers(config);
  const stageData = await GetStages(config);

  const data = await getDataForRange(config, sheetName, SESSION_DATA_RANGE);

  const sessionData = data.map((row: any) => {
    const [Time, Date, Talk, Speaker1, Speaker2, Speaker3, Speaker4, Speaker5, EM, Duration, Track, Flow, Video] = row;
    if (GetSlug(Talk) === '') return null;

    const speakers = [Speaker1, Speaker2, Speaker3, Speaker4, Speaker5]
      .map(id => id ? speakerData.find(i => i.id === id) || null : null)
      .filter(Boolean);

    const stage = stageData.find(i => i.id === GetSlug('Main Stage')) || null;

    const start = datetimeToUnixTimestamp(`${Date} ${Time}`);
    const endTime = getEndTime(Time, Duration);
    const end = datetimeToUnixTimestamp(`${Date} ${endTime}`);

    return {
      id: GetSlug(Talk),
      name: Talk,
      description: '',
      start,
      end,
      stage,
      speakers,
      video: Video ?? null,
    };
  });

  return sessionData.filter(Boolean);
}

export async function GetSchedule(config: DataConfig): Promise<Session[]> {
  const a = await getSessions(config)
  console.log(a)
  return a.filter((i) => i !== null)
}
