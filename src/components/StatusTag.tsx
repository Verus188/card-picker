import { Tag } from 'antd'
import { getCardStatus } from '../lib/srs'
import type { VocabularyCard } from '../types/cards'

type StatusTagProps = {
  card: VocabularyCard
}

export function StatusTag({ card }: StatusTagProps) {
  const status = getCardStatus(card)

  if (status === 'new') return <Tag color="gold">Новая</Tag>
  if (status === 'due') return <Tag color="volcano">К повторению</Tag>
  return <Tag color="default">Позже</Tag>
}
