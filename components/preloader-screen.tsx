"use client"

import { useEffect, useState } from "react"

export function usePreloaderScreen() {
    const [isLoaded, setIsLoaded] = useState(false)
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        // const lastPreload = localStorage.getItem("lastPreload");
        // if (lastPreload && Date.now() - parseInt(lastPreload) < 7 * 24 * 60 * 60 * 1000) {
        //     setIsLoaded(true);
        //     return;
        // }

        const globalAssets = [
            "/assets/car/car1_v2.webp",
            "/assets/car/car2_v2.webp",
            "/assets/car/car3_v2.webp",
            "/assets/car/car4_v2.webp",
            "/assets/car/car5_v2.webp",
        ]
        const assetsImages = [
            "/assets/background/2_v2.webp",
            "/assets/background/4_v2.webp",
            "/assets/background/host/1.webp",
            "/assets/background/host/3.webp",
            "/assets/background/host/4.webp",
            "/assets/background/host/7.webp",
        ]
        const racingAssets = [
            "/racing-game/images/sprites.png"
        ]

        const allImages = [
            ...globalAssets,
            ...assetsImages,
            ...racingAssets
        ]

        let loadedCount = 0
        const total = allImages.length

        const checkDone = () => {
            loadedCount++
            setProgress((loadedCount / total) * 100)
            if (loadedCount >= total) {
                // localStorage.setItem("lastPreload", Date.now().toString());
                setIsLoaded(true);
            }
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