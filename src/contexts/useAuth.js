import { createContext, useContext } from 'react'

export const AuthContext = createContext({
    user: null,
    userProfile: null,
    loading: true,
    isAuthenticated: false,
    isAdmin: false,
})

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider')
    }
    return context
}
