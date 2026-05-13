import type {
  CardProgress,
  MarkdownTable,
  ParsedMarkdown,
  VocabularyCard,
} from '../types/cards'

const WORD_COLUMNS = ['word', 'english', 'term', 'front', 'en', 'слово']
const TRANSLATION_COLUMNS = [
  'translation',
  'translate',
  'meaning',
  'back',
  'russian',
  'ru',
  'перевод',
]
const PROGRESS_COLUMNS = [
  'due',
  'interval',
  'ease',
  'repetitions',
  'lapses',
  'lastReviewed',
] satisfies Array<keyof CardProgress>

const normalizeHeader = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[_\s-]+/g, '')

const splitMarkdownRow = (line: string) => {
  let source = line.trim()
  if (source.startsWith('|')) source = source.slice(1)
  if (source.endsWith('|') && !source.endsWith('\\|')) source = source.slice(0, -1)

  const cells: string[] = []
  let current = ''

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    const next = source[index + 1]

    if (char === '\\' && next) {
      current += next
      index += 1
      continue
    }

    if (char === '|') {
      cells.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  cells.push(current.trim())
  return cells
}

const isSeparatorCell = (cell: string) => /^:?-{3,}:?$/.test(cell.trim())

const isTableSeparator = (line: string) => {
  const cells = splitMarkdownRow(line)
  return cells.length > 0 && cells.every(isSeparatorCell)
}

const findColumn = (headers: string[], variants: string[]) => {
  const normalizedVariants = variants.map(normalizeHeader)
  return headers.findIndex((header) =>
    normalizedVariants.includes(normalizeHeader(header)),
  )
}

const parseNumber = (value: string | undefined) => {
  if (!value) return undefined
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

const parseProgress = (
  row: string[],
  columnMap: Partial<Record<keyof CardProgress, number>>,
): Partial<CardProgress> => {
  const due = columnMap.due === undefined ? undefined : row[columnMap.due]
  const lastReviewed =
    columnMap.lastReviewed === undefined ? undefined : row[columnMap.lastReviewed]
  const interval =
    columnMap.interval === undefined ? undefined : parseNumber(row[columnMap.interval])
  const ease = columnMap.ease === undefined ? undefined : parseNumber(row[columnMap.ease])
  const repetitions =
    columnMap.repetitions === undefined
      ? undefined
      : parseNumber(row[columnMap.repetitions])
  const lapses =
    columnMap.lapses === undefined ? undefined : parseNumber(row[columnMap.lapses])

  return {
    ...(due ? { due } : {}),
    ...(interval !== undefined ? { interval } : {}),
    ...(ease !== undefined ? { ease } : {}),
    ...(repetitions !== undefined ? { repetitions } : {}),
    ...(lapses !== undefined ? { lapses } : {}),
    ...(lastReviewed ? { lastReviewed } : {}),
  }
}

const parseTableAt = (
  lines: string[],
  startLine: number,
): MarkdownTable | null => {
  if (!lines[startLine + 1] || !isTableSeparator(lines[startLine + 1])) {
    return null
  }

  const headers = splitMarkdownRow(lines[startLine])
  const wordColumn = findColumn(headers, WORD_COLUMNS)

  if (wordColumn === -1) return null

  const rows: string[][] = []
  let lineIndex = startLine + 2

  while (lineIndex < lines.length && lines[lineIndex].includes('|')) {
    if (lines[lineIndex].trim() === '') break
    rows.push(splitMarkdownRow(lines[lineIndex]))
    lineIndex += 1
  }

  return {
    startLine,
    endLine: lineIndex - 1,
    headers,
    alignment: splitMarkdownRow(lines[startLine + 1]),
    rows,
    wordColumn,
    translationColumn: findColumn(headers, TRANSLATION_COLUMNS),
  }
}

const createCards = (table: MarkdownTable): VocabularyCard[] => {
  const columnMap = Object.fromEntries(
    PROGRESS_COLUMNS.map((column) => [
      column,
      table.headers.findIndex(
        (header) => normalizeHeader(header) === normalizeHeader(column),
      ),
    ]).filter(([, index]) => Number(index) >= 0),
  ) as Partial<Record<keyof CardProgress, number>>

  return table.rows.flatMap((row, rowIndex) => {
    const word = row[table.wordColumn]?.trim()
    if (!word) return []

    return {
      id: `${rowIndex}-${normalizeHeader(word)}`,
      sourceIndex: rowIndex,
      word,
      translation:
        table.translationColumn === null
          ? ''
          : (row[table.translationColumn]?.trim() ?? ''),
      progress: parseProgress(row, columnMap),
    }
  })
}

export const parseMarkdown = (source: string): ParsedMarkdown => {
  const lines = source.split(/\r?\n/)

  for (let lineIndex = 0; lineIndex < lines.length - 1; lineIndex += 1) {
    const table = parseTableAt(lines, lineIndex)
    if (table) {
      return {
        source,
        table,
        cards: createCards(table),
      }
    }
  }

  return {
    source,
    table: null,
    cards: [],
  }
}

const escapeCell = (value: string | number | undefined) =>
  String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\n/g, '<br>')

const getColumnIndexMap = (headers: string[]) => {
  const nextHeaders = [...headers]
  const result: Record<string, number> = {}

  for (const column of PROGRESS_COLUMNS) {
    const existingIndex = nextHeaders.findIndex(
      (header) => normalizeHeader(header) === normalizeHeader(column),
    )

    if (existingIndex >= 0) {
      result[column] = existingIndex
    } else {
      result[column] = nextHeaders.length
      nextHeaders.push(column)
    }
  }

  return { headers: nextHeaders, indexes: result as Record<keyof CardProgress, number> }
}

const formatMarkdownTable = (
  headers: string[],
  rows: string[][],
  alignment: string[],
) => {
  const normalizedRows = rows.map((row) =>
    Array.from({ length: headers.length }, (_, index) => row[index] ?? ''),
  )
  const widths = headers.map((header, index) =>
    Math.max(
      escapeCell(header).length,
      3,
      ...normalizedRows.map((row) => escapeCell(row[index]).length),
    ),
  )
  const separator = headers.map((_, index) => {
    const original = alignment[index]?.trim()
    if (original && isSeparatorCell(original)) {
      return original.padEnd(widths[index], '-')
    }
    return ''.padEnd(widths[index], '-')
  })

  const formatRow = (row: Array<string | number | undefined>) =>
    `| ${row.map((cell, index) => escapeCell(cell).padEnd(widths[index], ' ')).join(' | ')} |`

  return [formatRow(headers), formatRow(separator), ...normalizedRows.map(formatRow)]
}

export const updateMarkdownWithCards = (
  parsed: ParsedMarkdown,
  cards: VocabularyCard[],
) => {
  if (!parsed.table) return parsed.source

  const lines = parsed.source.split(/\r?\n/)
  const { headers, indexes } = getColumnIndexMap(parsed.table.headers)
  const cardBySourceIndex = new Map(cards.map((card) => [card.sourceIndex, card]))
  const rows = parsed.table.rows.map((row, rowIndex) => {
    const card = cardBySourceIndex.get(rowIndex)
    const nextRow = Array.from({ length: headers.length }, (_, index) => row[index] ?? '')

    if (!card) return nextRow

    nextRow[indexes.due] = card.progress.due ?? ''
    nextRow[indexes.interval] =
      card.progress.interval === undefined ? '' : String(card.progress.interval)
    nextRow[indexes.ease] =
      card.progress.ease === undefined ? '' : String(card.progress.ease)
    nextRow[indexes.repetitions] =
      card.progress.repetitions === undefined ? '' : String(card.progress.repetitions)
    nextRow[indexes.lapses] =
      card.progress.lapses === undefined ? '' : String(card.progress.lapses)
    nextRow[indexes.lastReviewed] = card.progress.lastReviewed ?? ''

    return nextRow
  })

  const nextTable = formatMarkdownTable(headers, rows, parsed.table.alignment)
  lines.splice(
    parsed.table.startLine,
    parsed.table.endLine - parsed.table.startLine + 1,
    ...nextTable,
  )

  return lines.join('\n')
}
