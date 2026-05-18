export type UserRole = 'admin' | 'user'

export type UserProfile = {
    uid: string
    displayName: string
    email: string
    role: UserRole
    photoURL?: string | null
}
