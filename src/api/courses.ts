import {
    addDoc,
    collection,
    doc,
    deleteDoc,
    getDoc,
    getDocs,
    orderBy,
    query,
    where,
    serverTimestamp,
    setDoc,
    updateDoc,
} from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from './firebase'
import type {
    CourseEditorDraft,
    CourseRecord,
    LessonDraft,
    LessonRecord,
    SectionDraft,
    SectionRecord,
} from '../types/course'

type TimestampLike = { toDate?: () => Date } | null | undefined

type FirestoreCourse = Omit<CourseRecord, 'createdAt' | 'updatedAt'> & {
    createdAt?: TimestampLike
    updatedAt?: TimestampLike
}

type FirestoreSection = Omit<SectionRecord, 'createdAt' | 'updatedAt'> & {
    createdAt?: TimestampLike
    updatedAt?: TimestampLike
}

type FirestoreLesson = Omit<LessonRecord, 'createdAt' | 'updatedAt'> & {
    createdAt?: TimestampLike
    updatedAt?: TimestampLike
}

export type CourseTreeItem = CourseRecord & {
    sections: Array<SectionRecord & { lessons: LessonRecord[] }>
}

function toIso(value?: TimestampLike) {
    return value?.toDate ? value.toDate().toISOString() : null
}

function normalizeCourse(id: string, data: FirestoreCourse): CourseRecord {
    return {
        id,
        title: data.title,
        slug: data.slug,
        description: data.description,
        category: data.category,
        level: data.level,
        status: data.status,
        thumbnailURL: data.thumbnailURL ?? null,
        thumbnailPath: data.thumbnailPath ?? null,
        createdBy: data.createdBy,
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
    }
}

function normalizeSection(id: string, data: FirestoreSection): SectionRecord {
    return {
        id,
        title: data.title,
        description: data.description,
        order: data.order,
        courseId: data.courseId,
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
    }
}

function normalizeLesson(id: string, data: FirestoreLesson): LessonRecord {
    const rawLinks = Array.isArray((data as { resourceLinks?: unknown }).resourceLinks)
        ? ((data as { resourceLinks?: Array<{ title?: string; url?: string } | string> }).resourceLinks ?? [])
        : []

    return {
        id,
        title: data.title,
        youtubeUrl: data.youtubeUrl,
        youtubeVideoId: data.youtubeVideoId,
        notesTitle: data.notesTitle ?? '',
        notes: data.notes,
        resourceLinks: rawLinks
            .map((item) => (typeof item === 'string' ? { title: '', url: item.trim() } : { title: item.title?.trim() || '', url: item.url?.trim() || '' }))
            .filter((item) => item.url),
        order: data.order,
        courseId: data.courseId,
        sectionId: data.sectionId,
        createdAt: toIso(data.createdAt),
        updatedAt: toIso(data.updatedAt),
    }
}

export function extractYouTubeVideoId(input: string) {
    const trimmed = input.trim()
    const patterns = [
        /youtu\.be\/([^?&/]+)/,
        /youtube\.com\/watch\?v=([^?&/]+)/,
        /youtube\.com\/embed\/([^?&/]+)/,
        /youtube\.com\/shorts\/([^?&/]+)/,
    ]

    for (const pattern of patterns) {
        const match = trimmed.match(pattern)
        if (match?.[1]) return match[1]
    }

    return trimmed
}

async function getNextOrder(collectionRef: ReturnType<typeof collection>) {
    const snapshot = await getDocs(collectionRef)
    return snapshot.size + 1
}

function normalizeResourceLinks(input: Array<{ id: string; title: string; url: string }>) {
    return input
        .map((item) => ({ title: item.title.trim(), url: item.url.trim() }))
        .filter((item) => item.url)
}

async function deleteLessonProgressForUsers(courseId: string, lessonIds: string[]) {
    if (!lessonIds.length) return

    const enrollmentsSnapshot = await getDocs(collection(db, 'courses', courseId, 'enrollments'))
    const usersSnapshot = await getDocs(collection(db, 'users'))
    const userIds = Array.from(
        new Set([
            ...enrollmentsSnapshot.docs.map((item) => item.id),
            ...usersSnapshot.docs.map((item) => item.id),
        ]),
    )

    const deleteOps = userIds.flatMap((userId) =>
        lessonIds.map((lessonId) => deleteDoc(doc(db, 'courses', courseId, 'lessonProgress', userId, 'lessons', lessonId))),
    )

    const chunkSize = 200
    for (let i = 0; i < deleteOps.length; i += chunkSize) {
        await Promise.all(deleteOps.slice(i, i + chunkSize))
    }
}

export async function loadAdminCourses(): Promise<CourseRecord[]> {
    const coursesRef = collection(db, 'courses')
    const snapshot = await getDocs(query(coursesRef, orderBy('createdAt', 'desc')))
    return snapshot.docs.map((item) => normalizeCourse(item.id, item.data() as FirestoreCourse))
}

