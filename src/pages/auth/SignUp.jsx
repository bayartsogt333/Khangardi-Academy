import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { signUpWithEmail, signInWithGoogle } from '../../api/auth'

export const SignUp = () => {
    const [displayName, setDisplayName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [passwordMatch, setPasswordMatch] = useState(true)
    const navigate = useNavigate()

    const validatePasswords = (pwd, confirmPwd) => {
        return pwd === confirmPwd && pwd.length >= 6
    }

    const handlePasswordChange = (pwd, confirmPwd) => {
        if (confirmPwd && pwd !== confirmPwd) {
            setPasswordMatch(false)
        } else {
            setPasswordMatch(true)
        }
    }

    const handleEmailSignUp = async (e) => {
        e.preventDefault()
        setError('')

        if (!validatePasswords(password, confirmPassword)) {
            setError('Passwords must match and be at least 6 characters')
            return
        }

        setLoading(true)

        try {
            await signUpWithEmail(email, password, displayName)
            navigate('/dashboard')
        } catch (err) {
            setError(err.message || 'Failed to create account')
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleSignUp = async () => {
        setError('')
        setLoading(true)

        try {
            await signInWithGoogle()
            navigate('/dashboard')
        } catch (err) {
            setError(err.message || 'Failed to sign up with Google')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-surface px-6">
            <div className="w-full max-w-md rounded-xl border border-white/8 bg-surface-container-low p-8">
                <div className="mb-8 text-center">
                    <h1 className="text-headline-lg font-semibold text-on-surface">Create account</h1>
                    <p className="mt-2 text-body-sm text-on-surface-variant">Join our learning community</p>
                </div>

                {error && (
                    <div className="mb-6 rounded-md border border-error bg-error-container/20 p-3 text-body-sm text-error">
                        {error}
                    </div>
                )}

                <form onSubmit={handleEmailSignUp} className="space-y-4">
                    <div>
                        <label htmlFor="displayName" className="mb-2 block text-label-md text-on-surface">
                            Display Name
                        </label>
                        <input
                            id="displayName"
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="John Doe"
                            className="w-full rounded-md border border-white/8 bg-surface-container px-4 py-3 text-body-md text-on-surface placeholder-on-surface-variant transition focus:border-primary-container focus:outline-none"
                        />
                    </div>

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
                            onChange={(e) => {
                                setPassword(e.target.value)
                                handlePasswordChange(e.target.value, confirmPassword)
                            }}
                            placeholder="••••••••"
                            className="w-full rounded-md border border-white/8 bg-surface-container px-4 py-3 text-body-md text-on-surface placeholder-on-surface-variant transition focus:border-primary-container focus:outline-none"
                            required
                        />
                        <p className="mt-1 text-body-sm text-on-surface-variant">At least 6 characters</p>
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="mb-2 block text-label-md text-on-surface">
                            Confirm Password
                        </label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => {
                                setConfirmPassword(e.target.value)
                                handlePasswordChange(password, e.target.value)
                            }}
                            placeholder="••••••••"
                            className={`w-full rounded-md border px-4 py-3 text-body-md bg-surface-container placeholder-on-surface-variant transition focus:outline-none ${!passwordMatch && confirmPassword
                                ? 'border-error focus:border-error'
                                : 'border-white/8 focus:border-primary-container'
                                } text-on-surface`}
                            required
                        />
                        {!passwordMatch && confirmPassword && (
                            <p className="mt-1 text-body-sm text-error">Passwords do not match</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !passwordMatch}
                        className="w-full rounded-md bg-primary-container px-4 py-3 text-body-md font-semibold text-on-primary transition hover:bg-primary disabled:opacity-50"
                    >
                        {loading ? 'Creating account...' : 'Create account'}
                    </button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/8" />
                    </div>
                    <div className="relative flex justify-center text-body-sm">
                        <span className="bg-surface-container-low px-2 text-on-surface-variant">Or sign up with</span>
                    </div>
                </div>

                <button
                    onClick={handleGoogleSignUp}
                    disabled={loading}
                    className="w-full rounded-md border border-white/8 bg-surface-container px-4 py-3 text-body-md font-semibold text-on-surface transition hover:bg-surface-container-high disabled:opacity-50"
                >
                    Google
                </button>

                <p className="mt-6 text-center text-body-sm text-on-surface-variant">
                    Already have an account?{' '}
                    <button
                        onClick={() => navigate('/login')}
                        className="font-semibold text-primary-container transition hover:text-primary"
                    >
                        Sign in
                    </button>
                </p>
            </div>
        </div>
    )
}
