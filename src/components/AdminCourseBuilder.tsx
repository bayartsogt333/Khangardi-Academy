import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
    addLesson,
    addSection,
    deleteCourse,
    deleteLesson,
    deleteSection,
    createCourse,
    loadAdminCourses,
    loadCourseTree,
    reorderLessons,
    reorderSections,
    updateLesson,
    updateSection,
    updateCourse,
} from '../api/courses'
import type {
    CourseEditorDraft,
    CourseEditorSelection,
    CourseRecord,
    LessonDraft,
    LessonRecord,
    SectionDraft,
    SectionRecord,
} from '../types/course'

const emptyCourseDraft: CourseEditorDraft = {
    title: '',
    slug: '',
    description: '',
    category: '',
    level: '',
    status: 'draft',
}

const emptySectionDraft: SectionDraft = {
    title: '',
    description: '',
}

const emptyLessonDraft: LessonDraft = {
    title: '',
    youtubeUrl: '',
    notesTitle: '',
    notes: '',
    resourceLinks: [{ id: 'link-0', title: '', url: '' }],
}

let resourceLinkCounter = 0

function createResourceLink() {
    resourceLinkCounter += 1
    return { id: `link-${Date.now()}-${resourceLinkCounter}`, title: '', url: '' }
}

type CourseTree = {
    course: CourseRecord | null
    sections: Array<SectionRecord & { lessons: LessonRecord[] }>
}

type DragSource =
    | { kind: 'section'; sectionId: string }
    | { kind: 'lesson'; sectionId: string; lessonId: string }

type DeleteTarget =
    | { kind: 'course'; courseId: string; title: string }
    | { kind: 'section'; sectionId: string; title: string }
    | { kind: 'lesson'; sectionId: string; lessonId: string; title: string }

function courseToDraft(course: CourseRecord | null): CourseEditorDraft {
    if (!course) return emptyCourseDraft

    return {
        title: course.title,
        slug: course.slug,
        description: course.description,
        category: course.category,
        level: course.level,
        status: course.status,
    }
}

function youtubeEmbedUrl(videoId?: string | null) {
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null
}

function moveIdBeforeTarget(ids: string[], draggedId: string, targetId: string) {
    const next = ids.filter((id) => id !== draggedId)
    const targetIndex = next.indexOf(targetId)

    if (targetIndex < 0) {
        next.push(draggedId)
        return next
    }

    next.splice(targetIndex, 0, draggedId)
    return next
}

