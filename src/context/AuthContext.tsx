import { onAuthStateChanged, type User } from 'firebase/auth'
import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react'
import {
    loginWithEmail,
    loginWithGoogle,
    logoutUser,
    loadUserProfile,
    registerWithEmail,
    sendResetLink,
} from '../api/auth'
import { auth } from '../lib/firebase'
import type { UserProfile } from '../types/auth'

type AuthContextValue = {
    user: User | null
    profile: UserProfile | null
    loading: boolean
    register: (input: { fullName: string; email: string; password: string }) => Promise<void>
    login: (email: string, password: string) => Promise<void>
    loginWithGoogle: () => Promise<void>
    resetPassword: (email: string) => Promise<void>
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser)

            if (!firebaseUser) {
                setProfile(null)
                setLoading(false)
                return
            }

            const userProfile = await loadUserProfile(firebaseUser)
            setProfile(userProfile)
            setLoading(false)
        })

        return unsubscribe
    }, [])

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            profile,
            loading,
            register: registerWithEmail,
            login: loginWithEmail,
            loginWithGoogle,
            resetPassword: sendResetLink,
            logout: logoutUser,
        }),
        [loading, profile, user],
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const context = useContext(AuthContext)

    if (!context) {
        throw new Error('useAuth must be used within AuthProvider')
    }

    return context
}
