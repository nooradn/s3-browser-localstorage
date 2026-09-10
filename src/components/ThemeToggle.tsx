import { useEffect, useState } from 'preact/hooks'
import { MoonIcon, SunIcon } from './s3/Icons'

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const current = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
    setTheme(current)
  }, [])

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('s3browser.theme', next)
    } catch {
      /* private mode */
    }
    setTheme(next)
  }

  return (
    <button
      type="button"
      class={`btn btn-ghost icon-btn theme-toggle ${className}`}
      title={theme === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
      aria-label="Ganti tema"
      onClick={toggle}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}