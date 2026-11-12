/*
  ЗАЩИТА ОТ БЕЛОГО ЭКРАНА

  Если в любом экране случится непредвиденная ошибка, React по умолчанию
  стирает всё приложение — пользователь видит пустой белый экран.
  ErrorBoundary ловит такую ошибку и показывает понятное сообщение
  с кнопками "Перезагрузить" и "Сбросить настройки" (на случай, если
  сломалась сохранённая на телефоне копия расписания).

  Это единственное место, где нужен классовый компонент: ловить ошибки
  отрисовки React умеет только через componentDidCatch / getDerivedStateFromError.
*/
import { Component, type ReactNode } from 'react'

interface State { failed: boolean }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: unknown): void {
    console.error(error)
  }

  private reset = () => {
    try {
      // Стираем только свои ключи (bsufk.*), чужое не трогаем.
      Object.keys(localStorage)
        // заметки не трогаем — их больше нигде нет
        .filter((key) => key.startsWith('bsufk.') && !key.startsWith('bsufk.notes.'))
        .forEach((key) => localStorage.removeItem(key))
    } catch {
      // localStorage может быть недоступен — тогда просто перезагружаем
    }
    location.reload()
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="screen center">
        <p className="empty-title">Что-то пошло не так</p>
        <p className="muted">Попробуй перезагрузить приложение. Если не поможет — сбрось настройки и выбери группу заново.</p>
        <button type="button" className="button-primary" onClick={() => location.reload()}>
          Перезагрузить
        </button>
        <button type="button" className="button-secondary" onClick={this.reset}>
          Сбросить настройки
        </button>
      </main>
    )
  }
}
