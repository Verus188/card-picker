import { App as AntdApp, ConfigProvider, Layout } from 'antd'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { TrainingPage } from './pages/TrainingPage'
import { antdTheme } from './styles/theme'
import './App.css'

function App() {
  return (
    <ConfigProvider theme={antdTheme}>
      <AntdApp>
        <BrowserRouter>
          <Layout className="app-shell">
            <Routes>
              <Route element={<HomePage />} path="/" />
              <Route element={<TrainingPage />} path="/training" />
            </Routes>
          </Layout>
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  )
}

export default App
