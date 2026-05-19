import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import {
    addLesson,
    addSection,
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

    const selectedCourse = tree.course
    const selectedSection = tree.sections.find((section) => section.id === selection.sectionId) ?? null
    const selectedLesson = selectedSection?.lessons.find((lesson) => lesson.id === selection.lessonId) ?? null
    const lessonCount = useMemo(
        () => tree.sections.reduce((total, section) => total + section.lessons.length, 0),
        [tree.sections],
    )

    const reloadCourses = async (preferredCourseId?: string | null) => {
        const nextCourses = await loadAdminCourses()
        setCourses(nextCourses)

        if (preferredCourseId && nextCourses.some((course) => course.id === preferredCourseId)) {
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

    const handleSectionDelete = async (sectionId: string) => {
        if (!selection.courseId) return

        setBusy(true)
        setError('')
        setMessage('')

        try {
            await deleteSection(selection.courseId, sectionId)
            setMessage('Section deleted.')
            if (selection.sectionId === sectionId) {
                setSelection((current) => ({ ...current, sectionId: null, lessonId: null }))
            }
            await reloadCourses(selection.courseId)
            await reloadTree(selection.courseId)
        } catch (deleteError) {
            const firebaseError = deleteError as { message?: string }
            setError(firebaseError.message || 'Failed to delete section.')
        } finally {
            setBusy(false)
        }
    }

    const handleLessonDelete = async (sectionId: string, lessonId: string) => {
        if (!selection.courseId) return

        setBusy(true)
        setError('')
        setMessage('')

        try {
            await deleteLesson(selection.courseId, sectionId, lessonId)
            setMessage('Lesson deleted.')
            if (selection.lessonId === lessonId) {
                setSelection((current) => ({ ...current, lessonId: null }))
            }
            await reloadCourses(selection.courseId)
            await reloadTree(selection.courseId)
        } catch (deleteError) {
            const firebaseError = deleteError as { message?: string }
            setError(firebaseError.message || 'Failed to delete lesson.')
        } finally {
            setBusy(false)
        }
    }

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
            setMessage('Section order updated.')
            await reloadTree(selection.courseId)
        } catch (reorderError) {
            const firebaseError = reorderError as { message?: string }
            setError(firebaseError.message || 'Failed to reorder sections.')
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
            setMessage('Lesson order updated.')
            await reloadTree(selection.courseId)
        } catch (reorderError) {
            const firebaseError = reorderError as { message?: string }
            setError(firebaseError.message || 'Failed to reorder lessons.')
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
                setMessage('Course updated.')
            } else {
                const createdCourseId = await createCourse(courseDraft, profile.uid, thumbnailFile)
                targetCourseId = createdCourseId
                setSelection({ courseId: createdCourseId, sectionId: null, lessonId: null })
                setMessage('Course created.')
            }

            setThumbnailFile(null)
            await reloadCourses(targetCourseId)
            await reloadTree(targetCourseId)
        } catch (saveError) {
            const firebaseError = saveError as { message?: string }
            setError(firebaseError.message || 'Failed to save course.')
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
                setMessage('Section updated.')
            } else {
                nextSectionId = await addSection(selection.courseId, sectionDraft)
                setSelection((current) => ({ ...current, sectionId: nextSectionId, lessonId: null }))
                setMessage('Section added.')
            }

            await reloadCourses(selection.courseId)
            await reloadTree(selection.courseId, nextSectionId, null)
        } catch (saveError) {
            const firebaseError = saveError as { message?: string }
            setError(firebaseError.message || 'Failed to save section.')
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
                setMessage('Lesson updated.')
            } else {
                nextLessonId = await addLesson(selection.courseId, selection.sectionId, lessonDraft)
                setSelection((current) => ({ ...current, lessonId: nextLessonId }))
                setMessage('Lesson added.')
            }

            await reloadCourses(selection.courseId)
            await reloadTree(selection.courseId, selection.sectionId, nextLessonId)
        } catch (saveError) {
            const firebaseError = saveError as { message?: string }
            setError(firebaseError.message || 'Failed to save lesson.')
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
                    <span className="eyebrow">Admin course studio</span>
                    <h2>Courses, sections, and lessons are now Firebase-backed.</h2>
                    <p>
                        Select a course first, then a section, then a lesson. The course thumbnail uploads to Firebase
                        Storage and all content is saved in Firestore.
                    </p>
                </div>

                <div className="builder-stats">
                    <article>
                        <strong>{courses.length}</strong>
                        <span>Courses</span>
                    </article>
                    <article>
                        <strong>{tree.sections.length}</strong>
                        <span>Sections</span>
                    </article>
                    <article>
                        <strong>{lessonCount}</strong>
                        <span>Lessons</span>
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
                            <span className="card-kicker">Courses</span>
                            <h3>Course tree</h3>
                        </div>
                        <button type="button" className="secondary-button" onClick={resetToNewCourse}>
                            New course
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
                        {!courses.length ? <p className="helper-copy">No courses yet.</p> : null}
                    </div>

                    <div className="tree-divider" />

                    <div className="panel-heading">
                        <div>
                            <span className="card-kicker">Sections</span>
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
                                        <small>{section.lessons.length} lessons</small>
                                    </button>

                                    <div className="tree-actions">
                                        <button
                                            type="button"
                                            className="icon-button danger"
                                            aria-label="Delete section"
                                            title="Delete section"
                                            onClick={() => handleSectionDelete(section.id)}
                                        >
                                            ×
                                        </button>
                                    </div>
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
                                                <small>{lesson.order}. lesson</small>
                                            </button>

                                            <div className="tree-actions">
                                                <button
                                                    type="button"
                                                    className="icon-button danger"
                                                    aria-label="Delete lesson"
                                                    title="Delete lesson"
                                                    onClick={() => handleLessonDelete(section.id, lesson.id)}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {!tree.sections.length ? <p className="helper-copy">No sections yet.</p> : null}
                    </div>
                </aside>

                <div className="editor-panel">
                    <form className="course-form" onSubmit={handleCourseSubmit}>
                        <div className="panel-heading">
                            <div>
                                <span className="card-kicker">Course details</span>
                                <h3>{selection.courseId ? 'Edit selected course' : 'Create a new course'}</h3>
                            </div>
                            <button type="submit" className="primary-button" disabled={busy}>
                                {busy ? 'Saving...' : selection.courseId ? 'Save course' : 'Create course'}
                            </button>
                        </div>

                        <div className="form-grid">
                            <label>
                                <span>Title</span>
                                <input
                                    value={courseDraft.title}
                                    onChange={(event) => setCourseDraft((current) => ({ ...current, title: event.target.value }))}
                                    placeholder="Course title"
                                />
                            </label>

                            <label>
                                <span>Slug</span>
                                <input
                                    value={courseDraft.slug}
                                    onChange={(event) => setCourseDraft((current) => ({ ...current, slug: event.target.value }))}
                                    placeholder="course-slug"
                                />
                            </label>

                            <label>
                                <span>Category</span>
                                <input
                                    value={courseDraft.category}
                                    onChange={(event) =>
                                        setCourseDraft((current) => ({ ...current, category: event.target.value }))
                                    }
                                    placeholder="Design"
                                />
                            </label>

                            <label>
                                <span>Level</span>
                                <input
                                    value={courseDraft.level}
                                    onChange={(event) => setCourseDraft((current) => ({ ...current, level: event.target.value }))}
                                    placeholder="Beginner"
                                />
                            </label>
                        </div>

                        <label>
                            <span>Description</span>
                            <textarea
                                value={courseDraft.description}
                                onChange={(event) =>
                                    setCourseDraft((current) => ({ ...current, description: event.target.value }))
                                }
                                rows={4}
                                placeholder="Short description of the course"
                            />
                        </label>

                        <div className="media-dropzone">
                            <div>
                                <span className="card-kicker">Thumbnail</span>
                                <h4>Upload course cover</h4>
                                <p>
                                    {thumbnailFile
                                        ? thumbnailFile.name
                                        : 'Thumbnail image will be stored in Firebase Storage.'}
                                </p>
                            </div>
                            <label className="upload-button">
                                <input type="file" accept="image/*" onChange={handleThumbnailUpload} />
                                Choose image
                            </label>
                        </div>

                        <div className="status-switch">
                            <button
                                type="button"
                                className={courseDraft.status === 'draft' ? 'active' : ''}
                                onClick={() => setCourseDraft((current) => ({ ...current, status: 'draft' }))}
                            >
                                Draft
                            </button>
                            <button
                                type="button"
                                className={courseDraft.status === 'published' ? 'active' : ''}
                                onClick={() => setCourseDraft((current) => ({ ...current, status: 'published' }))}
                            >
                                Published
                            </button>
                        </div>
                    </form>

                    <form className="course-form section-form" onSubmit={handleSectionSubmit}>
                        <div className="panel-heading">
                            <div>
                                <span className="card-kicker">Section</span>
                                <h3>{selectedSection ? 'Edit selected section' : 'Add section to selected course'}</h3>
                            </div>
                            <button type="submit" className="primary-button" disabled={!selection.courseId || busy}>
                                {busy ? 'Saving...' : selectedSection ? 'Save section' : 'Add section'}
                            </button>
                        </div>

                        <div className="form-grid">
                            <label>
                                <span>Section title</span>
                                <input
                                    value={sectionDraft.title}
                                    onChange={(event) =>
                                        setSectionDraft((current) => ({ ...current, title: event.target.value }))
                                    }
                                    placeholder="Introduction"
                                    disabled={!selection.courseId}
                                />
                            </label>

                            <label>
                                <span>Description</span>
                                <input
                                    value={sectionDraft.description}
                                    onChange={(event) =>
                                        setSectionDraft((current) => ({ ...current, description: event.target.value }))
                                    }
                                    placeholder="Section description"
                                    disabled={!selection.courseId}
                                />
                            </label>
                        </div>
                    </form>

                    <form className="course-form lesson-form" onSubmit={handleLessonSubmit}>
                        <div className="panel-heading">
                            <div>
                                <span className="card-kicker">Lesson</span>
                                <h3>{selectedLesson ? 'Edit selected lesson' : 'Add lesson to selected section'}</h3>
                            </div>
                            <button
                                type="submit"
                                className="primary-button"
                                disabled={!selection.courseId || !selection.sectionId || busy}
                            >
                                {busy ? 'Saving...' : selectedLesson ? 'Save lesson' : 'Add lesson'}
                            </button>
                        </div>

                        <div className="form-grid">
                            <label>
                                <span>Lesson title</span>
                                <input
                                    value={lessonDraft.title}
                                    onChange={(event) =>
                                        setLessonDraft((current) => ({ ...current, title: event.target.value }))
                                    }
                                    placeholder="Lesson title"
                                    disabled={!selection.sectionId}
                                />
                            </label>

                            <label>
                                <span>YouTube URL</span>
                                <input
                                    value={lessonDraft.youtubeUrl}
                                    onChange={(event) =>
                                        setLessonDraft((current) => ({ ...current, youtubeUrl: event.target.value }))
                                    }
                                    placeholder="https://www.youtube.com/watch?v=..."
                                    disabled={!selection.sectionId}
                                />
                            </label>

                            <label>
                                <span>Notes title</span>
                                <input
                                    value={lessonDraft.notesTitle}
                                    onChange={(event) =>
                                        setLessonDraft((current) => ({ ...current, notesTitle: event.target.value }))
                                    }
                                    placeholder="What to remember"
                                    disabled={!selection.sectionId}
                                />
                            </label>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-medium text-slate-200">Links</span>
                                <button
                                    type="button"
                                    onClick={addResourceLinkRow}
                                    disabled={!selection.sectionId}
                                    className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200 transition hover:border-cyan-300/40 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    + Add link
                                </button>
                            </div>

                            <label>
                                <span>Rich notes</span>
                                <textarea
                                    value={lessonDraft.notes}
                                    onChange={(event) =>
                                        setLessonDraft((current) => ({ ...current, notes: event.target.value }))
                                    }
                                    rows={5}
                                    placeholder="Lesson notes"
                                    disabled={!selection.sectionId}
                                />
                            </label>
                            <div className="space-y-3">
                                {lessonDraft.resourceLinks.map((link, index) => (
                                    <div key={link.id} className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 md:grid-cols-[1fr_1.2fr_auto] md:items-end">
                                        <label>
                                            <span>Link title</span>
                                            <input
                                                value={link.title}
                                                onChange={(event) => updateResourceLinkRow(index, 'title', event.target.value)}
                                                placeholder="Resource title"
                                                disabled={!selection.sectionId}
                                            />
                                        </label>

                                        <label>
                                            <span>Link URL</span>
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
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </form>

                    <section className="preview-panel">
                        <div className="panel-heading">
                            <div>
                                <span className="card-kicker">Preview</span>
                                <h3>{selectedCourse?.title || 'Select or create a course'}</h3>
                            </div>
                        </div>

                        <div className="preview-meta">
                            <span>{selectedCourse?.category || 'Category'}</span>
                            <span>{selectedCourse?.level || 'Level'}</span>
                            <span>{selectedCourse?.status || 'draft'}</span>
                        </div>

                        <div className="thumbnail-preview">
                            {selectedCourse?.thumbnailURL ? (
                                <img src={selectedCourse.thumbnailURL} alt="Course thumbnail preview" />
                            ) : (
                                <div>
                                    <strong>No thumbnail yet</strong>
                                    <span>Upload a cover image to store in Firebase Storage.</span>
                                </div>
                            )}
                        </div>

                        <article className="lesson-view__card">
                            <span className="card-kicker">Selected lesson</span>
                            <h4>{selectedLesson?.title || 'No lesson selected'}</h4>
                            {selectedLesson?.resourceLinks.length ? (
                                <div className="space-y-2">
                                    <span className="card-kicker">Links</span>
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
                            {selectedLesson?.notesTitle ? <h5>{selectedLesson.notesTitle}</h5> : null}
                            <p>{selectedLesson?.notes || 'Pick a lesson from the tree on the left.'}</p>
                        </article>
                    </section>
                </div>
            </div>
        </section>
    )
}