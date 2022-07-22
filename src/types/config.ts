import { Session, Stage } from 'types'

export interface Config {
  [key: string]: string | boolean | number | Array<Config>
}

export type StreamTypes = 'livepeer'
export interface Stream {
  version: number
  type: StreamTypes
  stages: Stage[]
  config: Config
}

export type ScheduleTypes = 'fs' | 'pretalx'
export interface Schedule {
  version: number
  type: ScheduleTypes
  config: Config
  sessions: Session[]
}

export type ArchiveTypes = 'ipfs' | 'livepeer' | 'youtube'
export interface Archive {
  version: number
  type: ArchiveTypes
  config: Config
}