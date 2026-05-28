export default function AppLoading() {
    return (
        <div
            className="fixed inset-0 z-9999 flex flex-col items-center justify-center bg-white"
            aria-label="Loading application"
            role="status"
        >
            {/* Top progress bar */}
            <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden">
                <div className="h-full w-full origin-left animate-[progress-bar_1.4s_ease-in-out_infinite] bg-(--ib-accent)" />
            </div>

            {/* Logo mark */}
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-(--ib-accent) shadow-lg shadow-(--ib-accent)/30">
                <span className="text-2xl font-extrabold tracking-tight text-white">IB</span>
            </div>

            {/* Brand name */}
            <p className="text-xl font-extrabold tracking-tight text-(--ib-ink)">
                IBIBINA
            </p>
            <p className="mt-1 text-sm text-(--ib-muted)">Loading your workspace…</p>

            {/* Spinner dots */}
            <div className="mt-8 flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                    <span
                        key={i}
                        className="h-2 w-2 rounded-full bg-(--ib-accent) opacity-80"
                        style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
                    />
                ))}
            </div>
        </div>
    );
}
