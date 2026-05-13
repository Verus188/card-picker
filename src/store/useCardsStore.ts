import { create } from 'zustand'
import {
  chooseMarkdownFile,
  clearFileHandle,
  getDroppedMarkdownFileHandle,
  isFileSystemAccessSupported,
  loadFileHandle,
  readMarkdownFile,
  toUserFriendlyFileError,
  writeMarkdownFile,
} from '../lib/fileAccess'
import { parseMarkdown, updateMarkdownWithCards } from '../lib/markdown'
import type { ParsedMarkdown, TrainingMode, VocabularyCard } from '../types/cards'

const TRAINING_MODE_KEY = 'wordTrainerTrainingMode'

const getStoredTrainingMode = (): TrainingMode => {
  if (typeof window === 'undefined') return 'english'

  const value = localStorage.getItem(TRAINING_MODE_KEY)
  if (value === 'english' || value === 'random' || value === 'russian') {
    return value
  }

  return 'english'
}

type CardsState = {
  cards: VocabularyCard[]
  error: string | null
  fileHandle: FileSystemFileHandle | null
  fileName: string | null
  isHydrated: boolean
  isLoading: boolean
  isSaving: boolean
  lastSyncedAt: string | null
  parsedMarkdown: ParsedMarkdown | null
  trainingMode: TrainingMode
  chooseFile: () => Promise<void>
  clearFile: () => Promise<void>
  dropFile: (dataTransfer: DataTransfer) => Promise<void>
  finishTraining: (updatedCards: VocabularyCard[]) => Promise<void>
  hydrate: () => Promise<void>
  setTrainingMode: (trainingMode: TrainingMode) => void
  syncFromFile: () => Promise<void>
}

export const useCardsStore = create<CardsState>((set, get) => ({
  cards: [],
  error: null,
  fileHandle: null,
  fileName: null,
  isHydrated: false,
  isLoading: false,
  isSaving: false,
  lastSyncedAt: null,
  parsedMarkdown: null,
  trainingMode: getStoredTrainingMode(),

  hydrate: async () => {
    if (!isFileSystemAccessSupported()) {
      set({
        isHydrated: true,
        error: 'File System Access API доступен в Chrome, Edge и Opera.',
      })
      return
    }

    try {
      const handle = await loadFileHandle()
      set({
        fileHandle: handle ?? null,
        fileName: handle?.name ?? null,
        isHydrated: true,
      })
    } catch (error) {
      set({
        error: toUserFriendlyFileError(error),
        isHydrated: true,
      })
    }
  },

  chooseFile: async () => {
    set({ error: null, isLoading: true })

    try {
      const handle = await chooseMarkdownFile()
      const source = await readMarkdownFile(handle)
      const parsedMarkdown = parseMarkdown(source)

      set({
        cards: parsedMarkdown.cards,
        error: null,
        fileHandle: handle,
        fileName: handle.name,
        isLoading: false,
        lastSyncedAt: new Date().toISOString(),
        parsedMarkdown,
      })
    } catch (error) {
      set({
        error: toUserFriendlyFileError(error),
        isLoading: false,
      })
    }
  },

  dropFile: async (dataTransfer) => {
    set({ error: null, isLoading: true })

    try {
      const handle = await getDroppedMarkdownFileHandle(dataTransfer)
      const source = await readMarkdownFile(handle)
      const parsedMarkdown = parseMarkdown(source)

      set({
        cards: parsedMarkdown.cards,
        error: null,
        fileHandle: handle,
        fileName: handle.name,
        isLoading: false,
        lastSyncedAt: new Date().toISOString(),
        parsedMarkdown,
      })
    } catch (error) {
      set({
        error: toUserFriendlyFileError(error),
        isLoading: false,
      })
    }
  },

  syncFromFile: async () => {
    set({ error: null, isLoading: true })

    try {
      const handle = get().fileHandle ?? (await loadFileHandle())
      if (!handle) {
        throw new Error('Сначала выберите markdown-файл.')
      }

      const source = await readMarkdownFile(handle)
      const parsedMarkdown = parseMarkdown(source)

      set({
        cards: parsedMarkdown.cards,
        error: null,
        fileHandle: handle,
        fileName: handle.name,
        isLoading: false,
        lastSyncedAt: new Date().toISOString(),
        parsedMarkdown,
      })
    } catch (error) {
      set({
        error: toUserFriendlyFileError(error),
        isLoading: false,
      })
    }
  },

  finishTraining: async (updatedCards) => {
    set({ error: null, isSaving: true })

    try {
      const { fileHandle, parsedMarkdown } = get()
      if (!fileHandle) throw new Error('Markdown-файл не выбран.')
      if (!parsedMarkdown?.table) {
        throw new Error('В файле не найдена markdown-таблица с колонкой word, english или term.')
      }

      const nextSource = updateMarkdownWithCards(parsedMarkdown, updatedCards)
      await writeMarkdownFile(fileHandle, nextSource)

      const nextParsedMarkdown = parseMarkdown(nextSource)
      set({
        cards: nextParsedMarkdown.cards,
        error: null,
        isSaving: false,
        lastSyncedAt: new Date().toISOString(),
        parsedMarkdown: nextParsedMarkdown,
      })
    } catch (error) {
      set({
        error: toUserFriendlyFileError(error),
        isSaving: false,
      })
      throw error
    }
  },

  clearFile: async () => {
    set({ error: null, isLoading: true })

    try {
      await clearFileHandle()
      set({
        cards: [],
        error: null,
        fileHandle: null,
        fileName: null,
        isLoading: false,
        lastSyncedAt: null,
        parsedMarkdown: null,
      })
    } catch (error) {
      set({
        error: toUserFriendlyFileError(error),
        isLoading: false,
      })
    }
  },

  setTrainingMode: (trainingMode) => {
    localStorage.setItem(TRAINING_MODE_KEY, trainingMode)
    set({ trainingMode })
  },
}))
