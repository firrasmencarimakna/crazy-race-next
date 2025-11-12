"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import LoadingRetro from "@/components/loadingRetro";

export default function CodePage() {
  const router = useRouter();
  const params = useParams();
  const roomCode = params.roomCode as string;

  useEffect(() => {
    if (!roomCode) return;
    
    // Simpan kode ke localStorage
    localStorage.setItem("roomCode", roomCode);

    // Gunakan replace agar tidak menambah history
    router.replace("/");
  }, [params.code, router]);

  // Biar gak blank, tampilkan placeholder loading ringan
  return (
    <LoadingRetro />
  );
}
