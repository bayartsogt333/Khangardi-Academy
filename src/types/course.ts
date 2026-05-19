export type CourseStatus = 'draft' | 'published'

export type CourseNodeKind = 'course' | 'section' | 'lesson'

export type CourseRecord = {
    id: string
    title: string
    slug: string
    description: string
    category: string
    level: string
    status: CourseStatus
    thumbnailURL: string | null
    thumbnailPath: string | null
    createdBy: string
    createdAt: string | null
    updatedAt: string | null
}

export type SectionRecord = {
    id: string
    title: string
    description: string
    order: number
    courseId: string
    createdAt: string | null
    updatedAt: string | null
}

export type LessonRecord = {
    id: string
    title: string
    youtubeUrl: string
    youtubeVideoId: string
    notesTitle: string
    notes: string
    resourceLinks: Array<{ title: string; url: string }>
    order: number
    courseId: string
    sectionId: string
    createdAt: string | null
    updatedAt: string | null
}

export type CourseLessonDraft = {
    id: string
    title: string
    youtubeUrl: string
    notesTitle: string
    notes: string
    resourceLinks: string[]
}

export type CourseSectionDraft = {
    id: string
    title: string
    description: string
    lessons: CourseLessonDraft[]
}

export type CourseDraft = {
    title: string
    slug: string
    description: string
    category: string
    level: string
    thumbnailPreview: string | null
    status: CourseStatus
    sections: CourseSectionDraft[]
}

export type CourseEditorSelection = {
    courseId: string | null
    sectionId: string | null
    lessonId: string | null
}

export type CourseEditorDraft = {
    title: string
    slug: string
    description: string
    category: string
    level: string
    status: CourseStatus
}

export type SectionDraft = {
    title: string
    description: string
}

export type LessonDraft = {
    title: string
    youtubeUrl: string
    notesTitle: string
    notes: string
    resourceLinks: Array<{ id: string; title: string; url: string }>
}

export type EnrollmentRecord = {
    id: string
    courseId: string
    userId: string
    displayName?: string | null
    email?: string | null
    status: 'pending' | 'approved' | 'rejected'
    createdAt: string | null
    updatedAt: string | null
}

export type LessonProgressRecord = {
    id: string
    courseId: string
    userId: string
    lessonId: string
    completed: boolean
    createdAt: string | null
    updatedAt: string | null
}