import React from 'react'
import { Stage } from 'types'
import styles from './FilterNavigation.module.scss'
interface Props {
  stages: Stage['name'][]
  days: number[]
  onStageSelect: (stage: string) => void
  onDaySelect: (day: string) => void
}

function FilterNavigationItem({ title, items, onItemSelect }: { title: string; items: string[] | number[]; onItemSelect: (item: string) => void }) {
  return (
    <div className={styles.filterNavigation__item}>
      <div className={styles.filterNavigation__item__title}>{title}</div>
      <div className={styles.filterNavigation__item__list}>
        {items?.map((item, index) => (
          <div key={index} className={styles.filterNavigation__item__list__item} onClick={() => onItemSelect(item.toString())}>
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function FilterNavigation(props: Props) {
  return (
    <div className={styles.filterNavigation}>
      <div className={styles.filterNavigation__header}>Schedule</div>
      <div>
        <FilterNavigationItem title="Stages" items={props.stages} onItemSelect={props.onStageSelect} />
        <FilterNavigationItem title="Days" items={props.days} onItemSelect={props.onDaySelect} />
      </div>
    </div>
  )
}