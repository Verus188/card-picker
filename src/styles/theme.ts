export const palette = {
  cream: '#FDE0B8',
  orange: '#FC9A64',
  rose: '#C17C75',
  plum: '#7B515F',
  ink: '#23131E',
}

export const antdTheme = {
  token: {
    colorPrimary: palette.plum,
    colorSuccess: palette.rose,
    colorWarning: palette.orange,
    colorError: '#b84747',
    colorText: palette.ink,
    colorBgBase: '#fffaf2',
    colorBorder: 'rgba(35, 19, 30, 0.16)',
    borderRadius: 8,
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  components: {
    Button: {
      primaryShadow: 'none',
    },
    Card: {
      borderRadiusLG: 8,
    },
    Layout: {
      bodyBg: '#fffaf2',
      headerBg: '#23131E',
    },
  },
}