export function AdminCourseBuilder() {
    const { profile } = useAuth()
    const [courses, setCourses] = useState<CourseRecord[]>([])
    const [tree, setTree] = useState<CourseTree>({ course: null, sections: [] })
    const [selection, setSelection] = useState<CourseEditorSelection>({
        courseId: null,
        sectionId: null,
        lessonId: null,
    })
    const [courseDraft, setCourseDraft] = useState<CourseEditorDraft>(emptyCourseDraft)
    const [sectionDraft, setSectionDraft] = useState<SectionDraft>(emptySectionDraft)
    const [lessonDraft, setLessonDraft] = useState<LessonDraft>(emptyLessonDraft)
    const [thumbnailFile, setThumbnailFile] = useState<File | null>(null)
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [dragSource, setDragSource] = useState<DragSource | null>(null)
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)

    const selectedCourse = tree.course
    const selectedSection = tree.sections.find((section) => section.id === selection.sectionId) ?? null
    const selectedLesson = selectedSection?.lessons.find((lesson) => lesson.id === selection.lessonId) ?? null
    const lessonCount = useMemo(
        () => tree.sections.reduce((total, section) => total + section.lessons.length, 0),
        [tree.sections],
    )
    const selectedCourseCounts = useMemo(
        () => ({
            sectionCount: tree.sections.length,
            lessonCount,
        }),
        [lessonCount, tree.sections.length],
    )
    const selectedSectionLessonCount = selectedSection?.lessons.length ?? 0
    const selectedLessonLinkCount = selectedLesson?.resourceLinks.length ?? 0

    const reloadCourses = async (preferredCourseId?: string | null, options?: { resetSelection?: boolean }) => {
        const nextCourses = await loadAdminCourses()
        setCourses(nextCourses)

        if (options?.resetSelection) {
            setSelection({ courseId: nextCourses[0]?.id ?? null, sectionId: null, lessonId: null })
        } else if (preferredCourseId && nextCourses.some((course) => course.id === preferredCourseId)) {
            setSelection((current) => ({
                ...current,
                courseId: preferredCourseId,
            }))
        } else if (!selection.courseId && nextCourses[0]) {
            setSelection({ courseId: nextCourses[0].id, sectionId: null, lessonId: null })
        }

        return nextCourses
    }

    const reloadTree = async (courseId: string | null, preferredSectionId?: string | null, preferredLessonId?: string | null) => {
        if (!courseId) {
            setTree({ course: null, sections: [] })
            return
        }

        const nextTree = await loadCourseTree(courseId)
        setTree(
            nextTree
                ? {
                    course: {
                        id: nextTree.id,
                        title: nextTree.title,
                        slug: nextTree.slug,
                        description: nextTree.description,
                        category: nextTree.category,
                        level: nextTree.level,
                        status: nextTree.status,
                        thumbnailURL: nextTree.thumbnailURL,
                        thumbnailPath: nextTree.thumbnailPath,
                        createdBy: nextTree.createdBy,
                        createdAt: nextTree.createdAt,
                        updatedAt: nextTree.updatedAt,
                    },
                    sections: nextTree.sections,
                }
                : { course: null, sections: [] },
        )

        if (nextTree?.sections[0]) {
            const selectedSectionId =
                preferredSectionId && nextTree.sections.some((section) => section.id === preferredSectionId)
                    ? preferredSectionId
                    : selection.sectionId && nextTree.sections.some((section) => section.id === selection.sectionId)
                        ? selection.sectionId
                        : nextTree.sections[0].id

            const selectedSection = nextTree.sections.find((section) => section.id === selectedSectionId) ?? nextTree.sections[0]
            const selectedLessonId =
                preferredLessonId && selectedSection.lessons.some((lesson) => lesson.id === preferredLessonId)
                    ? preferredLessonId
                    : selection.lessonId && selectedSection.lessons.some((lesson) => lesson.id === selection.lessonId)
                        ? selection.lessonId
                        : null

            setSelection((current) => ({
                ...current,
                sectionId: selectedSection.id,
                lessonId: selectedLessonId,
            }))
        } else {
            setSelection((current) => ({ ...current, sectionId: null, lessonId: null }))
        }
    }

    useEffect(() => {
        void reloadCourses()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (!selection.courseId) {
            setTree({ course: null, sections: [] })
            setCourseDraft(emptyCourseDraft)
            return
        }

        void reloadTree(selection.courseId)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selection.courseId])

    useEffect(() => {
        setCourseDraft(courseToDraft(tree.course))
    }, [tree.course])

    useEffect(() => {
        if (!selectedSection) {
            setSectionDraft(emptySectionDraft)
            return
        }

        setSectionDraft({
            title: selectedSection.title,
            description: selectedSection.description,
        })
    }, [selectedSection])

    useEffect(() => {
        if (!selectedSection) {
            setLessonDraft(emptyLessonDraft)
            return
        }

        if (selectedLesson) {
            setLessonDraft({
                title: selectedLesson.title,
                youtubeUrl: selectedLesson.youtubeUrl,
                notesTitle: selectedLesson.notesTitle,
                notes: selectedLesson.notes,
                resourceLinks: selectedLesson.resourceLinks.length
                    ? selectedLesson.resourceLinks.map((link, index) => ({ id: `link-${selectedLesson.id}-${index}`, title: link.title, url: link.url }))
                    : [createResourceLink()],
            })
            return
        }

        setLessonDraft(emptyLessonDraft)
    }, [selectedLesson, selectedSection])

    const resetToNewCourse = () => {
        setSelection({ courseId: null, sectionId: null, lessonId: null })
        setCourseDraft(emptyCourseDraft)
        setSectionDraft(emptySectionDraft)
        setLessonDraft(emptyLessonDraft)
        setThumbnailFile(null)
        setMessage('')
        setError('')
        setTree({ course: null, sections: [] })
    }

    const selectCourse = (courseId: string) => {
        setSelection({ courseId, sectionId: null, lessonId: null })
        setSectionDraft(emptySectionDraft)
        setLessonDraft(emptyLessonDraft)
        setThumbnailFile(null)
        setMessage('')
        setError('')
    }

    const selectSection = (sectionId: string) => {
        // When selecting a section, default to no lesson selected so admins can add new lessons immediately
        setSelection((current) => ({ ...current, sectionId, lessonId: null }))
    }

    const selectLesson = (lessonId: string) => {
        setSelection((current) => ({ ...current, lessonId }))
    }

    const addResourceLinkRow = () => {
        setLessonDraft((current) => ({
            ...current,
            resourceLinks: [...current.resourceLinks, createResourceLink()],
        }))
    }

    const updateResourceLinkRow = (index: number, field: 'title' | 'url', value: string) => {
        setLessonDraft((current) => ({
            ...current,
            resourceLinks: current.resourceLinks.map((item, currentIndex) =>
                currentIndex === index ? { ...item, [field]: value } : item,
            ),
        }))
    }

    const removeResourceLinkRow = (index: number) => {
        setLessonDraft((current) => ({
            ...current,
            resourceLinks:
                current.resourceLinks.length > 1
                    ? current.resourceLinks.filter((_, currentIndex) => currentIndex !== index)
                    : [createResourceLink()],
        }))
    }

    const requestDeleteCourse = useCallback(() => {
        if (!selectedCourse) return

        setDeleteTarget({ kind: 'course', courseId: selectedCourse.id, title: selectedCourse.title })
    }, [selectedCourse])

    const requestDeleteSection = useCallback(() => {
        if (!selectedSection) return

        setDeleteTarget({ kind: 'section', sectionId: selectedSection.id, title: selectedSection.title })
    }, [selectedSection])

    const requestDeleteLesson = useCallback(() => {
        if (!selectedLesson || !selection.sectionId) return

        setDeleteTarget({
            kind: 'lesson',
            sectionId: selection.sectionId,
            lessonId: selectedLesson.id,
            title: selectedLesson.title,
        })
    }, [selectedLesson, selection.sectionId])

    const closeDeleteModal = useCallback(() => {
        if (busy) return
        setDeleteTarget(null)
    }, [busy])

    const handleConfirmDelete = useCallback(async () => {
        if (!deleteTarget || !selection.courseId) return

        setBusy(true)
        setError('')
        setMessage('')

        try {
            if (deleteTarget.kind === 'course') {
                await deleteCourse(deleteTarget.courseId)
                resetToNewCourse()
                await reloadCourses(null, { resetSelection: true })
                setMessage('Курс устгагдлаа.')
                return
            }

            if (deleteTarget.kind === 'section') {
                await deleteSection(selection.courseId, deleteTarget.sectionId)
                if (selection.sectionId === deleteTarget.sectionId) {
                    setSelection((current) => ({ ...current, sectionId: null, lessonId: null }))
                }
                setMessage('Хэсэг устгагдлаа.')
                await reloadCourses(selection.courseId)
                await reloadTree(selection.courseId)
                return
            }

            await deleteLesson(selection.courseId, deleteTarget.sectionId, deleteTarget.lessonId)
            if (selection.lessonId === deleteTarget.lessonId) {
                setSelection((current) => ({ ...current, lessonId: null }))
            }
            setMessage('Хичээл устгагдлаа.')
            await reloadCourses(selection.courseId)
            await reloadTree(selection.courseId)
        } catch (deleteError) {
            const firebaseError = deleteError as { message?: string }
            setError(firebaseError.message || 'Элементийг устгаж чадсангүй.')
        } finally {
            setBusy(false)
            setDeleteTarget(null)
        }
    }, [deleteTarget, reloadCourses, reloadTree, selection.courseId, selection.lessonId, selection.sectionId])

    const handleSectionDragStart = (sectionId: string) => {
        setDragSource({ kind: 'section', sectionId })
    }

    const handleLessonDragStart = (sectionId: string, lessonId: string) => {
        setDragSource({ kind: 'lesson', sectionId, lessonId })
    }

    const handleSectionDrop = async (targetSectionId: string) => {
        if (!selection.courseId || !dragSource || dragSource.kind !== 'section' || dragSource.sectionId === targetSectionId) {
            setDragSource(null)
            return
        }

        const orderedIds = moveIdBeforeTarget(
            tree.sections.map((section) => section.id),
            dragSource.sectionId,
            targetSectionId,
        )

        setBusy(true)
        setError('')
        setMessage('')

        try {
            await reorderSections(selection.courseId, orderedIds)
            setMessage('Хэсгийн дараалал шинэчлэгдлээ.')
            await reloadTree(selection.courseId)
        } catch (reorderError) {
            const firebaseError = reorderError as { message?: string }
            setError(firebaseError.message || 'Хэсгүүдийн дарааллыг өөрчилж чадсангүй.')
        } finally {
            setBusy(false)
            setDragSource(null)
        }
    }

    const handleLessonDrop = async (targetSectionId: string, targetLessonId: string) => {
        if (
            !selection.courseId ||
            !dragSource ||
            dragSource.kind !== 'lesson' ||
            dragSource.sectionId !== targetSectionId ||
            dragSource.lessonId === targetLessonId
        ) {
            setDragSource(null)
            return
        }

        const targetSection = tree.sections.find((section) => section.id === targetSectionId)
        if (!targetSection) {
            setDragSource(null)
            return
        }

        const orderedIds = moveIdBeforeTarget(
            targetSection.lessons.map((lesson) => lesson.id),
            dragSource.lessonId,
            targetLessonId,
        )

        setBusy(true)
        setError('')
        setMessage('')

        try {
            await reorderLessons(selection.courseId, targetSectionId, orderedIds)
            setMessage('Хичээлийн дараалал шинэчлэгдлээ.')
            await reloadTree(selection.courseId)
        } catch (reorderError) {
            const firebaseError = reorderError as { message?: string }
            setError(firebaseError.message || 'Хичээлүүдийн дарааллыг өөрчилж чадсангүй.')
        } finally {
            setBusy(false)
            setDragSource(null)
        }
    }

    const handleCourseSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!profile?.uid) return

        setBusy(true)
        setError('')
        setMessage('')
        let targetCourseId = selection.courseId

        try {
            if (selection.courseId) {
                await updateCourse(selection.courseId, courseDraft, thumbnailFile)
                setMessage('Курс шинэчлэгдлээ.')
            } else {
                const createdCourseId = await createCourse(courseDraft, profile.uid, thumbnailFile)
                targetCourseId = createdCourseId
                setSelection({ courseId: createdCourseId, sectionId: null, lessonId: null })
                setMessage('Курс үүсгэгдлээ.')
            }

            setThumbnailFile(null)
            await reloadCourses(targetCourseId)
            await reloadTree(targetCourseId)
        } catch (saveError) {
            const firebaseError = saveError as { message?: string }
            setError(firebaseError.message || 'Курсыг хадгалж чадсангүй.')
        } finally {
            setBusy(false)
        }
    }

    const handleSectionSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!selection.courseId) return

        setBusy(true)
        setError('')
        setMessage('')
        let nextSectionId = selectedSection?.id ?? selection.sectionId

        try {
            if (selectedSection) {
                await updateSection(selection.courseId, selectedSection.id, sectionDraft)
                setMessage('Хэсэг шинэчлэгдлээ.')
            } else {
                nextSectionId = await addSection(selection.courseId, sectionDraft)
                setSelection((current) => ({ ...current, sectionId: nextSectionId, lessonId: null }))
                setMessage('Хэсэг нэмэгдлээ.')
            }

            await reloadCourses(selection.courseId)
            await reloadTree(selection.courseId, nextSectionId, null)
        } catch (saveError) {
            const firebaseError = saveError as { message?: string }
            setError(firebaseError.message || 'Хэсгийг хадгалж чадсангүй.')
        } finally {
            setBusy(false)
        }
    }

    const handleLessonSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!selection.courseId || !selection.sectionId) return

        setBusy(true)
        setError('')
        setMessage('')
        let nextLessonId = selectedLesson?.id ?? selection.lessonId

        try {
            if (selectedLesson) {
                await updateLesson(selection.courseId, selection.sectionId, selectedLesson.id, lessonDraft)
                setMessage('Хичээл шинэчлэгдлээ.')
            } else {
                nextLessonId = await addLesson(selection.courseId, selection.sectionId, lessonDraft)
                setSelection((current) => ({ ...current, lessonId: nextLessonId }))
                setMessage('Хичээл нэмэгдлээ.')
            }

            await reloadCourses(selection.courseId)
            await reloadTree(selection.courseId, selection.sectionId, nextLessonId)
        } catch (saveError) {
            const firebaseError = saveError as { message?: string }
            setError(firebaseError.message || 'Хичээлийг хадгалж чадсангүй.')
        } finally {
            setBusy(false)
        }
    }

    const handleThumbnailUpload = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        setThumbnailFile(file ?? null)
    }

    return (
        <section className="admin-course-builder">
            <header className="admin-course-builder__hero">
                <div>

                    {deleteTarget ? (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 py-6 backdrop-blur-sm">
                            <div className="w-full max-w-md rounded-[28px] border border-slate-700 bg-slate-950 p-6 shadow-2xl shadow-black/60">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-300">
                                        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-xl font-semibold text-white">Устгахыг батлах</h3>
                                        <p className="mt-2 text-sm leading-6 text-slate-300">
                                            {deleteTarget.kind === 'course'
                                                ? `“${deleteTarget.title}” курс болон түүний бүх хэсэг, хичээл, бүртгэл, явц, ковер зургийг устгах уу?`
                                                : deleteTarget.kind === 'section'
                                                    ? `“${deleteTarget.title}” хэсэг болон доторх бүх хичээлийг устгах уу?`
                                                    : `“${deleteTarget.title}” хичээлийг устгах уу?`}
                                        </p>

                                        <div className="mt-4 grid gap-2 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-sm text-slate-300">
                                            {deleteTarget.kind === 'course' ? (
                                                <>
                                                    <div className="flex items-center justify-between gap-3">
                                                        <span>Устгах хэсгүүд</span>
                                                        <strong className="text-white">{selectedCourseCounts.sectionCount}</strong>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-3">
                                                        <span>Устгах хичээлүүд</span>
                                                        <strong className="text-white">{selectedCourseCounts.lessonCount}</strong>
                                                    </div>
                                                </>
                                            ) : deleteTarget.kind === 'section' ? (
                                                <div className="flex items-center justify-between gap-3">
                                                    <span>Хэсэг доторх хичээлүүд</span>
                                                    <strong className="text-white">{selectedSectionLessonCount}</strong>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between gap-3">
                                                    <span>Хичээлийн нөөц холбоосууд</span>
                                                    <strong className="text-white">{selectedLessonLinkCount}</strong>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={closeDeleteModal}
                                        disabled={busy}
                                        className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-100 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void handleConfirmDelete()}
                                        disabled={busy}
                                        className="inline-flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:border-rose-400/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                                        <span>{busy ? 'Deleting...' : 'Delete'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : null}
                    <span className="eyebrow">Админы курсийн студи</span>
                    <h2>Курс, хэсэг, хичээлүүд бүгд Firebase дээр тулгуурлан ажиллаж байна.</h2>
                    <p>
                        Эхлээд курс, дараа нь хэсэг, эцэст нь хичээл сонгоно. Курсийн ковер зураг Firebase Storage-д
                        хадгалагдаж, бүх агуулга өгөгдлийн санд бүртгэгдэнэ.
                    </p>
                </div>

                <div className="builder-stats">
                    <article>
                        <strong>{courses.length}</strong>
                        <span>Курс</span>
                    </article>
                    <article>
                        <strong>{tree.sections.length}</strong>
                        <span>Хэсэг</span>
                    </article>
                    <article>
                        <strong>{lessonCount}</strong>
                        <span>Хичээл</span>
                    </article>
                </div>
            </header>

            {(message || error) && (
                <div className="form-banner">
                    {message ? <p className="form-feedback form-feedback--success">{message}</p> : null}
                    {error ? <p className="form-feedback form-feedback--error">{error}</p> : null}
                </div>
            )}

            <div className="admin-course-builder__layout">
                <aside className="tree-panel">
                    <div className="panel-heading">
                        <div>
                            <span className="card-kicker">Курс</span>
                            <h3>Курсийн бүтэц</h3>
                        </div>
                        <button type="button" className="secondary-button" onClick={resetToNewCourse}>
                            Шинэ курс
                        </button>
                    </div>

                    <div className="tree-list">
                        {courses.map((course) => (
                            <button
                                key={course.id}
                                type="button"
                                className={course.id === selection.courseId ? 'tree-item active' : 'tree-item'}
                                onClick={() => selectCourse(course.id)}
                            >
                                <span>{course.title}</span>
                                <small>{course.status}</small>
                            </button>
                        ))}
                        {!courses.length ? <p className="helper-copy">Одоогоор курс алга.</p> : null}
                    </div>

                    <div className="tree-divider" />

                    <div className="panel-heading">
                        <div>
                            <span className="card-kicker">Хэсэг</span>
                            <h3>{selectedCourse?.title || 'Select a course'}</h3>
                        </div>
                    </div>

                    <div className="tree-list">
                        {tree.sections.map((section) => (
                            <div key={section.id} className="tree-group">
                                <div
                                    className="tree-entry"
                                    draggable
                                    onDragStart={() => handleSectionDragStart(section.id)}
                                    onDragOver={(event) => event.preventDefault()}
                                    onDrop={() => handleSectionDrop(section.id)}
                                    onDragEnd={() => setDragSource(null)}
                                >
                                    <span className="drag-handle" aria-hidden="true">
                                        <span />
                                        <span />
                                        <span />
                                    </span>

                                    <button
                                        type="button"
                                        className={section.id === selection.sectionId ? 'tree-item active' : 'tree-item'}
                                        onClick={() => selectSection(section.id)}
                                    >
                                        <span>{section.title}</span>
                                        <small>{section.lessons.length} хичээл</small>
                                    </button>
                                </div>

                                <div className="tree-children">
                                    {section.lessons.map((lesson) => (
                                        <div
                                            key={lesson.id}
                                            className="tree-entry tree-entry--child"
                                            draggable
                                            onDragStart={() => handleLessonDragStart(section.id, lesson.id)}
                                            onDragOver={(event) => event.preventDefault()}
                                            onDrop={() => handleLessonDrop(section.id, lesson.id)}
                                            onDragEnd={() => setDragSource(null)}
                                        >
                                            <span className="drag-handle" aria-hidden="true">
                                                <span />
                                                <span />
                                                <span />
                                            </span>

                                            <button
                                                type="button"
                                                className={lesson.id === selection.lessonId ? 'tree-child active' : 'tree-child'}
                                                onClick={() => selectLesson(lesson.id)}
                                            >
                                                <span>{lesson.title}</span>
                                                <small>{lesson.order}. хичээл</small>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {!tree.sections.length ? <p className="helper-copy">Одоогоор хэсэг алга.</p> : null}
                    </div>
                </aside>

                <div className="editor-panel">
                    <form className="course-form" onSubmit={handleCourseSubmit}>
                        <div className="panel-heading">
                            <div>
                                <span className="card-kicker">Курсын мэдээлэл</span>
                                <h3>{selection.courseId ? 'Сонгосон курсыг засах' : 'Шинэ курс үүсгэх'}</h3>
                            </div>
                            <div className="flex items-center gap-3">
                                {selectedCourse ? (
                                    <button
                                        type="button"
                                        onClick={requestDeleteCourse}
                                        disabled={busy}
                                        className="inline-flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:border-rose-400/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                                        <span>Курс устгах</span>
                                    </button>
                                ) : null}
                                <button type="submit" className="primary-button" disabled={busy}>
                                    {busy ? 'Хадгалж байна...' : selection.courseId ? 'Курс хадгалах' : 'Курс үүсгэх'}
                                </button>
                            </div>
                        </div>

                        <div className="form-grid">
                            <label>
                                <span>Гарчиг</span>
                                <input
                                    value={courseDraft.title}
                                    onChange={(event) => setCourseDraft((current) => ({ ...current, title: event.target.value }))}
                                    placeholder="Курсын гарчиг"
                                />
                            </label>

                            <label>
                                <span>URL нэр</span>
                                <input
                                    value={courseDraft.slug}
                                    onChange={(event) => setCourseDraft((current) => ({ ...current, slug: event.target.value }))}
                                    placeholder="course-slug"
                                />
                            </label>

                            <label>
                                <span>Ангилал</span>
                                <input
                                    value={courseDraft.category}
                                    onChange={(event) =>
                                        setCourseDraft((current) => ({ ...current, category: event.target.value }))
                                    }
                                    placeholder="Дизайн"
                                />
                            </label>

                            <label>
                                <span>Түвшин</span>
                                <input
                                    value={courseDraft.level}
                                    onChange={(event) => setCourseDraft((current) => ({ ...current, level: event.target.value }))}
                                    placeholder="Анхан шат"
                                />
                            </label>
                        </div>

                        <label>
                            <span>Тайлбар</span>
                            <textarea
                                value={courseDraft.description}
                                onChange={(event) =>
                                    setCourseDraft((current) => ({ ...current, description: event.target.value }))
                                }
                                rows={4}
                                placeholder="Курсын товч тайлбар"
                            />
                        </label>

                        <div className="media-dropzone">
                            <div>
                                <span className="card-kicker">Ковер</span>
                                <h4>Курсын ковер зураг оруулах</h4>
                                <p>
                                    {thumbnailFile
                                        ? thumbnailFile.name
                                        : 'Ковер зураг Firebase Storage-д хадгалагдана.'}
                                </p>
                            </div>
                            <label className="upload-button">
                                <input type="file" accept="image/*" onChange={handleThumbnailUpload} />
                                Зураг сонгох
                            </label>
                        </div>

                        <div className="status-switch">
                            <button
                                type="button"
                                className={courseDraft.status === 'draft' ? 'active' : ''}
                                onClick={() => setCourseDraft((current) => ({ ...current, status: 'draft' }))}
                            >
                                Ноорог
                            </button>
                            <button
                                type="button"
                                className={courseDraft.status === 'published' ? 'active' : ''}
                                onClick={() => setCourseDraft((current) => ({ ...current, status: 'published' }))}
                            >
                                Нийтлэгдсэн
                            </button>
                        </div>
                    </form>

                    <form className="course-form section-form" onSubmit={handleSectionSubmit}>
                        <div className="panel-heading">
                            <div>
                                <span className="card-kicker">Хэсэг</span>
                                <h3>{selectedSection ? 'Сонгосон хэсгийг засах' : 'Сонгосон курст хэсэг нэмэх'}</h3>
                            </div>
                            <div className="flex items-center gap-3">
                                {selectedSection ? (
                                    <button
                                        type="button"
                                        onClick={requestDeleteSection}
                                        disabled={busy}
                                        className="inline-flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:border-rose-400/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                                        <span>Хэсэг устгах</span>
                                    </button>
                                ) : null}
                                <button type="submit" className="primary-button" disabled={!selection.courseId || busy}>
                                    {busy ? 'Хадгалж байна...' : selectedSection ? 'Хэсэг хадгалах' : 'Хэсэг нэмэх'}
                                </button>
                            </div>
                        </div>

                        <div className="form-grid">
                            <label>
                                <span>Хэсгийн гарчиг</span>
                                <input
                                    value={sectionDraft.title}
                                    onChange={(event) =>
                                        setSectionDraft((current) => ({ ...current, title: event.target.value }))
                                    }
                                    placeholder="Оршил"
                                    disabled={!selection.courseId}
                                />
                            </label>

                            <label>
                                <span>Тайлбар</span>
                                <input
                                    value={sectionDraft.description}
                                    onChange={(event) =>
                                        setSectionDraft((current) => ({ ...current, description: event.target.value }))
                                    }
                                    placeholder="Хэсгийн тайлбар"
                                    disabled={!selection.courseId}
                                />
                            </label>
                        </div>
                    </form>

                    <form className="course-form lesson-form" onSubmit={handleLessonSubmit}>
                        <div className="panel-heading">
                            <div>
                                <span className="card-kicker">Хичээл</span>
                                <h3>{selectedLesson ? 'Сонгосон хичээлийг засах' : 'Сонгосон хэсэгт хичээл нэмэх'}</h3>
                            </div>
                            <div className="flex items-center gap-3">
                                {selectedLesson ? (
                                    <button
                                        type="button"
                                        onClick={requestDeleteLesson}
                                        disabled={busy}
                                        className="inline-flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:border-rose-400/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                                        <span>Хичээл устгах</span>
                                    </button>
                                ) : null}
                                <button
                                    type="submit"
                                    className="primary-button"
                                    disabled={!selection.courseId || !selection.sectionId || busy}
                                >
                                    {busy ? 'Хадгалж байна...' : selectedLesson ? 'Хичээл хадгалах' : 'Хичээл нэмэх'}
                                </button>
                            </div>
                        </div>

                        <div className="form-grid">
                            <label>
                                <span>Хичээлийн гарчиг</span>
                                <input
                                    value={lessonDraft.title}
                                    onChange={(event) =>
                                        setLessonDraft((current) => ({ ...current, title: event.target.value }))
                                    }
                                    placeholder="Хичээлийн гарчиг"
                                    disabled={!selection.sectionId}
                                />
                            </label>

                            <label>
                                <span>YouTube холбоос</span>
                                <input
                                    value={lessonDraft.youtubeUrl}
                                    onChange={(event) =>
                                        setLessonDraft((current) => ({ ...current, youtubeUrl: event.target.value }))
                                    }
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    disabled={!selection.sectionId}
                                />
                            </label>

                            {/* UX хүсэлтийн дагуу тэмдэглэлийн гарчгийн талбарыг хассан */}
                        </div>

                        <div className="space-y-3">
                            <label>
                                <span>Нэмэлт тэмдэглэл</span>
                                <textarea
                                    value={lessonDraft.notes}
                                    onChange={(event) =>
                                        setLessonDraft((current) => ({ ...current, notes: event.target.value }))
                                    }
                                    rows={5}
                                    placeholder="Хичээлийн тэмдэглэл"
                                    disabled={!selection.sectionId}
                                />
                            </label>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-medium text-slate-200">Холбоосууд</span>
                                <button
                                    type="button"
                                    onClick={addResourceLinkRow}
                                    disabled={!selection.sectionId}
                                    className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200 transition hover:border-cyan-300/40 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    + Холбоос нэмэх
                                </button>
                            </div>
                            <div className="space-y-3">
                                {lessonDraft.resourceLinks.map((link, index) => (
                                    <div key={link.id} className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 md:grid-cols-[1fr_1.2fr_auto] md:items-end">
                                        <label>
                                            <span>Холбоосын нэр</span>
                                            <input
                                                value={link.title}
                                                onChange={(event) => updateResourceLinkRow(index, 'title', event.target.value)}
                                                placeholder="Нөөцийн нэр"
                                                disabled={!selection.sectionId}
                                            />
                                        </label>

                                        <label>
                                            <span>Холбоосын URL</span>
                                            <input
                                                value={link.url}
                                                onChange={(event) => updateResourceLinkRow(index, 'url', event.target.value)}
                                                placeholder="https://..."
                                                disabled={!selection.sectionId}
                                            />
                                        </label>

                                        <button
                                            type="button"
                                            onClick={() => removeResourceLinkRow(index)}
                                            disabled={!selection.sectionId}
                                            className="rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-rose-400/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            Устгах
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </form>

                    <section className="preview-panel">
                        <div className="panel-heading">
                            <div>
                                <span className="card-kicker">Урьдчилан харах</span>
                                <h3>{selectedCourse?.title || 'Курс сонгох эсвэл үүсгэх'}</h3>
                            </div>
                        </div>

                        <div className="preview-meta">
                            <span>{selectedCourse?.category || 'Ангилал'}</span>
                            <span>{selectedCourse?.level || 'Түвшин'}</span>
                            <span>{selectedCourse?.status || 'ноорог'}</span>
                        </div>

                        <div className="thumbnail-preview">
                            {selectedCourse?.thumbnailURL ? (
                                <img src={selectedCourse.thumbnailURL} alt="Course thumbnail preview" />
                            ) : (
                                <div>
                                    <strong>Одоогоор ковер зураггүй</strong>
                                    <span>Ковер зураг оруулбал Firebase Storage-д хадгалагдана.</span>
                                </div>
                            )}
                        </div>

                        <article className="lesson-view__card">
                            <span className="card-kicker">Сонгосон хичээл</span>
                            <h4>{selectedLesson?.title || 'Хичээл сонгогдоогүй'}</h4>
                            {selectedLesson?.resourceLinks.length ? (
                                <div className="space-y-2">
                                    <span className="card-kicker">Холбоосууд</span>
                                    <ul className="space-y-1">
                                        {selectedLesson.resourceLinks.map((link) => (
                                            <li key={`${link.title}-${link.url}`}>
                                                <a href={link.url} target="_blank" rel="noreferrer" className="text-cyan-300 underline decoration-cyan-300/40 underline-offset-4">
                                                    {link.title || link.url}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : null}
                            {youtubeEmbedUrl(selectedLesson?.youtubeVideoId) ? (
                                <div className="video-frame">
                                    <iframe
                                        src={youtubeEmbedUrl(selectedLesson?.youtubeVideoId) ?? undefined}
                                        title={selectedLesson?.title || 'Lesson video'}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                </div>
                            ) : null}
                            <p>{selectedLesson?.notes || 'Зүүн талын модноос хичээл сонгоно уу.'}</p>
                        </article>
                    </section>
                </div>
            </div>
        </section>
    )
}