import {ConfigController} from 'services/config'
import {Session, Stage} from 'types'

export async function GetSessions(): Promise<Session[]> {
  const event = await ConfigController.getConfig()

  if (!event.data) {
    return []
  }

  const { type, config } = event.data

  try {
    const dataModule: any = await import(`services/${type}/index`)
    return dataModule.GetSchedule(config)
  } catch (e) {
    console.error(e)
    throw new Error('Unable to get session data...')
  }
}

export async function GetSessionsForStage(stage: Stage['id']): Promise<Session[]> {
  const sessions = await GetSessions()

  return sessions.filter((i) => i.stage.id === stage)
}

export async function GetSessionById(id: string): Promise<Session | undefined> {
  const sessions = await GetSessions()
  return sessions.find((session) => session.id === id)
}
