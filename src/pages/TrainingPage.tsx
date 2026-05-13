import {
  Alert,
  Button,
  Card,
  Flex,
  Progress,
  Space,
  Typography,
} from 'antd'
import { ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { reviewCard } from '../lib/srs'
import {
  createTrainingSession,
  getSessionBack,
  getSessionBackLabel,
  getSessionFront,
  getSessionFrontLabel,
} from '../lib/training'
import { useCardsStore } from '../store/useCardsStore'
import type { Rating, VocabularyCard } from '../types/cards'

const { Text, Title } = Typography

const ratingButtons: Array<{
  label: string
  rating: Rating
  type?: 'primary' | 'default'
  danger?: boolean
}> = [
  { label: 'Не помню', rating: 'again', danger: true },
  { label: 'Трудно', rating: 'hard' },
  { label: 'Хорошо', rating: 'good', type: 'primary' },
  { label: 'Легко', rating: 'easy' },
]

export function TrainingPage() {
  const navigate = useNavigate()
  const { cards, error, finishTraining, isSaving, trainingMode } = useCardsStore()
  const initialSession = useMemo(
    () => createTrainingSession(cards, trainingMode),
    [cards, trainingMode],
  )
  const [sessionCards] = useState(initialSession)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [reviewedCards, setReviewedCards] = useState<Map<string, VocabularyCard>>(
    () => new Map(),
  )
  const [localError, setLocalError] = useState<string | null>(null)

  const currentCard = sessionCards[currentIndex]
  const currentVocabularyCard = currentCard?.card
  const completed = reviewedCards.size
  const progress = sessionCards.length
    ? Math.round((completed / sessionCards.length) * 100)
    : 0

  const saveAndExit = async (nextReviewedCards = reviewedCards) => {
    const nextCards = cards.map((card) => nextReviewedCards.get(card.id) ?? card)

    try {
      await finishTraining(nextCards)
      navigate('/')
    } catch {
      setLocalError('Не удалось записать прогресс. Проверьте разрешение на файл.')
    }
  }

  const rateCard = async (rating: Rating) => {
    if (!currentCard) return

    const reviewedCard = reviewCard(currentCard.card, rating)
    const nextReviewedCards = new Map(reviewedCards)
    nextReviewedCards.set(reviewedCard.id, reviewedCard)
    setReviewedCards(nextReviewedCards)
    setFlipped(false)

    if (currentIndex + 1 >= sessionCards.length) {
      await saveAndExit(nextReviewedCards)
      return
    }

    setCurrentIndex((index) => index + 1)
  }

  if (sessionCards.length === 0) {
    return (
      <main className="page training-page">
        <Card>
          <Flex align="center" gap={16} justify="space-between" wrap="wrap">
            <div>
              <Title level={2}>Тренировка недоступна</Title>
              <Text type="secondary">Нет новых или просроченных карточек.</Text>
            </div>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')}>
              На главную
            </Button>
          </Flex>
        </Card>
      </main>
    )
  }

  return (
    <main className="page training-page">
      <section className="training-topbar">
        <Button icon={<ArrowLeftOutlined />} onClick={() => saveAndExit()} loading={isSaving}>
          Завершить тренировку
        </Button>
        <div className="training-counter">
          <Text strong>
            {completed} / {sessionCards.length}
          </Text>
          <Progress percent={progress} showInfo={false} size="small" />
        </div>
      </section>

      {error || localError ? (
        <Alert message={localError ?? error} showIcon type="error" />
      ) : null}

      <section className="trainer-stage">
        <button
          aria-label="Перевернуть карточку"
          className={`study-card ${flipped ? 'is-flipped' : ''}`}
          onClick={() => setFlipped((value) => !value)}
          type="button"
        >
          <span className="study-card-inner">
            <span className="study-card-face study-card-front">
              <Text className="card-side-label">
                {getSessionFrontLabel(currentCard)}
              </Text>
              <Title level={2}>{getSessionFront(currentCard) || ' '}</Title>
            </span>
            <span className="study-card-face study-card-back">
              <Text className="card-side-label">
                {getSessionBackLabel(currentCard)}
              </Text>
              <Title level={2}>{getSessionBack(currentCard) || ' '}</Title>
            </span>
          </span>
        </button>

        <Space className="rating-row" size="middle" wrap>
          {ratingButtons.map((button) => (
            <Button
              danger={button.danger}
              disabled={!flipped || isSaving}
              key={button.rating}
              onClick={() => rateCard(button.rating)}
              size="large"
              type={button.type}
            >
              {button.label}
            </Button>
          ))}
        </Space>

        <Text type="secondary">
          Нажмите на карточку, проверьте ответ и выберите оценку.
          {currentVocabularyCard?.translation ? '' : ' У этой карточки нет перевода.'}
        </Text>
        {completed === sessionCards.length ? (
          <Text type="success">
            <CheckCircleOutlined /> Прогресс сохраняется
          </Text>
        ) : null}
      </section>
    </main>
  )
}
