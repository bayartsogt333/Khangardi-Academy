import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { signInWithEmail, signInWithGoogle } from '../../api/auth'

export const Login = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const navigate = useNavigate()

    const handleEmailSignIn = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            await signInWithEmail(email, password)
            navigate('/dashboard')
        } catch (err) {
            setError(err.message || 'Failed to sign in')
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleSignIn = async () => {
        setError('')
        setLoading(true)

        try {
            await signInWithGoogle()
            navigate('/dashboard')
        } catch (err) {
            setError(err.message || 'Failed to sign in with Google')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-surface px-6">
            <div className="w-full max-w-md rounded-xl border border-white/8 bg-surface-container-low p-8">
                <div className="mb-8 text-center">
                    <h1 className="text-headline-lg font-semibold text-on-surface">Welcome back</h1>
                    <p className="mt-2 text-body-sm text-on-surface-variant">Sign in to access your learning</p>
                </div>

                {error && (
                    <div className="mb-6 rounded-md border border-error bg-error-container/20 p-3 text-body-sm text-error">
                        {error}
                    </div>
                )}

                <form onSubmit={handleEmailSignIn} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="mb-2 block text-label-md text-on-surface">
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="w-full rounded-md border border-white/8 bg-surface-container px-4 py-3 text-body-md text-on-surface placeholder-on-surface-variant transition focus:border-primary-container focus:outline-none"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="mb-2 block text-label-md text-on-surface">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full rounded-md border border-white/8 bg-surface-container px-4 py-3 text-body-md text-on-surface placeholder-on-surface-variant transition focus:border-primary-container focus:outline-none"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-md bg-primary-container px-4 py-3 text-body-md font-semibold text-on-primary transition hover:bg-primary disabled:opacity-50"
                    >
                        {loading ? 'Signing in...' : 'Sign in'}
                    </button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/8" />
                    </div>
                    <div className="relative flex justify-center text-body-sm">
                        <span className="bg-surface-container-low px-2 text-on-surface-variant">Or continue with</span>
                    </div>
                </div>

                <button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full rounded-md border border-white/8 bg-surface-container px-4 py-3 text-body-md font-semibold text-on-surface transition hover:bg-surface-container-high disabled:opacity-50"
                >
                    Google
                </button>

                <p className="mt-6 text-center text-body-sm text-on-surface-variant">
                    Don't have an account?{' '}
                    <button
                        onClick={() => navigate('/signup')}
                        className="font-semibold text-primary-container transition hover:text-primary"
                    >
                        Sign up
                    </button>
                </p>
            </div>
        </div>
    )
}
