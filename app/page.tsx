import { Suspense } from "react";
import HomePage from "./HomePage";
import LoadingRetro from "@/components/loadingRetro";
import { PWAInstallProvider } from "@/contexts/pwaContext";

export default function Home() {
    return (
        <PWAInstallProvider>
            <Suspense fallback={<LoadingRetro />}>
                <HomePage />
            </Suspense>
        </PWAInstallProvider>
    )
}