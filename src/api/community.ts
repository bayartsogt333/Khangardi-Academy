import {
    collection,
    addDoc,
    query,
    orderBy,
    where,
    onSnapshot,
    serverTimestamp,
    doc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    deleteDoc,
    getDocs,
    getDoc,
} from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from './firebase'
import { loadPublishedCourses } from './courses'

export type CommunityGroup = {
    id: string
    title: string
    description: string
    kind: 'general' | 'course' | 'custom'
    courseId?: string | null
    coverImageUrl?: string | null
    coverImagePath?: string | null
    accentColor?: string | null
    createdBy?: string | null
    createdAt?: any
    updatedAt?: any
}

export type CommunityPost = {
    id: string
    groupId: string
    groupType: 'general' | 'course' | 'custom'
    courseId?: string | null
    authorId: string
    authorName: string
    text: string
    createdAt: any
    updatedAt?: any
    likes?: string[]
}

export type CommunityComment = {
    id: string
    authorId: string
    authorName: string
    text: string
    createdAt: any
}

const COURSE_ACCENTS = ['#22d3ee', '#38bdf8', '#818cf8', '#34d399', '#f59e0b', '#fb7185']

function pickAccent(seed: string) {
    if (!seed) return COURSE_ACCENTS[0]

    let hash = 0
    for (let i = 0; i < seed.length; i += 1) {
        hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
    }

    return COURSE_ACCENTS[hash % COURSE_ACCENTS.length]
}

export async function loadCommunityGroups(): Promise<CommunityGroup[]> {
    const customGroupsRef = collection(db, 'community', 'groups', 'items')
    const [courses, customGroupsSnapshot] = await Promise.all([
        loadPublishedCourses(),
        getDocs(query(customGroupsRef, orderBy('createdAt', 'asc'))),
    ])

    const generalGroup: CommunityGroup = {
        id: 'general',
        title: 'General',
        description: 'Open discussion for announcements, updates, and community chat.',
        kind: 'general',
        accentColor: '#22d3ee',
    }

    const courseGroups: CommunityGroup[] = courses.map((course) => ({
        id: course.id,
        title: course.title,
        description: course.description || 'Course discussion group',
        kind: 'course',
        courseId: course.id,
        coverImageUrl: course.thumbnailURL ?? null,
        accentColor: pickAccent(course.id),
    }))

    const customGroups: CommunityGroup[] = customGroupsSnapshot.docs.map((item) => {
        const data = item.data() as Partial<CommunityGroup>
        return {
            id: item.id,
            title: data.title || 'Untitled group',
            description: data.description || 'Community discussion group',
            kind: 'custom',
            coverImageUrl: data.coverImageUrl ?? null,
            coverImagePath: data.coverImagePath ?? null,
            accentColor: data.accentColor ?? pickAccent(item.id),
            createdBy: data.createdBy ?? null,
            createdAt: data.createdAt ?? null,
            updatedAt: data.updatedAt ?? null,
        }
    })

    return [generalGroup, ...courseGroups, ...customGroups]
}

export function listenToPosts(onUpdate: (posts: CommunityPost[]) => void) {
    const postsRef = collection(db, 'community', 'posts', 'items')
    const q = query(postsRef, orderBy('createdAt', 'desc'))
    return onSnapshot(q, (snapshot) => {
        const posts: CommunityPost[] = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as any) }))
        onUpdate(posts)
    })
}

export async function createGroup(title: string, description: string, createdBy: string) {
    const groupsRef = collection(db, 'community', 'groups', 'items')
    const docRef = await addDoc(groupsRef, {
        title,
        description,
        kind: 'custom',
        accentColor: pickAccent(title),
        createdBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    })

    return docRef.id
}

export async function uploadGroupCover(groupId: string, file: File) {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `community/groups/${groupId}/cover.${extension}`
    const ref = storageRef(storage, path)
    await uploadBytes(ref, file)
    const url = await getDownloadURL(ref)
    return { path, url }
}

export async function setGroupCover(groupId: string, coverUrl: string, coverPath?: string) {
    const groupRef = doc(db, 'community', 'groups', 'items', groupId)
    const patch: Record<string, unknown> = {
        coverImageUrl: coverUrl,
        updatedAt: serverTimestamp(),
    }
    if (coverPath) patch['coverImagePath'] = coverPath
    await updateDoc(groupRef, patch)
}

