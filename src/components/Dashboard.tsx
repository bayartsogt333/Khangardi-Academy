import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { AdminCourseBuilder } from './AdminCourseBuilder'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../api/firebase'
import { loadAdminCourses } from '../api/courses'
import { AdminHeader } from './AdminHeader'

export function Dashboard() {
    const { logout, profile } = useAuth()

    const [pendingCount, setPendingCount] = useState(0)

    useEffect(() => {
        if (profile?.role !== 'admin') return

        let cancelled = false
        const unsubs: Array<() => void> = []
        const countsByCourse = new Map<string, number>()

        void loadAdminCourses().then((courses) => {
            if (cancelled) return

            if (!courses.length) {
                setPendingCount(0)
                return
            }

            const updateTotal = () => {
                if (cancelled) return

                const total = Array.from(countsByCourse.values()).reduce((sum, value) => sum + value, 0)
                setPendingCount(total)
            }

            courses.forEach((course) => {
                const courseQuery = query(collection(db, 'courses', course.id, 'enrollments'), where('status', '==', 'pending'))
                const unsub = onSnapshot(courseQuery, (snapshot) => {
                    countsByCourse.set(course.id, snapshot.size)
                    updateTotal()
                })

                unsubs.push(unsub)
            })
        })

        return () => {
            cancelled = true
            unsubs.forEach((unsub) => unsub())
        }
    }, [profile?.role])

    return (
        <section className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
                <AdminHeader profile={profile} onLogout={logout} activePage="studio" pendingCount={pendingCount} />

                {profile?.role === 'admin' ? (
                    <div className="grid gap-6">
                        <AdminCourseBuilder />
                    </div>
                ) : (
                    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-400" />
                )}
            </div>
        </section>
    )
}
