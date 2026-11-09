/*
  ТОЧКА ВХОДА — самый первый код, который запускается.

  1. Говорим Telegram "мы готовы" и разворачиваемся на весь экран.
  2. Находим <div id="root"> из index.html и "сажаем" туда React-приложение.

  StrictMode — "строгий учитель" для разработки: специально запускает
  некоторые вещи дважды, чтобы ловить ошибки. В собранной версии он
  ничего не делает и не замедляет приложение.
*/
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { initTelegram } from './lib/telegram'
import './index.css'

initTelegram()

// "!" в конце — говорим TypeScript: "элемент точно существует, не null".
// Мы уверены, потому что сами написали его в index.html.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
