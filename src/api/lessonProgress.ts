import { doc, getDoc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore'
import { db } from './firebase'

function lessonProgressRef(courseId: string, userId: string, lessonId: string) {
    return doc(db, 'courses', courseId, 'lessonProgress', userId, 'lessons', lessonId)
}

export async function loadLessonProgress(courseId: string, userId: string, lessonId: string) {
    const snapshot = await getDoc(lessonProgressRef(courseId, userId, lessonId))
    return snapshot.exists() && Boolean(snapshot.data().completed)
}

export async function markLessonComplete(courseId: string, userId: string, lessonId: string) {
    await setDoc(lessonProgressRef(courseId, userId, lessonId), {
        courseId,
        userId,
        lessonId,
        completed: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    })
}

export async function clearLessonProgress(courseId: string, userId: string, lessonId: string) {
    await deleteDoc(lessonProgressRef(courseId, userId, lessonId))
}