export async function loadPublishedCourses(): Promise<CourseRecord[]> {
    const coursesRef = collection(db, 'courses')
    const snapshot = await getDocs(query(coursesRef, where('status', '==', 'published')))
    return snapshot.docs
        .map((item) => normalizeCourse(item.id, item.data() as FirestoreCourse))
        .sort((left, right) => (right.createdAt || '').localeCompare(left.createdAt || ''))
}

export async function loadCourseTree(courseId: string): Promise<CourseTreeItem | null> {
    const courseSnapshot = await getDoc(doc(db, 'courses', courseId))

    if (!courseSnapshot.exists()) {
        return null
    }

    const course = normalizeCourse(courseSnapshot.id, courseSnapshot.data() as FirestoreCourse)
    const sectionsSnapshot = await getDocs(
        query(collection(db, 'courses', courseId, 'sections'), orderBy('order', 'asc')),
    )

    const sections = await Promise.all(
        sectionsSnapshot.docs.map(async (sectionDoc) => {
            const section = normalizeSection(sectionDoc.id, sectionDoc.data() as FirestoreSection)
            const lessonsSnapshot = await getDocs(
                query(collection(db, 'courses', courseId, 'sections', section.id, 'lessons'), orderBy('order', 'asc')),
            )

            return {
                ...section,
                lessons: lessonsSnapshot.docs.map((lessonDoc) =>
                    normalizeLesson(lessonDoc.id, lessonDoc.data() as FirestoreLesson),
                ),
            }
        }),
    )

    return {
        ...course,
        sections,
    }
}

export async function loadCourseById(courseId: string): Promise<CourseRecord | null> {
    const snapshot = await getDoc(doc(db, 'courses', courseId))

    if (!snapshot.exists()) {
        return null
    }

    return normalizeCourse(snapshot.id, snapshot.data() as FirestoreCourse)
}

export async function uploadCourseThumbnail(courseId: string, file: File) {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const thumbnailPath = `courses/${courseId}/thumbnail.${extension}`
    const storageRef = ref(storage, thumbnailPath)
    await uploadBytes(storageRef, file)
    const thumbnailURL = await getDownloadURL(storageRef)

    return { thumbnailPath, thumbnailURL }
}

export async function createCourse(input: CourseEditorDraft, createdBy: string, thumbnail?: File | null) {
    const courseRef = doc(collection(db, 'courses'))
    let thumbnailPath: string | null = null
    let thumbnailURL: string | null = null

    if (thumbnail) {
        const uploaded = await uploadCourseThumbnail(courseRef.id, thumbnail)
        thumbnailPath = uploaded.thumbnailPath
        thumbnailURL = uploaded.thumbnailURL
    }

    await setDoc(courseRef, {
        title: input.title.trim(),
        slug: input.slug.trim(),
        description: input.description.trim(),
        category: input.category.trim(),
        level: input.level.trim(),
        status: input.status,
        thumbnailPath,
        thumbnailURL,
        createdBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    })

    return courseRef.id
}

export async function updateCourse(courseId: string, input: CourseEditorDraft, thumbnail?: File | null) {
    const courseRef = doc(db, 'courses', courseId)
    const courseSnapshot = await getDoc(courseRef)
    const previousPath = courseSnapshot.exists() ? (courseSnapshot.data().thumbnailPath as string | null | undefined) : null
    const patch: Record<string, unknown> = {
        title: input.title.trim(),
        slug: input.slug.trim(),
        description: input.description.trim(),
        category: input.category.trim(),
        level: input.level.trim(),
        status: input.status,
        updatedAt: serverTimestamp(),
    }

    if (thumbnail) {
        const uploaded = await uploadCourseThumbnail(courseId, thumbnail)
        patch.thumbnailPath = uploaded.thumbnailPath
        patch.thumbnailURL = uploaded.thumbnailURL

        if (previousPath && previousPath !== uploaded.thumbnailPath) {
            await deleteObject(ref(storage, previousPath)).catch(() => undefined)
        }
    }

    await updateDoc(courseRef, patch)
}

export async function deleteCourse(courseId: string) {
    const courseRef = doc(db, 'courses', courseId)
    const courseSnapshot = await getDoc(courseRef)
    const thumbnailPath = courseSnapshot.exists() ? (courseSnapshot.data().thumbnailPath as string | null | undefined) : null

    if (thumbnailPath) {
        await deleteObject(ref(storage, thumbnailPath)).catch(() => undefined)
    }

    const sectionsSnapshot = await getDocs(query(collection(db, 'courses', courseId, 'sections'), orderBy('order', 'asc')))
    const lessonIds = await Promise.all(
        sectionsSnapshot.docs.map(async (sectionDoc) => {
            const lessonsSnapshot = await getDocs(
                query(collection(db, 'courses', courseId, 'sections', sectionDoc.id, 'lessons'), orderBy('order', 'asc')),
            )

            return lessonsSnapshot.docs.map((lessonDoc) => lessonDoc.id)
        }),
    )

    await deleteLessonProgressForUsers(courseId, lessonIds.flat())

    await Promise.all(
        sectionsSnapshot.docs.map(async (sectionDoc) => {
            const lessonsSnapshot = await getDocs(
                query(collection(db, 'courses', courseId, 'sections', sectionDoc.id, 'lessons'), orderBy('order', 'asc')),
            )

            await Promise.all(lessonsSnapshot.docs.map((lessonDoc) => deleteDoc(lessonDoc.ref)))
            await deleteDoc(sectionDoc.ref)
        }),
    )

    const enrollmentsSnapshot = await getDocs(collection(db, 'courses', courseId, 'enrollments'))
    await Promise.all(enrollmentsSnapshot.docs.map((enrollmentDoc) => deleteDoc(enrollmentDoc.ref)))

    await deleteDoc(courseRef)
}

