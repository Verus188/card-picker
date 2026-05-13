export const MARKDOWN_TEMPLATE = `# English vocabulary

| word | translation |
| ---- | ----------- |
|  |  |
`

export const downloadMarkdownTemplate = () => {
  const blob = new Blob([MARKDOWN_TEMPLATE], {
    type: 'text/markdown;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = 'english-vocabulary-template.md'
  link.click()
  URL.revokeObjectURL(url)
}
