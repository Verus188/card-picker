import type { CardStatus, Rating, VocabularyCard } from '../types/cards'
import { addDays, compareDateKeys, toDateKey } from './date'

const DEFAULT_EASE = 2.5
const MIN_EASE = 1.3

const getEase = (card: VocabularyCard) => {
  const ease = Number(card.progress.ease)
  return Number.isFinite(ease) && ease >= MIN_EASE ? ease : DEFAULT_EASE
}

const getInterval = (card: VocabularyCard) => {
  const interval = Number(card.progress.interval)
  return Number.isFinite(interval) && interval > 0 ? interval : 0
}

const getRepetitions = (card: VocabularyCard) => {
  const repetitions = Number(card.progress.repetitions)
  return Number.isFinite(repetitions) && repetitions > 0 ? repetitions : 0
}

export const getCardStatus = (
  card: VocabularyCard,
  today = toDateKey(),
): CardStatus => {
  if (!card.progress.due || !card.progress.lastReviewed) return 'new'
  return card.progress.due <= today ? 'due' : 'future'
}

export const getOrderedCards = (cards: VocabularyCard[], today = toDateKey()) =>
  [...cards].sort((left, right) => {
    const leftStatus = getCardStatus(left, today)
    const rightStatus = getCardStatus(right, today)
    const statusOrder: Record<CardStatus, number> = {
      due: 0,
      new: 1,
      future: 2,
    }

    const byStatus = statusOrder[leftStatus] - statusOrder[rightStatus]
    if (byStatus !== 0) return byStatus

    const byDue = compareDateKeys(left.progress.due, right.progress.due)
    if (byDue !== 0) return byDue

    return left.sourceIndex - right.sourceIndex
  })

export const getTrainingQueue = (cards: VocabularyCard[], today = toDateKey()) =>
  getOrderedCards(cards, today).filter((card) => getCardStatus(card, today) !== 'future')

export const reviewCard = (
  card: VocabularyCard,
  rating: Rating,
  reviewDate = new Date(),
): VocabularyCard => {
  const currentEase = getEase(card)
  const currentInterval = getInterval(card)
  const repetitions = getRepetitions(card)
  const lapses = Number(card.progress.lapses) || 0

  let nextEase = currentEase
  let nextInterval = 1
  let nextRepetitions = repetitions + 1
  let nextLapses = lapses

  if (rating === 'again') {
    nextEase = Math.max(MIN_EASE, currentEase - 0.2)
    nextInterval = 1
    nextRepetitions = 0
    nextLapses = lapses + 1
  }

  if (rating === 'hard') {
    nextEase = Math.max(MIN_EASE, currentEase - 0.15)
    nextInterval = Math.max(1, Math.ceil(currentInterval * 1.2))
  }

  if (rating === 'good') {
    if (repetitions === 0) nextInterval = 1
    else if (repetitions === 1) nextInterval = 3
    else nextInterval = Math.max(1, Math.round(currentInterval * currentEase))
  }

  if (rating === 'easy') {
    nextEase = currentEase + 0.15
    nextInterval =
      repetitions === 0
        ? 4
        : Math.max(2, Math.round(currentInterval * currentEase * 1.3))
  }

  return {
    ...card,
    progress: {
      ...card.progress,
      due: toDateKey(addDays(reviewDate, nextInterval)),
      interval: nextInterval,
      ease: Number(nextEase.toFixed(2)),
      repetitions: nextRepetitions,
      lapses: nextLapses,
      lastReviewed: toDateKey(reviewDate),
    },
  }
}