export async function addSection(courseId: string, input: SectionDraft) {
    const sectionsRef = collection(db, 'courses', courseId, 'sections')
    const nextOrder = await getNextOrder(sectionsRef)

    const sectionDoc = await addDoc(sectionsRef, {
        title: input.title.trim(),
        description: input.description.trim(),
        order: nextOrder,
        courseId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    })

    return sectionDoc.id
}

export async function updateSection(courseId: string, sectionId: string, input: SectionDraft) {
    const sectionRef = doc(db, 'courses', courseId, 'sections', sectionId)
    await updateDoc(sectionRef, {
        title: input.title.trim(),
        description: input.description.trim(),
        updatedAt: serverTimestamp(),
    })
}

export async function deleteSection(courseId: string, sectionId: string) {
    const lessonsRef = collection(db, 'courses', courseId, 'sections', sectionId, 'lessons')
    const lessonsSnapshot = await getDocs(query(lessonsRef, orderBy('order', 'asc')))

    await deleteLessonProgressForUsers(
        courseId,
        lessonsSnapshot.docs.map((lessonDoc) => lessonDoc.id),
    )

    await Promise.all(
        lessonsSnapshot.docs.map((lessonDoc) => deleteDoc(doc(db, 'courses', courseId, 'sections', sectionId, 'lessons', lessonDoc.id))),
    )

    await deleteDoc(doc(db, 'courses', courseId, 'sections', sectionId))

    const remainingSectionsSnapshot = await getDocs(
        query(collection(db, 'courses', courseId, 'sections'), orderBy('order', 'asc')),
    )

    await Promise.all(
        remainingSectionsSnapshot.docs.map((sectionDoc, index) =>
            updateDoc(sectionDoc.ref, { order: index + 1, updatedAt: serverTimestamp() }),
        ),
    )
}

export async function reorderSections(courseId: string, orderedSectionIds: string[]) {
    const sectionsRef = collection(db, 'courses', courseId, 'sections')
    await Promise.all(
        orderedSectionIds.map((sectionId, index) =>
            updateDoc(doc(sectionsRef, sectionId), { order: index + 1, updatedAt: serverTimestamp() }),
        ),
    )
}

export async function addLesson(courseId: string, sectionId: string, input: LessonDraft) {
    const lessonsRef = collection(db, 'courses', courseId, 'sections', sectionId, 'lessons')
    const nextOrder = await getNextOrder(lessonsRef)
    const resourceLinks = normalizeResourceLinks(input.resourceLinks)

    const lessonDoc = await addDoc(lessonsRef, {
        title: input.title.trim(),
        youtubeUrl: input.youtubeUrl.trim(),
        youtubeVideoId: extractYouTubeVideoId(input.youtubeUrl),
        notes: input.notes.trim(),
        resourceLinks,
        order: nextOrder,
        courseId,
        sectionId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    })

    return lessonDoc.id
}

export async function updateLesson(courseId: string, sectionId: string, lessonId: string, input: LessonDraft) {
    const lessonRef = doc(db, 'courses', courseId, 'sections', sectionId, 'lessons', lessonId)
    const resourceLinks = normalizeResourceLinks(input.resourceLinks)
    await updateDoc(lessonRef, {
        title: input.title.trim(),
        youtubeUrl: input.youtubeUrl.trim(),
        youtubeVideoId: extractYouTubeVideoId(input.youtubeUrl),
        notes: input.notes.trim(),
        resourceLinks,
        updatedAt: serverTimestamp(),
    })
}

export async function deleteLesson(courseId: string, sectionId: string, lessonId: string) {
    await deleteLessonProgressForUsers(courseId, [lessonId])

    await deleteDoc(doc(db, 'courses', courseId, 'sections', sectionId, 'lessons', lessonId))

    const remainingLessonsSnapshot = await getDocs(
        query(collection(db, 'courses', courseId, 'sections', sectionId, 'lessons'), orderBy('order', 'asc')),
    )

    await Promise.all(
        remainingLessonsSnapshot.docs.map((lessonDoc, index) =>
            updateDoc(lessonDoc.ref, { order: index + 1, updatedAt: serverTimestamp() }),
        ),
    )
}

export async function reorderLessons(courseId: string, sectionId: string, orderedLessonIds: string[]) {
    const lessonsRef = collection(db, 'courses', courseId, 'sections', sectionId, 'lessons')
    await Promise.all(
        orderedLessonIds.map((lessonId, index) =>
            updateDoc(doc(lessonsRef, lessonId), { order: index + 1, updatedAt: serverTimestamp() }),
        ),
    )
}