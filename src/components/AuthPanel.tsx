import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'

type Mode = 'login' | 'register'

type FormState = {
    fullName: string
    email: string
    password: string
}

const emptyForm: FormState = {
    fullName: '',
    email: '',
    password: '',
}

export function AuthPanel() {
    const { login, loginWithGoogle, register, resetPassword } = useAuth()
    const [mode, setMode] = useState<Mode>('login')
    const [form, setForm] = useState<FormState>(emptyForm)
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    const title = useMemo(() => (mode === 'login' ? 'Нэвтрэх' : 'Бүртгүүлэх'), [mode])

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setError('')
        setMessage('')
        setBusy(true)

        try {
            if (mode === 'login') {
                await login(form.email, form.password)
                setMessage('Амжилттай нэвтэрлээ.')
            } else {
                await register(form)
                setMessage('Бүртгэл үүслээ. Систем таны профайлыг бэлтгэж байна.')
            }
            setForm(emptyForm)
        } catch (error) {
            const authError = error as { message?: string }
            setError(authError.message || 'Үйлдэл амжилтгүй боллоо.')
        } finally {
            setBusy(false)
        }
    }

    async function handleGoogleLogin() {
        setError('')
        setMessage('')
        setBusy(true)

        try {
            await loginWithGoogle()
            setMessage('Google-ээр амжилттай нэвтэрлээ.')
        } catch (error) {
            const authError = error as { message?: string }
            setError(authError.message || 'Google нэвтрэлт амжилтгүй боллоо.')
        } finally {
            setBusy(false)
        }
    }

    async function handleResetPassword() {
        if (!form.email.trim()) {
            setError('Имэйлээ эхлээд оруулна уу.')
            return
        }

        setError('')
        setMessage('')
        setBusy(true)

        try {
            await resetPassword(form.email)
            setMessage('Нууц үг сэргээх холбоос илгээгдлээ.')
        } catch (error) {
            const authError = error as { message?: string }
            setError(authError.message || 'Нууц үг сэргээх хүсэлт амжилтгүй боллоо.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <section className="auth-shell">
            <div className="auth-card">
                <div className="auth-card__header">
                    <div className="auth-card__brand">
                        <span className="eyebrow">Khangardi Academy</span>
                        <h2>{title}</h2>
                    </div>
                    <div className="mode-switch" role="tablist" aria-label="Нэвтрэх горим">
                        <button
                            type="button"
                            className={mode === 'login' ? 'active' : ''}
                            onClick={() => {
                                setMode('login')
                                setError('')
                                setMessage('')
                            }}
                        >
                            Нэвтрэх
                        </button>
                        <button
                            type="button"
                            className={mode === 'register' ? 'active' : ''}
                            onClick={() => {
                                setMode('register')
                                setError('')
                                setMessage('')
                            }}
                        >
                            Бүртгүүлэх
                        </button>
                    </div>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {mode === 'register' && (
                        <label>
                            <span>Нэр</span>
                            <input
                                value={form.fullName}
                                onChange={(event) =>
                                    setForm((current) => ({ ...current, fullName: event.target.value }))
                                }
                                type="text"
                                placeholder="Бат-Эрдэнэ"
                                autoComplete="name"
                                required
                            />
                        </label>
                    )}

                    <label>
                        <span>Имэйл</span>
                        <input
                            value={form.email}
                            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                            type="email"
                            placeholder="name@example.com"
                            autoComplete="email"
                            required
                        />
                    </label>

                    <label>
                        <span>Нууц үг</span>
                        <input
                            value={form.password}
                            onChange={(event) =>
                                setForm((current) => ({ ...current, password: event.target.value }))
                            }
                            type="password"
                            placeholder="••••••••"
                            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                            minLength={6}
                            required
                        />
                    </label>

                    {error ? <p className="form-feedback form-feedback--error">{error}</p> : null}
                    {message ? <p className="form-feedback form-feedback--success">{message}</p> : null}

                    <button type="submit" className="primary-button" disabled={busy}>
                        {busy ? 'Түр хүлээнэ үү...' : mode === 'login' ? 'Нэвтрэх' : 'Бүртгүүлэх'}
                    </button>

                    <button
                        type="button"
                        className="secondary-button"
                        onClick={handleGoogleLogin}
                        disabled={busy}
                    >
                        Google-ээр үргэлжлүүлэх
                    </button>

                    <button type="button" className="link-button" onClick={handleResetPassword} disabled={busy}>
                        Нууц үг сэргээх
                    </button>
                </form>
            </div>
        </section>
    )
}
