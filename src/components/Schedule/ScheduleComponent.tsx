import React, { useEffect } from 'react'
import SessionSnack from 'components/Session/Snack'
import { useSessions } from 'hooks/useSessions'
import { useStages } from 'hooks/useStages'
import { PageContainer } from 'components/Container'
import ScheduleStrip from './ScheduleStrip'

export default function ScheduleComponent() {
  const { sessions, addOrUpdateFilter, filters, possibleFilters, removeFilter } = useSessions()
  const [isLoading, setIsLoading] = React.useState(true)
  const stages = useStages()
  useEffect(() => {
    setIsLoading(false)
  }, [])
  console.log(stages)
  return (
    <PageContainer>
      <div className="flex flex-col h-full relative">
        {sessions.length === 0 && !isLoading && (
          <div className="px-8 m-auto flex h-full w-full">
            <p className="m-auto">No sessions have been uploaded yet</p>
          </div>
        )}

        <div className="flex flex-col">
          {stages.map((stage) => (
            <ScheduleStrip key={stage.name} stage={stage} />
          ))}
        </div>
      </div>
    </PageContainer>
  )
}
