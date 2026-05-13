export const palette = {
  background: '#929E91',
  backgroundLight: '#dfe5dc',
  card: '#F3E7D6',
  cardLight: '#fbf4ea',
  text: '#25302b',
  accent: '#5f3d4f',
}

export const antdTheme = {
  token: {
    colorPrimary: palette.accent,
    colorSuccess: palette.text,
    colorWarning: palette.accent,
    colorError: palette.accent,
    colorText: palette.text,
    colorTextSecondary: 'rgba(37, 48, 43, 0.68)',
    colorTextDisabled: 'rgba(37, 48, 43, 0.38)',
    colorTextLightSolid: palette.cardLight,
    colorBgBase: palette.backgroundLight,
    colorBgContainer: palette.card,
    colorBgContainerDisabled: 'rgba(243, 231, 214, 0.56)',
    colorBorder: 'rgba(37, 48, 43, 0.18)',
    colorBorderSecondary: 'rgba(37, 48, 43, 0.1)',
    borderRadius: 8,
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  components: {
    Button: {
      primaryColor: palette.cardLight,
      colorPrimaryHover: palette.text,
      colorPrimaryActive: palette.accent,
      primaryShadow: 'none',
    },
    Card: {
      borderRadiusLG: 8,
      colorBgContainer: palette.card,
    },
    Layout: {
      bodyBg: palette.backgroundLight,
      headerBg: palette.background,
    },
  },
}
