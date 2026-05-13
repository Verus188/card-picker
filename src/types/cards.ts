export type CardProgress = {
  due: string
  interval: number
  ease: number
  repetitions: number
  lapses: number
  lastReviewed: string
}

export type VocabularyCard = {
  id: string
  sourceIndex: number
  word: string
  translation: string
  progress: Partial<CardProgress>
}

export type Rating = 'again' | 'hard' | 'good' | 'easy'

export type CardStatus = 'new' | 'due' | 'future'

export type TrainingMode = 'english' | 'random' | 'russian'

export type TrainingDirection = 'english-to-russian' | 'russian-to-english'

export type TrainingSessionCard = {
  card: VocabularyCard
  direction: TrainingDirection
}

export type MarkdownTable = {
  startLine: number
  endLine: number
  headers: string[]
  alignment: string[]
  rows: string[][]
  wordColumn: number
  translationColumn: number | null
}

export type ParsedMarkdown = {
  source: string
  table: MarkdownTable | null
  cards: VocabularyCard[]
}
