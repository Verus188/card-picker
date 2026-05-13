import { getTrainingQueue } from './srs'
import type {
  TrainingDirection,
  TrainingMode,
  TrainingSessionCard,
  VocabularyCard,
} from '../types/cards'

const getRandomDirection = (): TrainingDirection =>
  Math.random() >= 0.5 ? 'english-to-russian' : 'russian-to-english'

const getDirectionForMode = (mode: TrainingMode): TrainingDirection => {
  if (mode === 'russian') return 'russian-to-english'
  if (mode === 'random') return getRandomDirection()
  return 'english-to-russian'
}

export const createTrainingSession = (
  cards: VocabularyCard[],
  mode: TrainingMode,
): TrainingSessionCard[] =>
  getTrainingQueue(cards).map((card) => ({
    card,
    direction: getDirectionForMode(mode),
  }))

export const getSessionFront = ({ card, direction }: TrainingSessionCard) =>
  direction === 'english-to-russian' ? card.word : card.translation

export const getSessionBack = ({ card, direction }: TrainingSessionCard) =>
  direction === 'english-to-russian' ? card.translation : card.word

export const getSessionFrontLabel = ({ direction }: TrainingSessionCard) =>
  direction === 'english-to-russian' ? 'English' : 'Русский'

export const getSessionBackLabel = ({ direction }: TrainingSessionCard) =>
  direction === 'english-to-russian' ? 'Перевод' : 'English'