export async function replaceGroupCover(groupId: string, file: File) {
    const groupRef = doc(db, 'community', 'groups', 'items', groupId)
    const groupSnapshot = await getDoc(groupRef)
    const previousPath = groupSnapshot.exists() ? (groupSnapshot.data() as any).coverImagePath as string | null | undefined : null

    const uploaded = await uploadGroupCover(groupId, file)

    // delete previous file if different
    if (previousPath && previousPath !== uploaded.path) {
        try {
            await deleteObject(storageRef(storage, previousPath))
        } catch { /* ignore */ }
    }

    await updateDoc(groupRef, {
        coverImageUrl: uploaded.url,
        coverImagePath: uploaded.path,
        updatedAt: serverTimestamp(),
    })

    return uploaded
}

export async function updateGroup(groupId: string, title: string, description: string) {
    const groupRef = doc(db, 'community', 'groups', 'items', groupId)
    await updateDoc(groupRef, {
        title,
        description,
        updatedAt: serverTimestamp(),
    })
}

export async function deleteGroup(groupId: string) {
    const postsRef = collection(db, 'community', 'posts', 'items')
    const groupPostsSnapshot = await getDocs(query(postsRef, where('groupId', '==', groupId)))

    for (const postDoc of groupPostsSnapshot.docs) {
        const commentsRef = collection(db, 'community', 'posts', 'items', postDoc.id, 'comments')
        const commentsSnapshot = await getDocs(commentsRef)
        await Promise.all(commentsSnapshot.docs.map((commentDoc) => deleteDoc(commentDoc.ref)))
        await deleteDoc(postDoc.ref)
    }

    // delete cover image if exists
    const groupRef = doc(db, 'community', 'groups', 'items', groupId)
    const groupSnapshot = await getDoc(groupRef)
    if (groupSnapshot.exists()) {
        const data = groupSnapshot.data() as any
        const previousPath = data.coverImagePath as string | null | undefined
        if (previousPath) {
            try {
                await deleteObject(storageRef(storage, previousPath))
            } catch { /* ignore */ }
        }
    }

    await deleteDoc(groupRef)
}

export async function createPost(group: CommunityGroup, authorId: string, authorName: string, text: string) {
    const postsRef = collection(db, 'community', 'posts', 'items')
    const docRef = await addDoc(postsRef, {
        groupId: group.id,
        groupType: group.kind,
        courseId: group.courseId ?? null,
        groupTitle: group.title,
        authorId,
        authorName,
        text,
        likes: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    })
    return docRef.id
}

export function listenToGroupPosts(groupId: string, onUpdate: (posts: CommunityPost[]) => void) {
    const postsRef = collection(db, 'community', 'posts', 'items')
    const q = query(postsRef, where('groupId', '==', groupId), orderBy('createdAt', 'desc'))
    return onSnapshot(q, (snapshot) => {
        const posts: CommunityPost[] = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as any) }))
        onUpdate(posts)
    })
}

export async function deletePost(postId: string) {
    const commentsRef = collection(db, 'community', 'posts', 'items', postId, 'comments')
    const commentsSnapshot = await getDocs(commentsRef)

    await Promise.all(commentsSnapshot.docs.map((commentDoc) => deleteDoc(commentDoc.ref)))

    const postRef = doc(db, 'community', 'posts', 'items', postId)
    await deleteDoc(postRef)
}

export async function toggleLikePost(postId: string, userId: string, liked: boolean) {
    const postRef = doc(db, 'community', 'posts', 'items', postId)
    if (liked) {
        await updateDoc(postRef, { likes: arrayRemove(userId) })
    } else {
        await updateDoc(postRef, { likes: arrayUnion(userId) })
    }
}

export async function createComment(postId: string, authorId: string, authorName: string, text: string) {
    const commentsRef = collection(db, 'community', 'posts', 'items', postId, 'comments')
    const docRef = await addDoc(commentsRef, {
        authorId,
        authorName,
        text,
        likes: [],
        createdAt: serverTimestamp(),
    })
    return docRef.id
}

export async function toggleLikeComment(postId: string, commentId: string, userId: string, liked: boolean) {
    const commentRef = doc(db, 'community', 'posts', 'items', postId, 'comments', commentId)
    if (liked) {
        await updateDoc(commentRef, { likes: arrayRemove(userId) })
    } else {
        await updateDoc(commentRef, { likes: arrayUnion(userId) })
    }
}

export function listenToComments(postId: string, onUpdate: (comments: CommunityComment[]) => void) {
    const commentsRef = collection(db, 'community', 'posts', 'items', postId, 'comments')
    const q = query(commentsRef, orderBy('createdAt', 'asc'))
    return onSnapshot(q, (snapshot) => {
        const comments: CommunityComment[] = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
        onUpdate(comments)
    })
}

export async function deleteComment(postId: string, commentId: string) {
    const commentRef = doc(db, 'community', 'posts', 'items', postId, 'comments', commentId)
    await deleteDoc(commentRef)
}
