"use client"

import { useEffect, useState } from "react"

export function usePreloaderScreen() {
    const [isLoaded, setIsLoaded] = useState(false)
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        const globalAssets = [
            "/assets/car/car1.webp?v=2",
            "/assets/car/car2.webp?v=2",
            "/assets/car/car3.webp?v=2",
            "/assets/car/car4.webp?v=2",
            "/assets/car/car5.webp?v=2",
            "/assets/background/1.webp",
        ]
        const assetsImages = [
            "/assets/background/2.webp",
            "/assets/background/3.webp",
            "/assets/background/4.webp",
            "/assets/background/5.webp",
            "/assets/background/6.webp",
            "/assets/background/host/1.webp",
            "/assets/background/host/2.webp",
            "/assets/background/host/3.webp",
            "/assets/background/host/4.webp",
            "/assets/background/host/5.webp",
            "/assets/background/host/6.webp",
            "/assets/background/host/7.webp",
            "/assets/background/host/8.webp",
            "/assets/background/host/9.webp",
            "/assets/background/host/10.webp",
        ]

        const allImages = [
            ...globalAssets,
            ...assetsImages,
        ]

        let loadedCount = 0
        const total = allImages.length

        const checkDone = () => {
            loadedCount++
            setProgress((loadedCount / total) * 100)
            if (loadedCount >= total) setIsLoaded(true)
        }

        allImages.forEach((src) => {
            const img = new Image()
            img.src = src
            img.onload = checkDone
            img.onerror = checkDone
        })
    }, [])

    return { isLoaded, progress }
}