import {
    GoogleAuthProvider,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    updateProfile,
    type User,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import type { UserProfile, UserRole } from '../types/auth'

function isUnauthorizedDomainError(error: unknown) {
    return error instanceof Error && error.message.includes('auth/unauthorized-domain')
}

export type RegisterInput = {
    fullName: string
    email: string
    password: string
}

export async function upsertUserProfile(firebaseUser: User) {
    const profileRef = doc(db, 'users', firebaseUser.uid)
    const existingProfile = await getDoc(profileRef)

    if (!existingProfile.exists()) {
        await setDoc(profileRef, {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName?.trim() || 'Khangardi member',
            email: firebaseUser.email ?? '',
            role: 'user' as UserRole,
            photoURL: firebaseUser.photoURL ?? null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            provider: firebaseUser.providerData[0]?.providerId ?? 'password',
        })
        return
    }

    const existingData = existingProfile.data()
    const role = (existingData.role as UserRole | undefined) ?? 'user'

    await setDoc(
        profileRef,
        {
            uid: firebaseUser.uid,
            displayName:
                firebaseUser.displayName?.trim() || existingData.displayName || 'Khangardi member',
            email: firebaseUser.email ?? existingData.email ?? '',
            role,
            photoURL: firebaseUser.photoURL ?? existingData.photoURL ?? null,
            updatedAt: serverTimestamp(),
            provider: firebaseUser.providerData[0]?.providerId ?? existingData.provider ?? 'password',
        },
        { merge: true },
    )
}

export async function loadUserProfile(firebaseUser: User): Promise<UserProfile> {
    const profileRef = doc(db, 'users', firebaseUser.uid)
    const profileSnapshot = await getDoc(profileRef)

    if (!profileSnapshot.exists()) {
        await upsertUserProfile(firebaseUser)
        return {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName?.trim() || 'Khangardi member',
            email: firebaseUser.email ?? '',
            role: 'user' as UserRole,
            photoURL: firebaseUser.photoURL ?? null,
        }
    }

    const data = profileSnapshot.data()

    return {
        uid: firebaseUser.uid,
        displayName: data.displayName || firebaseUser.displayName?.trim() || 'Khangardi member',
        email: data.email || firebaseUser.email || '',
        role: (data.role as UserRole | undefined) ?? 'user',
        photoURL: data.photoURL ?? firebaseUser.photoURL ?? null,
    }
}

export async function registerWithEmail({ fullName, email, password }: RegisterInput) {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(credential.user, { displayName: fullName.trim() })

    const refreshedUser = auth.currentUser
    if (refreshedUser) {
        await upsertUserProfile(refreshedUser)
    }
}

export async function loginWithEmail(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password)
}

export async function loginWithGoogle() {
    const provider = new GoogleAuthProvider()
    try {
        await signInWithPopup(auth, provider)
    } catch (error) {
        if (isUnauthorizedDomainError(error)) {
            throw new Error(
                'This domain is not authorized for Firebase Auth. Add the hosting domain to Firebase Console -> Authentication -> Settings -> Authorized domains.',
            )
        }

        throw error
    }

    const refreshedUser = auth.currentUser
    if (refreshedUser) {
        await upsertUserProfile(refreshedUser)
    }
}

export async function sendResetLink(email: string) {
    await sendPasswordResetEmail(auth, email)
}

export async function logoutUser() {
    await signOut(auth)
}
