"use client"

import { useEffect } from "react"

export function Preloader() {
  useEffect(() => {
    // ---- Preload images/gif/sprites dari /assets ----
    const assetsImages = [
      // 🚗 Car
      "/assets/car/car1.webp",
      "/assets/car/car2.webp",
      "/assets/car/car3.webp",
      "/assets/car/car4.webp",
      "/assets/car/car5.webp",

      // 🌀 Gif
      "/assets/gif/1.webp",
      "/assets/gif/2.webp",
      "/assets/gif/3.webp",
      "/assets/gif/4.webp",
      "/assets/gif/5.webp",
      "/assets/gif/6.webp",

      // 🏁 Host Gif
      "/assets/gif/host/1.webp",
      "/assets/gif/host/2.webp",
      "/assets/gif/host/3.webp",
      "/assets/gif/host/4.webp",
      "/assets/gif/host/5.webp",
      "/assets/gif/host/6.webp",
      "/assets/gif/host/7.webp",
      "/assets/gif/host/8.webp",
    ]

    // ---- Preload images/gif/sprites dari /racing-game ----
    const racingImages = [
      "/images/background/6.gif",
      "/images/background/background.svg",
      "/images/background/hills.png",
      "/images/background/sky.png",
      "/images/background/trees.png",
      // sprites
      "/images/sprites/billboard01.png",
      "/images/sprites/billboard02.png",
      "/images/sprites/billboard03.png",
      "/images/sprites/billboard04.png",
      "/images/sprites/billboard05.png",
      "/images/sprites/billboard06.png",
      "/images/sprites/billboard07.png",
      "/images/sprites/billboard08.png",
      "/images/sprites/billboard09.png",
      "/images/sprites/boulder1.png",
      "/images/sprites/boulder2.png",
      "/images/sprites/boulder3.png",
      "/images/sprites/bush1.png",
      "/images/sprites/bush2.png",
      "/images/sprites/cactus.png",
      "/images/sprites/car01.png",
      "/images/sprites/car02.png",
      "/images/sprites/car03.png",
      "/images/sprites/car04.png",
      "/images/sprites/column.png",
      "/images/sprites/dead_tree1.png",
      "/images/sprites/dead_tree2.png",
      "/images/sprites/palm_tree.png",
      "/images/sprites/player_left.png",
      "/images/sprites/player_right.png",
      "/images/sprites/player_straight.png",
      "/images/sprites/player_uphill_left.png",
      "/images/sprites/player_uphill_right.png",
      "/images/sprites/player_uphill_straight.png",
      "/images/sprites/semi.png",
      "/images/sprites/stump.png",
      "/images/sprites/tree1.png",
      "/images/sprites/tree2.png",
      "/images/sprites/truck.png",
    ]

    const allImages = [...assetsImages, ...racingImages]

    allImages.forEach((src) => {
      const img = new Image()
      img.src = src
    })

    // ---- Preload audio dari /assets dan /racing-game ----
    const audios = [
      "/assets/music/resonance.mp3",
      "/assets/music/robbers.mp3",
      "/music/racer.mp3",
      "/music/racer.ogg",
    ]

    audios.forEach((src) => {
      const audio = new Audio()
      audio.src = src
      audio.preload = "auto"
    })
  }, [])

  return null
}
