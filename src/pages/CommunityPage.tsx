import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BookOpen, Edit3, Hash, Heart, MessageCircle, Plus, Send, Sparkles, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
    createComment,
    createGroup,
    deleteGroup,
    createPost,
    deleteComment,
    deletePost,
    listenToComments,
    listenToPosts,
    loadCommunityGroups,
    toggleLikeComment,
    toggleLikePost,
    uploadGroupCover,
    setGroupCover,
    updateGroup,
    replaceGroupCover,
    type CommunityGroup,
    type CommunityPost,
} from '../api/community'
import SiteHeader from '../components/SiteHeader'

export function CommunityPage() {
    const { profile, logout } = useAuth()
    const isAdmin = useMemo(() => profile?.role === 'admin', [profile?.role])

    const [groups, setGroups] = useState<CommunityGroup[]>([])
    const [selectedGroupId, setSelectedGroupId] = useState('general')
    const [groupsLoading, setGroupsLoading] = useState(true)
    const [groupSaving, setGroupSaving] = useState(false)
    const [groupActionId, setGroupActionId] = useState('')
    const [editingGroupId, setEditingGroupId] = useState('')
    const [editGroupTitleDraft, setEditGroupTitleDraft] = useState('')
    const [editGroupDescriptionDraft, setEditGroupDescriptionDraft] = useState('')
    const [editCoverFile, setEditCoverFile] = useState<File | null>(null)
    const [groupTitleDraft, setGroupTitleDraft] = useState('')
    const [groupDescriptionDraft, setGroupDescriptionDraft] = useState('')
    const [groupCoverFile, setGroupCoverFile] = useState<File | null>(null)

    const editCoverPreview = useMemo(() => (editCoverFile ? URL.createObjectURL(editCoverFile) : null), [editCoverFile])
    const groupCoverPreview = useMemo(() => (groupCoverFile ? URL.createObjectURL(groupCoverFile) : null), [groupCoverFile])

    useEffect(() => {
        return () => {
            if (editCoverPreview) URL.revokeObjectURL(editCoverPreview)
            if (groupCoverPreview) URL.revokeObjectURL(groupCoverPreview)
        }
    }, [editCoverPreview, groupCoverPreview])

    const [deleteTarget, setDeleteTarget] = useState<
        | { kind: 'post'; postId: string; title: string }
        | { kind: 'comment'; postId: string; commentId: string; title: string }
        | { kind: 'group'; groupId: string; title: string }
        | null
    >(null)
    const [deleting, setDeleting] = useState(false)

    const [posts, setPosts] = useState<CommunityPost[]>([])
    const [loading, setLoading] = useState(true)
    const [newText, setNewText] = useState('')
    const [commentTextByPost, setCommentTextByPost] = useState<Record<string, string>>({})
    const [commentsByPost, setCommentsByPost] = useState<Record<string, any[]>>({})
    const [openRepliesByPost, setOpenRepliesByPost] = useState<Record<string, boolean>>({})
    const [lastSeenByGroup, setLastSeenByGroup] = useState<Record<string, number>>({})

    const unreadStorageKey = useMemo(
        () => `community:lastSeen:${profile?.uid ?? 'guest'}`,
        [profile?.uid],
    )

    const formatTime = useCallback((value: any) => {
        if (!value?.toDate) return ''
        return new Date(value.toDate()).toLocaleString()
    }, [])

    const refreshGroups = useCallback(async () => {
        setGroupsLoading(true)
        try {
            const nextGroups = await loadCommunityGroups()
            setGroups(nextGroups)
        } catch (error) {
            console.error(error)
        } finally {
            setGroupsLoading(false)
        }
    }, [])

    useEffect(() => {
        void refreshGroups()
    }, [refreshGroups])

    useEffect(() => {
        const unsub = listenToPosts((next) => {
            setPosts(next)
            setLoading(false)
        })
        return unsub
    }, [])

    useEffect(() => {
        try {
            const raw = localStorage.getItem(unreadStorageKey)
            if (!raw) {
                setLastSeenByGroup({})
                return
            }

            const parsed = JSON.parse(raw) as Record<string, number>
            if (parsed && typeof parsed === 'object') {
                setLastSeenByGroup(parsed)
            } else {
                setLastSeenByGroup({})
            }
        } catch {
            setLastSeenByGroup({})
        }
    }, [unreadStorageKey])

    useEffect(() => {
        if (!groups.length) return
        const hasSelected = groups.some((group) => group.id === selectedGroupId)
        if (!hasSelected) {
            setSelectedGroupId(groups[0].id)
        }
    }, [groups, selectedGroupId])

    const selectedGroup = useMemo(
        () => groups.find((group) => group.id === selectedGroupId) ?? groups[0] ?? null,
        [groups, selectedGroupId],
    )

    const postCreatedAtMs = useCallback((post: CommunityPost) => {
        return post.createdAt?.toDate ? post.createdAt.toDate().getTime() : 0
    }, [])

    useEffect(() => {
        if (!selectedGroup?.id) return

        const visiblePosts = posts.filter((post) => post.groupId === selectedGroup.id)
        const unsubList: Array<() => void> = []
        for (const post of visiblePosts.slice(0, 10)) {
            const unsub = listenToComments(post.id, (next) => {
                setCommentsByPost((cur) => ({ ...cur, [post.id]: next }))
            })
            unsubList.push(unsub)
        }
        return () => unsubList.forEach((unsub) => unsub())
    }, [posts, selectedGroup?.id])

    const visiblePosts = useMemo(() => {
        if (!selectedGroup?.id) return []
        return posts.filter((post) => (post.groupId ? post.groupId === selectedGroup.id : selectedGroup.id === 'general'))
    }, [posts, selectedGroup?.id])

    const postsByGroupId = useMemo(() => {
        const map: Record<string, CommunityPost[]> = {}
        for (const group of groups) {
            map[group.id] = posts.filter((post) => (post.groupId ? post.groupId === group.id : group.id === 'general'))
        }
        return map
    }, [groups, posts])

    const unreadCountByGroup = useMemo(() => {
        const result: Record<string, number> = {}
        for (const group of groups) {
            const seenAt = lastSeenByGroup[group.id] ?? 0
            const unreadCount = (postsByGroupId[group.id] ?? []).filter((post) => {
                if (profile?.uid && post.authorId === profile.uid) return false
                return postCreatedAtMs(post) > seenAt
            }).length
            result[group.id] = unreadCount
        }
        return result
    }, [groups, lastSeenByGroup, postCreatedAtMs, postsByGroupId, profile?.uid])

    useEffect(() => {
        if (!selectedGroup?.id) return
        const groupPosts = postsByGroupId[selectedGroup.id] ?? []
        if (!groupPosts.length) return

        const latestPostMs = groupPosts.reduce((max, post) => Math.max(max, postCreatedAtMs(post)), 0)
        if (!latestPostMs) return

        setLastSeenByGroup((current) => {
            if ((current[selectedGroup.id] ?? 0) >= latestPostMs) {
                return current
            }

            return { ...current, [selectedGroup.id]: latestPostMs }
        })
    }, [postCreatedAtMs, postsByGroupId, selectedGroup?.id])

    const activeAuthors = useMemo(() => {
        const seen = new Map<string, string>()
        for (const post of visiblePosts.slice(0, 20)) {
            if (post.authorId && post.authorName) {
                seen.set(post.authorId, post.authorName)
            }
        }
        return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
    }, [visiblePosts])

    const canDeletePost = (post: CommunityPost) => !!profile && (isAdmin || profile.uid === post.authorId)
    const canDeleteComment = (comment: any) => !!profile && (isAdmin || profile.uid === comment.authorId)
    const isCurrentUser = useCallback((authorId: string) => !!profile?.uid && authorId === profile.uid, [profile?.uid])

    const isLikedByUser = useCallback(
        (likes: string[] | undefined) => !!profile?.uid && Array.isArray(likes) && likes.includes(profile.uid),
        [profile?.uid],
    )

    const handleCreatePost = useCallback(async () => {
        if (!profile || !selectedGroup || !newText.trim()) return
        try {
            await createPost(selectedGroup, profile.uid, profile.displayName || 'User', newText.trim())
            setNewText('')
        } catch (error) {
            console.error(error)
        }
    }, [newText, profile, selectedGroup])

    const handleCreateGroup = useCallback(async () => {
        if (!profile || !isAdmin) return
        const title = groupTitleDraft.trim()
        const description = groupDescriptionDraft.trim()
        if (!title) return

        setGroupSaving(true)
        try {
            const newGroupId = await createGroup(title, description || 'Community discussion group', profile.uid)
            // upload cover if provided
            if (groupCoverFile) {
                try {
                    const uploaded = await uploadGroupCover(newGroupId, groupCoverFile)
                    await setGroupCover(newGroupId, uploaded.url, uploaded.path)
                } catch (uploadErr) {
                    console.error('Failed to upload cover', uploadErr)
                }
            }

            setGroupTitleDraft('')
            setGroupDescriptionDraft('')
            setGroupCoverFile(null)
            await refreshGroups()
            setSelectedGroupId(newGroupId)
        } catch (error) {
            console.error(error)
        } finally {
            setGroupSaving(false)
        }
    }, [groupDescriptionDraft, groupTitleDraft, groupCoverFile, isAdmin, profile, refreshGroups])

    const startEditGroup = useCallback((group: CommunityGroup) => {
        setEditingGroupId(group.id)
        setEditGroupTitleDraft(group.title)
        setEditGroupDescriptionDraft(group.description)
    }, [])

    const cancelEditGroup = useCallback(() => {
        setEditingGroupId('')
        setEditGroupTitleDraft('')
        setEditGroupDescriptionDraft('')
    }, [])

    const handleSaveGroupEdit = useCallback(async () => {
        if (!editingGroupId || !isAdmin) return
        const title = editGroupTitleDraft.trim()
        const description = editGroupDescriptionDraft.trim()
        if (!title) return

        setGroupActionId(editingGroupId)
        try {
            await updateGroup(editingGroupId, title, description || 'Community discussion group')
            if (editCoverFile) {
                try {
                    // Use replaceGroupCover so the previous Storage file is deleted
                    await replaceGroupCover(editingGroupId, editCoverFile)
                } catch (err) {
                    console.error('Cover replace failed', err)
                }
            }
            await refreshGroups()
            cancelEditGroup()
        } catch (error) {
            console.error(error)
        } finally {
            setGroupActionId('')
        }
    }, [cancelEditGroup, editGroupDescriptionDraft, editGroupTitleDraft, editingGroupId, isAdmin, refreshGroups])

    const handleDeleteGroup = useCallback((group: CommunityGroup) => {
        setDeleteTarget({ kind: 'group', groupId: group.id, title: group.title })
    }, [])

    const handleToggleLike = useCallback(
        async (post: CommunityPost) => {
            if (!profile) return
            const liked = Array.isArray(post.likes) && post.likes.includes(profile.uid)
            try {
                await toggleLikePost(post.id, profile.uid, liked)
            } catch (error) {
                console.error(error)
            }
        },
        [profile],
    )

    const handleCreateComment = useCallback(
        async (postId: string) => {
            if (!profile) return
            const text = (commentTextByPost[postId] || '').trim()
            if (!text) return
            try {
                await createComment(postId, profile.uid, profile.displayName || 'User', text)
                setCommentTextByPost((current) => ({ ...current, [postId]: '' }))
            } catch (error) {
                console.error(error)
            }
        },
        [commentTextByPost, profile],
    )

    const handleDeletePost = useCallback((post: CommunityPost) => {
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
            } else if (deleteTarget.kind === 'group') {
                setGroupActionId(deleteTarget.groupId)
                await deleteGroup(deleteTarget.groupId)
                await refreshGroups()
                if (selectedGroupId === deleteTarget.groupId) {
                    setSelectedGroupId('general')
                }
            } else {
                await deleteComment(deleteTarget.postId, deleteTarget.commentId)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setGroupActionId('')
            setDeleting(false)
            setDeleteTarget(null)
        }
    }, [deleteTarget, refreshGroups, selectedGroupId])

    const handleToggleCommentLike = useCallback(
        async (postId: string, comment: any) => {
            if (!profile) return
            try {
                await toggleLikeComment(postId, comment.id, profile.uid, isLikedByUser(comment.likes))
            } catch (error) {
                console.error(error)
            }
        },
        [isLikedByUser, profile],
    )

    const groupKindLabel = selectedGroup?.kind === 'course' ? 'Course group' : selectedGroup?.kind === 'custom' ? 'Custom group' : 'General space'

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100">
            <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
                <SiteHeader profile={profile} onLogout={logout} />

                <section className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
                    <aside className="space-y-4">
                        <div className="rounded-[28px] border border-slate-800/80 bg-slate-900/80 p-5 shadow-[0_18px_48px_rgba(0,0,0,0.25)] backdrop-blur">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Community spaces</div>
                                    <h2 className="mt-2 text-2xl font-semibold text-white">Pick a group</h2>
                                </div>
                                <Hash className="h-5 w-5 text-cyan-300" />
                            </div>

                            <div className="mt-4 space-y-3">
                                {groupsLoading ? (
                                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-400">Loading groups…</div>
                                ) : null}

                                {groups.map((group) => {
                                    const selected = group.id === selectedGroup?.id
                                    const groupPosts = postsByGroupId[group.id] ?? []
                                    const groupPostsCount = groupPosts.length
                                    const unreadCount = unreadCountByGroup[group.id] ?? 0
                                    /* skip computing last-post timestamp to keep card concise */
                                    const accent = group.accentColor || '#22d3ee'
                                    const isEditingThis = editingGroupId === group.id
                                    const canManageGroup = isAdmin && group.kind === 'custom'

                                    return (
                                        <article
                                            key={group.id}
                                            onClick={() => setSelectedGroupId(group.id)}
                                            className={`cursor-pointer overflow-hidden rounded-3xl border text-left transition duration-200 hover:-translate-y-0.5 ${selected
                                                ? 'border-cyan-400/40 bg-cyan-400/10 shadow-[0_18px_48px_rgba(34,211,238,0.08)]'
                                                : 'border-slate-800 bg-slate-950/70 hover:border-cyan-400/25 hover:bg-slate-900/90'
                                                }`}
                                        >
                                            <div className="flex items-start gap-3 p-4">
                                                <div
                                                    className="h-12 w-12 flex-shrink-0 rounded-md overflow-hidden"
                                                    style={group.coverImageUrl
                                                        ? { backgroundImage: `url(${group.coverImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                                                        : { background: `linear-gradient(140deg, ${accent}66 0%, rgba(15,23,42,0.96) 60%)` }}
                                                />

                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            {group.kind === 'course' ? (
                                                                <BookOpen className="h-4 w-4 text-cyan-300" />
                                                            ) : group.kind === 'custom' ? (
                                                                <Sparkles className="h-4 w-4 text-indigo-300" />
                                                            ) : (
                                                                <Hash className="h-4 w-4 text-cyan-300" />
                                                            )}
                                                            <div className="truncate font-semibold text-white">{group.title}</div>
                                                        </div>

                                                        {unreadCount > 0 ? (
                                                            <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                                                                {unreadCount}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    <div className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">{group.description}</div>
                                                </div>
                                            </div>

                                            <div className="space-y-3 p-4 pt-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="text-xs text-slate-400">{groupPostsCount} threads</div>
                                                    {selected ? <span className="text-cyan-300">Selected</span> : null}
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    {canManageGroup ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.stopPropagation(); startEditGroup(group) }}
                                                                disabled={groupActionId === group.id}
                                                                className="inline-flex items-center gap-1 rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
                                                            >
                                                                <Edit3 className="h-3.5 w-3.5" />
                                                                Edit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group) }}
                                                                disabled={groupActionId === group.id}
                                                                className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:border-rose-400/40 disabled:cursor-not-allowed disabled:opacity-60"
                                                            >
                                                                Delete
                                                            </button>
                                                        </>
                                                    ) : null}
                                                </div>

                                                {isEditingThis ? (
                                                    <div className="space-y-2 rounded-2xl border border-slate-700 bg-slate-950/60 p-3">
                                                        <input
                                                            value={editGroupTitleDraft}
                                                            onChange={(event) => setEditGroupTitleDraft(event.target.value)}
                                                            placeholder="Group title"
                                                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none"
                                                        />
                                                        <textarea
                                                            value={editGroupDescriptionDraft}
                                                            onChange={(event) => setEditGroupDescriptionDraft(event.target.value)}
                                                            placeholder="Group description"
                                                            rows={3}
                                                            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none"
                                                        />
                                                        <div onClick={(e) => e.stopPropagation()}>
                                                            <label className="text-xs text-slate-400">Replace cover (optional)</label>
                                                            <label className="mt-2 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900 px-3 py-2 transition hover:border-slate-600" htmlFor={`edit-cover-${group.id}`}>
                                                                {editCoverPreview ? (
                                                                    <img src={editCoverPreview} alt="preview" className="h-12 w-12 rounded-md object-cover" />
                                                                ) : (
                                                                    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-800 text-sm text-slate-500">Cover</div>
                                                                )}
                                                                <div className="flex-1 text-sm text-slate-200">Click to choose a new cover image (optional)</div>
                                                                <input
                                                                    id={`edit-cover-${group.id}`}
                                                                    type="file"
                                                                    accept="image/*"
                                                                    onChange={(e) => setEditCoverFile(e.target.files?.[0] ?? null)}
                                                                    className="hidden"
                                                                />
                                                            </label>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => void handleSaveGroupEdit()}
                                                                disabled={groupActionId === group.id || !editGroupTitleDraft.trim()}
                                                                className="rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-400 px-3 py-2 text-xs font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                                                            >
                                                                {groupActionId === group.id ? 'Saving…' : 'Save'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={cancelEditGroup}
                                                                disabled={groupActionId === group.id}
                                                                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </article>
                                    )
                                })}
                            </div>
                        </div>

                        {isAdmin ? (
                            <div className="rounded-[28px] border border-slate-800/80 bg-slate-900/80 p-5 shadow-[0_18px_48px_rgba(0,0,0,0.25)] backdrop-blur">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Admin tools</div>
                                        <h3 className="mt-2 text-xl font-semibold text-white">Create a group</h3>
                                    </div>
                                    <Plus className="h-5 w-5 text-cyan-300" />
                                </div>

                                <div className="mt-4 space-y-3">
                                    <input
                                        value={groupTitleDraft}
                                        onChange={(event) => setGroupTitleDraft(event.target.value)}
                                        placeholder="Group title"
                                        className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none"
                                    />
                                    <textarea
                                        value={groupDescriptionDraft}
                                        onChange={(event) => setGroupDescriptionDraft(event.target.value)}
                                        placeholder="Group description"
                                        rows={4}
                                        className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none"
                                    />
                                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                                        <label className="text-xs text-slate-400">Cover image (optional)</label>
                                        <label className="mt-2 flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-700/60 bg-slate-950/70 px-3 py-2 transition hover:border-slate-600" htmlFor="create-cover">
                                            {groupCoverPreview ? (
                                                <img src={groupCoverPreview} alt="preview" className="h-12 w-12 rounded-md object-cover" />
                                            ) : (
                                                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-slate-800 text-sm text-slate-500">Cover</div>
                                            )}
                                            <div className="flex-1 text-sm text-slate-200">Choose a cover image (optional)</div>
                                            <input
                                                id="create-cover"
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => setGroupCoverFile(e.target.files?.[0] ?? null)}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => void handleCreateGroup()}
                                        disabled={groupSaving || !groupTitleDraft.trim()}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-indigo-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:from-cyan-300 hover:to-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <Plus className="h-4 w-4" />
                                        {groupSaving ? 'Creating…' : 'Add group'}
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </aside>

                    <section className="space-y-6">
                        <section className="rounded-[32px] border border-slate-800/80 bg-slate-900/80 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur">
                            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-3">
                                    <span className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Now posting in</span>
                                    <h1 className="text-3xl font-semibold text-white">{selectedGroup?.title || 'General'}</h1>
                                    <p className="max-w-3xl text-sm leading-7 text-slate-300">{selectedGroup?.description || 'Choose a group from the left to see posts and comments here.'}</p>
                                </div>

                                <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                                    <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1">{groupKindLabel}</span>
                                    <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1">{visiblePosts.length} posts</span>
                                    <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1">{activeAuthors.length} active authors</span>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-[32px] border border-slate-800/80 bg-slate-900/80 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Create post</div>
                                    <h2 className="mt-2 text-2xl font-semibold text-white">Share with {selectedGroup?.title || 'the community'}</h2>
                                </div>
                                <MessageCircle className="h-5 w-5 text-cyan-300" />
                            </div>

                            <div className="mt-5 space-y-4">
                                <textarea
                                    value={newText}
                                    onChange={(event) => setNewText(event.target.value)}
                                    placeholder={selectedGroup ? `Write a post for ${selectedGroup.title}...` : 'Write a post...'}
                                    className="min-h-[120px] w-full rounded-[24px] border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none"
                                />

                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="text-sm text-slate-400">Posts are visible inside the selected group.</div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setNewText('')}
                                            className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 transition hover:border-slate-600"
                                        >
                                            Clear
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void handleCreatePost()}
                                            disabled={!selectedGroup || !newText.trim()}
                                            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-indigo-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:from-cyan-300 hover:to-indigo-300 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <Send className="h-4 w-4" />
                                            Post
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-4">
                            {loading ? (
                                <div className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-6 text-sm text-slate-400">Loading posts…</div>
                            ) : visiblePosts.length ? (
                                visiblePosts.map((post) => (
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
                                                            <span className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-300">You</span>
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
                                                onClick={() => void handleToggleLike(post)}
                                                className="inline-flex items-center gap-2 rounded-full px-1 py-0.5 text-slate-300 transition duration-200 hover:-translate-y-0.5 hover:text-rose-300"
                                                aria-label="Like post"
                                            >
                                                <Heart className={`h-4 w-4 ${isLikedByUser(post.likes) ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`} />
                                                <span>{(post.likes || []).length}</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setOpenRepliesByPost((current) => ({ ...current, [post.id]: !current[post.id] }))}
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
                                                    <button type="button" onClick={() => setOpenRepliesByPost((current) => ({ ...current, [post.id]: false }))} className="text-xs text-slate-400 hover:text-white">
                                                        Close
                                                    </button>
                                                </div>

                                                {(commentsByPost[post.id] || []).map((comment) => (
                                                    <div key={comment.id} className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-3 transition duration-200 hover:border-slate-700 hover:bg-slate-900/90">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex min-w-0 items-start gap-3">
                                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-white">
                                                                    {(comment.authorName || 'U').split(' ').map((s: string) => s[0]).slice(0, 2).join('')}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <div className="truncate font-medium text-white">{comment.authorName}</div>
                                                                        {isCurrentUser(comment.authorId) ? (
                                                                            <span className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">You</span>
                                                                        ) : null}
                                                                        <span className="text-xs text-slate-500">•</span>
                                                                        <div className="text-xs text-slate-400">{formatTime(comment.createdAt)}</div>
                                                                    </div>
                                                                    <div className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-300">{comment.text}</div>
                                                                    <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => void handleToggleCommentLike(post.id, comment)}
                                                                            className="inline-flex items-center gap-2 transition duration-200 hover:-translate-y-0.5 hover:text-rose-300"
                                                                            aria-label="Like comment"
                                                                        >
                                                                            <Heart className={`h-3.5 w-3.5 ${isLikedByUser(comment.likes) ? 'fill-rose-500 text-rose-500' : 'text-slate-500'}`} />
                                                                            <span>{(comment.likes || []).length || 0}</span>
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {canDeleteComment(comment) ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteComment(post.id, comment)}
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
                                                        onChange={(event) => setCommentTextByPost((current) => ({ ...current, [post.id]: event.target.value }))}
                                                        placeholder="Write a comment..."
                                                        className="flex-1 rounded-2xl border border-slate-700/80 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/50 focus:outline-none"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleCreateComment(post.id)}
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
                                <div className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-6 text-sm text-slate-400">
                                    No posts yet in this group.
                                </div>
                            )}
                        </section>
                    </section>
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
                                            ? 'Delete this post?'
                                            : deleteTarget.kind === 'group'
                                                ? 'Delete this group and all posts inside it?'
                                                : 'Delete this comment?'}
                                    </p>
                                    <p className="mt-1 truncate text-xs text-slate-500">{deleteTarget.title}</p>
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
