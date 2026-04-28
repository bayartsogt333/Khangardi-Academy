import { collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from './firebase'

export const coursesCollection = () => collection(db, 'courses')
export const modulesCollection = () => collection(db, 'modules')

export const listCourses = async () => {
    const snapshot = await getDocs(query(coursesCollection(), orderBy('created_at', 'desc')))
    return snapshot.docs.map((courseDoc) => ({ id: courseDoc.id, ...courseDoc.data() }))
}

export const getCourseById = async (courseId) => {
    const snapshot = await getDoc(doc(db, 'courses', courseId))
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null
}

export const listModulesByCourseId = async (courseId) => {
    const snapshot = await getDocs(query(modulesCollection(), orderBy('order', 'asc')))
    return snapshot.docs
        .map((moduleDoc) => ({ id: moduleDoc.id, ...moduleDoc.data() }))
        .filter((moduleItem) => moduleItem.course_id === courseId)
}

export const createCourse = (courseId, payload) =>
    setDoc(doc(db, 'courses', courseId), {
        ...payload,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
    })

export const updateCourse = (courseId, payload) =>
    updateDoc(doc(db, 'courses', courseId), {
        ...payload,
        updated_at: serverTimestamp(),
    })

export const deleteCourse = (courseId) => deleteDoc(doc(db, 'courses', courseId))
