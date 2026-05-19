import {
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    doc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    deleteDoc,
    getDocs,
} from 'firebase/firestore'
import { db } from './firebase'

export type CommunityPost = {
    id: string
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

export function listenToPosts(onUpdate: (posts: CommunityPost[]) => void) {
    const postsRef = collection(db, 'community', 'posts', 'items')
    const q = query(postsRef, orderBy('createdAt', 'desc'))
    return onSnapshot(q, (snapshot) => {
        const posts: CommunityPost[] = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as any) }))
        onUpdate(posts)
    })
}

export async function createPost(authorId: string, authorName: string, text: string) {
    const postsRef = collection(db, 'community', 'posts', 'items')
    const docRef = await addDoc(postsRef, {
        authorId,
        authorName,
        text,
        likes: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    })
    return docRef.id
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
