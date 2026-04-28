import {
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
} from 'firebase/auth'
import { auth, db } from './firebase'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

export const signInWithEmail = (email, password) =>
  signInWithEmailAndPassword(auth, email, password)

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider)

export const signUpWithEmail = async (email, password, displayName = '') => {
  const credential = await createUserWithEmailAndPassword(auth, email, password)

  await setDoc(doc(db, 'users', credential.user.uid), {
    uid: credential.user.uid,
    email: credential.user.email,
    display_name: displayName,
    role: 'client',
    unlocked_courses: [],
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  })

  return credential
}

export const resetPassword = (email) => sendPasswordResetEmail(auth, email)
export const logout = () => signOut(auth)
export const observeAuth = (callback) => onAuthStateChanged(auth, callback)

export const getUserProfile = async (uid) => {
  const snapshot = await getDoc(doc(db, 'users', uid))
  return snapshot.exists() ? snapshot.data() : null
}
