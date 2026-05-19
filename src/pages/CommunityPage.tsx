import { useCallback, useMemo, useState, useEffect } from 'react'
import { AlertTriangle, Heart, MessageCircle, Send, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
    listenToPosts,
    createPost,
    toggleLikePost,
    createComment,
    listenToComments,
    deletePost,
    deleteComment,
    toggleLikeComment,
} from '../api/community'
import SiteHeader from '../components/SiteHeader'

export function CommunityPage() {
    const { profile, logout } = useAuth()
    const isAdmin = useMemo(() => profile?.role === 'admin', [profile?.role])
    const [deleteTarget, setDeleteTarget] = useState<
        | { kind: 'post'; postId: string; title: string }
        | { kind: 'comment'; postId: string; commentId: string; title: string }
        | null
    >(null)
    const [deleting, setDeleting] = useState(false)

    const [posts, setPosts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [newText, setNewText] = useState('')
    const [commentTextByPost, setCommentTextByPost] = useState<Record<string, string>>({})
    const [commentsByPost, setCommentsByPost] = useState<Record<string, any[]>>({})
    const [openRepliesByPost, setOpenRepliesByPost] = useState<Record<string, boolean>>({})

    const formatTime = useCallback((value: any) => {
        if (!value?.toDate) return ''
        return new Date(value.toDate()).toLocaleString()
    }, [])

    useEffect(() => {
        const unsub = listenToPosts((next) => {
            setPosts(next)
            setLoading(false)
        })
        return unsub
    }, [])

    useEffect(() => {
        const unsubList: Array<() => void> = []
        for (const p of posts.slice(0, 10)) {
            const unsub = listenToComments(p.id, (next) => {
                setCommentsByPost((cur) => ({ ...cur, [p.id]: next }))
            })
            unsubList.push(unsub)
        }
        return () => unsubList.forEach((u) => u())
    }, [posts])

    const activeAuthors = useMemo(() => {
        const m = new Map<string, string>()
        for (const p of posts.slice(0, 20)) {
            if (p.authorId && p.authorName) m.set(p.authorId, p.authorName)
        }
        return Array.from(m.entries()).map(([id, name]) => ({ id, name }))
    }, [posts])

    const canDeletePost = (post: any) => !!profile && (isAdmin || profile.uid === post.authorId)
    const canDeleteComment = (c: any) => !!profile && (isAdmin || profile.uid === c.authorId)
    const isCurrentUser = useCallback((authorId: string) => !!profile?.uid && authorId === profile.uid, [profile?.uid])

    const isLikedByUser = useCallback(
        (likes: string[] | undefined) => !!profile?.uid && Array.isArray(likes) && likes.includes(profile.uid),
        [profile?.uid],
    )

    const handleCreatePost = useCallback(async () => {
        if (!profile || !newText.trim()) return
        try {
            await createPost(profile.uid, profile.displayName || 'User', newText.trim())
            setNewText('')
        } catch (e) {
            console.error(e)
        }
    }, [newText, profile])

    const handleToggleLike = useCallback(async (post: any) => {
        if (!profile) return
        const liked = Array.isArray(post.likes) && post.likes.includes(profile.uid)
        try {
            await toggleLikePost(post.id, profile.uid, liked)
        } catch (e) {
            console.error(e)
        }
    }, [profile])

    const handleCreateComment = useCallback(async (postId: string) => {
        if (!profile) return
        const text = (commentTextByPost[postId] || '').trim()
        if (!text) return
        try {
            await createComment(postId, profile.uid, profile.displayName || 'User', text)
            setCommentTextByPost((c) => ({ ...c, [postId]: '' }))
        } catch (e) {
            console.error(e)
        }
    }, [profile, commentTextByPost])

    const handleDeletePost = useCallback((post: any) => {
        setDeleteTarget({ kind: 'post', postId: post.id, title: post.text?.slice(0, 48) || 'Post' })
    }, [])

    const handleDeleteComment = useCallback((postId: string, comment: any) => {
        setDeleteTarget({ kind: 'comment', postId, commentId: comment.id, title: comment.text?.slice(0, 48) || 'Comment' })
    }, [])

    const closeDeleteModal = useCallback(() => {
        if (deleting) return
        setDeleteTarget(null)
    }, [deleting])

    const handleConfirmDelete = useCallback(async () => {
        if (!deleteTarget) return

        setDeleting(true)

        try {
            if (deleteTarget.kind === 'post') {
                await deletePost(deleteTarget.postId)
            } else {
                await deleteComment(deleteTarget.postId, deleteTarget.commentId)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setDeleting(false)
            setDeleteTarget(null)
        }
    }, [deleteTarget])

    const handleToggleCommentLike = useCallback(
        async (postId: string, comment: any) => {
            if (!profile) return
            try {
                await toggleLikeComment(postId, comment.id, profile.uid, isLikedByUser(comment.likes))
            } catch (e) {
                console.error(e)
            }
        },
        [isLikedByUser, profile],
    )

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100">
            <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
                <SiteHeader profile={profile} onLogout={logout} />

                <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div>
                        <div className="rounded-[32px] border border-slate-800/80 bg-slate-900/80 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <span className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Community</span>
                                    <h2 className="mt-2 text-2xl font-semibold text-white">Open a space</h2>
                                </div>
                                <MessageCircle className="h-5 w-5 text-cyan-300" />
                            </div>

                            <div className="mt-5 space-y-4">
                                <div className="space-y-4">
                                    <div>
                                        <label className="sr-only">New post</label>
                                        <textarea
                                            value={newText}
                                            onChange={(e) => setNewText(e.target.value)}
                                            placeholder="Share something with the community..."
                                            className="w-full rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-100 placeholder:text-slate-500"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-slate-400">{posts.length} posts</div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setNewText('')}
                                                className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100"
                                            >
                                                Clear
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleCreatePost}
                                                disabled={!newText.trim()}
                                                className="rounded-2xl bg-gradient-to-r from-cyan-400 to-indigo-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                Post
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {loading ? (
                                        <div className="text-sm text-slate-400">Loading posts…</div>
                                    ) : posts.length ? (
                                        posts.map((post) => (
                                            <article
                                                key={post.id}
                                                className="rounded-[28px] border border-slate-700/80 bg-slate-950/70 p-5 shadow-[0_18px_48px_rgba(0,0,0,0.28)] transition duration-200 hover:-translate-y-1 hover:border-cyan-400/30 hover:shadow-[0_28px_70px_rgba(0,0,0,0.38)]"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex min-w-0 flex-1 gap-3">
                                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-indigo-400 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20">
                                                            {(post.authorName || 'U').split(' ').map((s: string) => s[0]).slice(0, 2).join('')}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                                                <div className="truncate font-semibold text-white">{post.authorName}</div>
                                                                {isCurrentUser(post.authorId) ? (
                                                                    <span className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-300">
                                                                        You
                                                                    </span>
                                                                ) : null}
                                                                <span className="text-xs text-slate-500">•</span>
                                                                <div className="text-xs text-slate-400">{formatTime(post.createdAt)}</div>
                                                            </div>
                                                            <div className="mt-2 whitespace-pre-wrap text-[15px] leading-7 text-slate-200">{post.text}</div>
                                                        </div>
                                                    </div>

                                                    {canDeletePost(post) ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeletePost(post)}
                                                            className="rounded-full border border-slate-700/70 bg-slate-900/80 p-2 text-slate-300 transition hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-200"
                                                            aria-label="Delete post"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    ) : null}
                                                </div>

                                                <div className="mt-4 flex items-center gap-5 border-t border-slate-800/80 pt-4 text-sm">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleLike(post)}
                                                        className="inline-flex items-center gap-2 rounded-full px-1 py-0.5 text-slate-300 transition duration-200 hover:-translate-y-0.5 hover:text-rose-300"
                                                        aria-label="Like post"
                                                    >
                                                        <Heart
                                                            className={`h-4 w-4 ${isLikedByUser(post.likes) ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`}
                                                        />
                                                        <span>{(post.likes || []).length}</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => setOpenRepliesByPost((cur) => ({ ...cur, [post.id]: !cur[post.id] }))}
                                                        className="inline-flex items-center gap-2 rounded-full px-1 py-0.5 text-slate-300 transition duration-200 hover:-translate-y-0.5 hover:text-cyan-300"
                                                    >
                                                        <MessageCircle className="h-4 w-4 text-slate-400" />
                                                        <span>{(commentsByPost[post.id] || []).length}</span>
                                                        <span className="text-slate-400">Comment</span>
                                                    </button>
                                                </div>

                                                {openRepliesByPost[post.id] ? (
                                                    <div className="mt-4 space-y-3 border-t border-slate-800/80 pt-4">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Comments</div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setOpenRepliesByPost((cur) => ({ ...cur, [post.id]: false }))}
                                                                className="text-xs text-slate-400 hover:text-white"
                                                            >
                                                                Close
                                                            </button>
                                                        </div>

                                                        {(commentsByPost[post.id] || []).map((c) => (
                                                            <div key={c.id} className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-3 transition duration-200 hover:border-slate-700 hover:bg-slate-900/90">
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="flex min-w-0 items-start gap-3">
                                                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-white">
                                                                            {(c.authorName || 'U').split(' ').map((s: string) => s[0]).slice(0, 2).join('')}
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <div className="flex flex-wrap items-center gap-2">
                                                                                <div className="truncate font-medium text-white">{c.authorName}</div>
                                                                                {isCurrentUser(c.authorId) ? (
                                                                                    <span className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                                                                                        You
                                                                                    </span>
                                                                                ) : null}
                                                                                <span className="text-xs text-slate-500">•</span>
                                                                                <div className="text-xs text-slate-400">{formatTime(c.createdAt)}</div>
                                                                            </div>
                                                                            <div className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-300">{c.text}</div>
                                                                            <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleToggleCommentLike(post.id, c)}
                                                                                    className="inline-flex items-center gap-2 transition duration-200 hover:-translate-y-0.5 hover:text-rose-300"
                                                                                    aria-label="Like comment"
                                                                                >
                                                                                    <Heart
                                                                                        className={`h-3.5 w-3.5 ${isLikedByUser(c.likes) ? 'fill-rose-500 text-rose-500' : 'text-slate-500'}`}
                                                                                    />
                                                                                    <span>{(c.likes || []).length || 0}</span>
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {canDeleteComment(c) ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleDeleteComment(post.id, c)}
                                                                            className="rounded-full border border-slate-700/70 bg-slate-950/80 p-2 text-slate-300 transition hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-200"
                                                                            aria-label="Delete comment"
                                                                        >
                                                                            <Trash2 className="h-3.5 w-3.5" />
                                                                        </button>
                                                                    ) : null}
                                                                </div>
                                                            </div>
                                                        ))}

                                                        <div className="flex gap-2">
                                                            <input
                                                                value={commentTextByPost[post.id] || ''}
                                                                onChange={(e) => setCommentTextByPost((c) => ({ ...c, [post.id]: e.target.value }))}
                                                                placeholder="Write a comment..."
                                                                className="flex-1 rounded-2xl border border-slate-700/80 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCreateComment(post.id)}
                                                                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-indigo-400 px-4 py-3 text-sm font-semibold text-slate-950"
                                                            >
                                                                <Send className="h-4 w-4" />
                                                                Post
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </article>
                                        ))
                                    ) : (
                                        <div className="text-sm text-slate-400">No posts yet.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <aside>
                        <div className="rounded-[28px] border border-slate-800/80 bg-slate-900/80 p-4 shadow-[0_18px_48px_rgba(0,0,0,0.25)] backdrop-blur">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">Active users</div>
                                    <div className="mt-1 text-sm text-slate-400">Currently active in the feed</div>
                                </div>
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                                    <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(74,222,128,0.15)]" />
                                    Live
                                </span>
                            </div>

                            <div className="mt-4 flex flex-col gap-2.5">
                                {activeAuthors.length ? activeAuthors.map((a) => (
                                    <div key={a.id} className="flex items-center gap-3 rounded-2xl border border-slate-800/80 bg-slate-950/70 px-3 py-2.5 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-400/30 hover:bg-slate-900/90">
                                        <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-indigo-400 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-500/15">
                                            {a.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}
                                            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-slate-950 bg-emerald-400 shadow-[0_0_0_4px_rgba(74,222,128,0.15)]" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="truncate text-sm font-medium text-white">{a.name}</div>
                                                {isCurrentUser(a.id) ? (
                                                    <span className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                                                        You
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-emerald-300">                                                Active
                                            </div>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-sm text-slate-400">No active users</div>
                                )}
                            </div>
                        </div>
                    </aside>
                </section>

                {deleteTarget ? (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 py-6 backdrop-blur-sm">
                        <div className="w-full max-w-md rounded-[28px] border border-slate-700 bg-slate-950 p-6 shadow-2xl shadow-black/60">
                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-300">
                                    <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-xl font-semibold text-white">Confirm delete</h3>
                                    <p className="mt-2 text-sm leading-6 text-slate-300">
                                        {deleteTarget.kind === 'post'
                                            ? `Delete this post?`
                                            : `Delete this comment?`}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeDeleteModal}
                                    disabled={deleting}
                                    className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-100 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void handleConfirmDelete()}
                                    disabled={deleting}
                                    className="inline-flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:border-rose-400/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    <span>{deleting ? 'Deleting...' : 'Delete'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}
            </section>
        </main>
    )
}
