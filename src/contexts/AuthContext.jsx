import { useEffect, useState } from 'react'
import { observeAuth, getUserProfile } from '../api/auth'
import { AuthContext } from './useAuth'

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [userProfile, setUserProfile] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const unsubscribe = observeAuth(async (authUser) => {
            if (authUser) {
                setUser(authUser)
                try {
                    const profile = await getUserProfile(authUser.uid)
                    setUserProfile(profile)
                } catch (error) {
                    console.error('Error fetching user profile:', error)
                }
            } else {
                setUser(null)
                setUserProfile(null)
            }
            setLoading(false)
        })

        return unsubscribe
    }, [])

    const value = {
        user,
        userProfile,
        loading,
        isAuthenticated: !!user,
        isAdmin: userProfile?.role === 'admin',
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
