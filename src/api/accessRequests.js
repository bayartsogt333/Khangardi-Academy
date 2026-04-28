import { collection, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where, writeBatch, arrayUnion } from 'firebase/firestore'
import { db } from './firebase'

export const accessRequestsCollection = () => collection(db, 'access_requests')

export const createAccessRequest = async ({ userId, courseId, note = '' }) => {
    const requestRef = doc(accessRequestsCollection())

    await setDoc(requestRef, {
        id: requestRef.id,
        user_id: userId,
        course_id: courseId,
        note,
        status: 'pending',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
    })

    return requestRef.id
}

export const listPendingRequests = async () => {
    const snapshot = await getDocs(query(accessRequestsCollection(), where('status', '==', 'pending')))
    return snapshot.docs.map((requestDoc) => ({ id: requestDoc.id, ...requestDoc.data() }))
}

export const approveAccessRequest = async ({ requestId, userId, courseId }) => {
    const batch = writeBatch(db)
    batch.update(doc(db, 'access_requests', requestId), {
        status: 'approved',
        updated_at: serverTimestamp(),
    })
    batch.update(doc(db, 'users', userId), {
        unlocked_courses: arrayUnion(courseId),
        updated_at: serverTimestamp(),
    })
    await batch.commit()
}

export const rejectAccessRequest = async (requestId) => {
    await updateDoc(doc(db, 'access_requests', requestId), {
        status: 'rejected',
        updated_at: serverTimestamp(),
    })
}
