import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { EnrollmentRecord } from '../types/course'

type TimestampLike = { toDate?: () => Date } | null | undefined

type FirestoreEnrollment = Omit<EnrollmentRecord, 'createdAt' | 'updatedAt'> & {
    createdAt?: TimestampLike
    updatedAt?: TimestampLike
}

function toIso(value?: TimestampLike) {
    return value?.toDate ? value.toDate().toISOString() : null
}

function normalizeEnrollment(id: string, data: FirestoreEnrollment): EnrollmentRecord {
    return {
        id,
        courseId: data.courseId,
        userId: data.userId,
        displayName: data.displayName ?? null,
        email: data.email ?? null,
        status: data.status,
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
    }
}

function enrollmentRef(courseId: string, userId: string) {
    return doc(db, 'courses', courseId, 'enrollments', userId)
}

async function loadCourseLessonIds(courseId: string) {
    const sectionsSnapshot = await getDocs(collection(db, 'courses', courseId, 'sections'))
    const lessonIdsBySection = await Promise.all(
        sectionsSnapshot.docs.map(async (sectionDoc) => {
            const lessonsSnapshot = await getDocs(collection(db, 'courses', courseId, 'sections', sectionDoc.id, 'lessons'))
            return lessonsSnapshot.docs.map((lessonDoc) => lessonDoc.id)
        }),
    )

    return lessonIdsBySection.flat()
}

async function deleteUserLessonProgress(courseId: string, userId: string) {
    const lessonIds = await loadCourseLessonIds(courseId)

    if (!lessonIds.length) {
        return
    }

    await Promise.all(
        lessonIds.map((lessonId) => deleteDoc(doc(db, 'courses', courseId, 'lessonProgress', userId, 'lessons', lessonId))),
    )
}

export async function loadEnrollment(courseId: string, userId: string): Promise<EnrollmentRecord | null> {
    const snapshot = await getDoc(enrollmentRef(courseId, userId))

    if (!snapshot.exists()) {
        return null
    }

    return normalizeEnrollment(snapshot.id, snapshot.data() as FirestoreEnrollment)
}

export async function loadCourseEnrollments(courseId: string): Promise<EnrollmentRecord[]> {
    const snapshot = await getDocs(collection(db, 'courses', courseId, 'enrollments'))
    return snapshot.docs.map((item) => normalizeEnrollment(item.id, item.data() as FirestoreEnrollment))
}

export async function enrollInCourse(courseId: string, userId: string, displayName?: string | null, email?: string | null) {
    const ref = enrollmentRef(courseId, userId)

    await setDoc(ref, {
        courseId,
        userId,
        displayName: displayName ?? null,
        email: email ?? null,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    })

    return ref.id
}

export async function removeEnrollment(courseId: string, userId: string) {
    await deleteUserLessonProgress(courseId, userId)
    await deleteDoc(enrollmentRef(courseId, userId))
}

export async function approveEnrollment(courseId: string, userId: string) {
    await setDoc(
        enrollmentRef(courseId, userId),
        {
            courseId,
            userId,
            status: 'approved',
            updatedAt: serverTimestamp(),
        },
        { merge: true },
    )
}

export async function rejectEnrollment(courseId: string, userId: string) {
    await setDoc(
        enrollmentRef(courseId, userId),
        {
            courseId,
            userId,
            status: 'rejected',
            updatedAt: serverTimestamp(),
        },
        { merge: true },
    )
}

export async function cancelEnrollmentRequest(courseId: string, userId: string) {
    await deleteUserLessonProgress(courseId, userId)
    await deleteDoc(enrollmentRef(courseId, userId))
}

export async function requestEnrollment(courseId: string, userId: string, displayName?: string | null, email?: string | null) {
    return enrollInCourse(courseId, userId, displayName, email)
}
