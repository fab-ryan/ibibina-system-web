"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function RouteProgress() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [progress, setProgress] = useState(0);
    const [visible, setVisible] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Track last route to detect changes
    const lastRoute = useRef<string>("");
    const currentRoute = pathname + searchParams.toString();

    useEffect(() => {
        if (lastRoute.current === currentRoute) return;
        lastRoute.current = currentRoute;

        // Start the bar
        setVisible(true);
        setProgress(15);

        intervalRef.current = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 85) {
                    clearInterval(intervalRef.current!);
                    return 85;
                }
                return prev + Math.random() * 12;
            });
        }, 200);

        // Complete after a short delay (route has settled)
        timerRef.current = setTimeout(() => {
            clearInterval(intervalRef.current!);
            setProgress(100);
            setTimeout(() => setVisible(false), 300);
        }, 600);

        return () => {
            clearInterval(intervalRef.current!);
            clearTimeout(timerRef.current!);
        };
    }, [currentRoute]);

    if (!visible) return null;

    return (
        <div
            className="pointer-events-none fixed inset-x-0 top-0 z-9998 h-0.5"
            aria-hidden="true"
        >
            <div
                className="h-full bg-(--ib-accent) transition-all duration-300 ease-out"
                style={{ width: `${progress}%`, opacity: progress >= 100 ? 0 : 1 }}
            />
        </div>
    );
}
