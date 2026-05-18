import { collection, getDocs } from 'firebase/firestore'
import { db } from './firebase'
import type { UserProfile } from '../types/auth'

export async function loadAllUsers(): Promise<UserProfile[]> {
    const snapshot = await getDocs(collection(db, 'users'))

    return snapshot.docs.map((item) => {
        const data = item.data() as Partial<UserProfile>
        return {
            uid: data.uid ?? item.id,
            displayName: data.displayName ?? 'Khangardi member',
            email: data.email ?? '',
            role: data.role ?? 'user',
            photoURL: data.photoURL ?? null,
        }
    })
}
