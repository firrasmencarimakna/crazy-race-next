"use client"

import { useEffect, useState } from "react"

export function usePreloader() {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const assetsImages = [
      "/assets/car/car1.webp",
      "/assets/car/car2.webp",
      "/assets/car/car3.webp",
      "/assets/car/car4.webp",
      "/assets/car/car5.webp",
      "/assets/gif/1.webp",
      "/assets/gif/2.webp",
      "/assets/gif/3.webp",
      "/assets/gif/4.webp",
      "/assets/gif/5.webp",
      "/assets/gif/6.webp",
      "/assets/gif/host/1.webp",
      "/assets/gif/host/2.webp",
      "/assets/gif/host/3.webp",
      "/assets/gif/host/4.webp",
      "/assets/gif/host/5.webp",
      "/assets/gif/host/6.webp",
      "/assets/gif/host/7.webp",
      "/assets/gif/host/8.webp",
    ]

    // const racingImages = [
    //   "/racing-game/images/background/6.gif",
    //   "/racing-game/images/background/background.svg",
    //   "/racing-game/images/background/hills.png",
    //   "/racing-game/images/background/sky.png",
    //   "/racing-game/images/background/trees.png",
    //   "/racing-game/images/sprites/billboard01.png",
    //   "/racing-game/images/sprites/billboard02.png",
    //   "/racing-game/images/sprites/billboard03.png",
    //   "/racing-game/images/sprites/billboard04.png",
    //   "/racing-game/images/sprites/billboard05.png",
    //   "/racing-game/images/sprites/billboard06.png",
    //   "/racing-game/images/sprites/billboard07.png",
    //   "/racing-game/images/sprites/billboard08.png",
    //   "/racing-game/images/sprites/billboard09.png",
    //   "/racing-game/images/sprites/boulder1.png",
    //   "/racing-game/images/sprites/boulder2.png",
    //   "/racing-game/images/sprites/boulder3.png",
    //   "/racing-game/images/sprites/bush1.png",
    //   "/racing-game/images/sprites/bush2.png",
    //   "/racing-game/images/sprites/cactus.png",
    //   "/racing-game/images/sprites/car01.png",
    //   "/racing-game/images/sprites/car02.png",
    //   "/racing-game/images/sprites/car03.png",
    //   "/racing-game/images/sprites/car04.png",
    //   "/racing-game/images/sprites/column.png",
    //   "/racing-game/images/sprites/dead_tree1.png",
    //   "/racing-game/images/sprites/dead_tree2.png",
    //   "/racing-game/images/sprites/palm_tree.png",
    //   "/racing-game/images/sprites/player_left.png",
    //   "/racing-game/images/sprites/player_right.png",
    //   "/racing-game/images/sprites/player_straight.png",
    //   "/racing-game/images/sprites/player_uphill_left.png",
    //   "/racing-game/images/sprites/player_uphill_right.png",
    //   "/racing-game/images/sprites/player_uphill_straight.png",
    //   "/racing-game/images/sprites/semi.png",
    //   "/racing-game/images/sprites/stump.png",
    //   "/racing-game/images/sprites/tree1.png",
    //   "/racing-game/images/sprites/tree2.png",
    //   "/racing-game/images/sprites/truck.png",
    // ]

    const allImages = [
        ...assetsImages,
        // ...racingImages
    ]

    const audios = [
      "/assets/music/resonance.mp3",
      "/assets/music/robbers.mp3",
    //   "/racing-game/music/racer.mp3",
    //   "/racing-game/music/racer.ogg",
    ]

    let loadedCount = 0
    const total = allImages.length + audios.length

    const checkDone = () => {
      loadedCount++
      if (loadedCount >= total) setIsLoaded(true)
    }

    allImages.forEach((src) => {
      const img = new Image()
      img.src = src
      img.onload = checkDone
      img.onerror = checkDone
    })

    audios.forEach((src) => {
      const audio = new Audio()
      audio.src = src
      audio.preload = "auto"
      audio.oncanplaythrough = checkDone
      audio.onerror = checkDone
    })
  }, [])

  return isLoaded
}
