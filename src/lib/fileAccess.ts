const DB_NAME = 'word-trainer-files'
const STORE_NAME = 'handles'
const ACTIVE_FILE_KEY = 'activeMarkdownFile'

const isDomException = (error: unknown, name: string) =>
  error instanceof DOMException && error.name === name

const isMarkdownFileName = (fileName: string) => {
  const normalizedName = fileName.toLowerCase()
  return normalizedName.endsWith('.md') || normalizedName.endsWith('.markdown')
}

const assertMarkdownFile = (handle: FileSystemFileHandle) => {
  if (!isMarkdownFileName(handle.name)) {
    throw new Error('Выберите файл с расширением .md или .markdown.')
  }
}

export const isFileSystemAccessSupported = () =>
  typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function'

const openDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

const withStore = async <T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
) => {
  const database = await openDatabase()

  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode)
    const request = action(transaction.objectStore(STORE_NAME))

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => database.close()
    transaction.onerror = () => {
      database.close()
      reject(transaction.error)
    }
  })
}

export const saveFileHandle = (handle: FileSystemFileHandle) =>
  withStore('readwrite', (store) => store.put(handle, ACTIVE_FILE_KEY))

export const loadFileHandle = () =>
  withStore<FileSystemFileHandle | undefined>('readonly', (store) =>
    store.get(ACTIVE_FILE_KEY),
  )

export const clearFileHandle = () =>
  withStore('readwrite', (store) => store.delete(ACTIVE_FILE_KEY))

export const chooseMarkdownFile = async () => {
  if (!window.showOpenFilePicker) {
    throw new Error('File System Access API доступен только в Chromium-браузерах.')
  }

  const [handle] = await window.showOpenFilePicker({
    multiple: false,
    excludeAcceptAllOption: false,
    types: [
      {
        description: 'Markdown',
        accept: {
          'text/markdown': ['.md', '.markdown'],
          'text/plain': ['.md'],
        },
      },
    ],
  })

  if (!handle) throw new Error('Файл не выбран.')
  assertMarkdownFile(handle)
  await saveFileHandle(handle)
  return handle
}

export const getDroppedMarkdownFileHandle = async (
  dataTransfer: DataTransfer,
) => {
  const fileItem = Array.from(dataTransfer.items).find(
    (item) => item.kind === 'file',
  )

  if (!fileItem) {
    throw new Error('Перетащите markdown-файл.')
  }

  if (!fileItem.getAsFileSystemHandle) {
    throw new Error(
      'Браузер не передал постоянный доступ к файлу. Используйте кнопку выбора .md файла.',
    )
  }

  const handle = await fileItem.getAsFileSystemHandle()
  if (!handle) throw new Error('Не удалось получить доступ к файлу.')
  if (handle.kind !== 'file') throw new Error('Перетащите markdown-файл, а не папку.')

  const fileHandle = handle as FileSystemFileHandle
  assertMarkdownFile(fileHandle)
  await saveFileHandle(fileHandle)

  return fileHandle
}

export const ensureFilePermission = async (
  handle: FileSystemFileHandle,
  mode: FileSystemPermissionMode,
) => {
  const options = { mode }
  const currentPermission = await handle.queryPermission(options)
  if (currentPermission === 'granted') return true

  const requestedPermission = await handle.requestPermission(options)
  return requestedPermission === 'granted'
}

export const readMarkdownFile = async (handle: FileSystemFileHandle) => {
  const hasPermission = await ensureFilePermission(handle, 'read')
  if (!hasPermission) {
    throw new Error('Браузер не дал доступ на чтение файла.')
  }

  const file = await handle.getFile()
  return file.text()
}

export const writeMarkdownFile = async (
  handle: FileSystemFileHandle,
  content: string,
) => {
  const hasPermission = await ensureFilePermission(handle, 'readwrite')
  if (!hasPermission) {
    throw new Error('Браузер не дал доступ на запись в файл.')
  }

  const writable = await handle.createWritable()
  await writable.write(content)
  await writable.close()
}

export const toUserFriendlyFileError = (error: unknown) => {
  if (isDomException(error, 'AbortError')) return 'Выбор файла отменен.'
  if (isDomException(error, 'NotAllowedError')) {
    return 'Нет разрешения на доступ к файлу. Выберите файл заново или подтвердите доступ в диалоге браузера.'
  }
  if (error instanceof Error) return error.message
  return 'Не удалось выполнить операцию с файлом.'
}
