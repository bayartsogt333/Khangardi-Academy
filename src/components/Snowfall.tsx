import { useMemo } from 'react'

export function Snowfall() {
    const flakes = useMemo(
        () =>
            Array.from({ length: 64 }).map((_, i) => {
                const left = Math.random() * 100
                const size = 2 + Math.random() * 5
                const delay = Math.random() * -40
                const duration = 22 + Math.random() * 22
                const opacity = 0.14 + Math.random() * 0.32
                const drift = (Math.random() * 28) - 14
                return { id: i, left, size, delay, duration, opacity, drift }
            }),
        [] as Array<{ id: number; left: number; size: number; delay: number; duration: number; opacity: number; drift: number }>,
    )

    const glows = useMemo(
        () => [
            { id: 'glow-1', left: -10, top: 8, size: 52, hue: 'rgba(103, 232, 249, 0.14)', blur: 96, duration: 28 },
            { id: 'glow-2', left: 58, top: -14, size: 48, hue: 'rgba(129, 140, 248, 0.14)', blur: 104, duration: 34 },
            { id: 'glow-3', left: 76, top: 56, size: 40, hue: 'rgba(186, 230, 253, 0.10)', blur: 112, duration: 38 },
        ],
        [],
    )

    const auroraRibbons = useMemo(
        () => [
            {
                id: 'aurora-1',
                left: '-12%',
                top: '8%',
                width: '128%',
                height: '18vh',
                background: 'linear-gradient(90deg, transparent 0%, rgba(34, 211, 238, 0.08) 18%, rgba(103, 232, 249, 0.18) 46%, rgba(129, 140, 248, 0.08) 70%, transparent 100%)',
                blur: 64,
                rotate: '-8deg',
                duration: 24,
            },
            {
                id: 'aurora-2',
                left: '-8%',
                top: '18%',
                width: '118%',
                height: '14vh',
                background: 'linear-gradient(90deg, transparent 0%, rgba(165, 243, 252, 0.05) 20%, rgba(167, 139, 250, 0.16) 50%, rgba(103, 232, 249, 0.08) 76%, transparent 100%)',
                blur: 78,
                rotate: '10deg',
                duration: 30,
            },
        ],
        [],
    )

    return (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden mix-blend-screen">
            <style>{`
                @keyframes khg-fall {
                    0% { transform: translateY(-10vh) translateX(0); opacity: 0 }
                    8% { opacity: 1 }
                    100% { transform: translateY(110vh) translateX(var(--drift)); opacity: 0.3 }
                }

                @keyframes khg-drift {
                    0%, 100% { transform: translate3d(0, 0, 0) scale(1) }
                    50% { transform: translate3d(0, 12px, 0) scale(1.04) }
                }
            `}</style>

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.10),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(129,140,248,0.08),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.06),rgba(15,23,42,0.18))]" />

            {auroraRibbons.map((ribbon) => (
                <span
                    key={ribbon.id}
                    aria-hidden
                    style={{
                        position: 'absolute',
                        left: ribbon.left,
                        top: ribbon.top,
                        width: ribbon.width,
                        height: ribbon.height,
                        background: ribbon.background,
                        filter: `blur(${ribbon.blur}px)`,
                        transform: `rotate(${ribbon.rotate}) translate3d(0, 0, 0)`,
                        opacity: 0.9,
                        borderRadius: '9999px',
                        animation: `khg-drift ${ribbon.duration}s ease-in-out infinite`,
                    }}
                />
            ))}

            {glows.map((glow) => (
                <span
                    key={glow.id}
                    aria-hidden
                    style={{
                        position: 'absolute',
                        left: `${glow.left}%`,
                        top: `${glow.top}%`,
                        width: `${glow.size}vw`,
                        height: `${glow.size}vw`,
                        minWidth: '260px',
                        minHeight: '260px',
                        borderRadius: '9999px',
                        background: glow.hue,
                        filter: `blur(${glow.blur}px)`,
                        opacity: 1,
                        animation: `khg-drift ${glow.duration}s ease-in-out infinite`,
                    }}
                />
            ))}

            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_42%,rgba(2,6,23,0.14)_100%)]" />

            {flakes.map((f) => (
                <span
                    key={f.id}
                    aria-hidden
                    style={{
                        position: 'absolute',
                        left: `${f.left}%`,
                        top: '-10vh',
                        width: `${f.size}px`,
                        height: `${f.size}px`,
                        borderRadius: '50%',
                        background: 'white',
                        opacity: f.opacity,
                        transform: 'translateY(-10vh)',
                        ['--drift' as string]: `${f.drift}px`,
                        animation: `khg-fall ${f.duration}s linear ${f.delay}s infinite`,
                        filter: 'blur(0.3px)',
                    }}
                />
            ))}
        </div>
    )
}

export default Snowfall
