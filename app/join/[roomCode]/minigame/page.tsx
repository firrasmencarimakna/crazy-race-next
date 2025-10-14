'use client';

import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function RacingGame() {
    const router = useRouter();
    const { roomCode } = useParams();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [playerId, setPlayerId] = useState<string>("")
    useEffect(() => {
        const pid = localStorage.getItem("playerId") || ""
        if (!pid) router.replace(`/`)
        else setPlayerId(pid)
    }, [router])

    useEffect(() => {
        if (!roomCode || !playerId) return;

        const channel = supabase
            .channel(`room-${roomCode}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'game_rooms',
                    filter: `room_code=eq.${roomCode}`,
                },
                async (payload) => {
                    const newStatus = payload.new?.status;
                    console.log('Room status update:', newStatus);

                    if (newStatus === 'finished') {
                        try {
                            // ✅ pastikan racing=false tersimpan dulu
                            const { error } = await supabase
                                .from('players')
                                .update({ racing: false, completion: true })
                                .eq('id', playerId);

                            if (error) {
                                console.error('Error updating racing status:', error);
                            } else {
                                console.log('✅ Racing set to false successfully');
                            }
                        } catch (err) {
                            console.error('Unexpected error updating racing:', err);
                        }

                        // ✅ baru redirect
                        router.replace(`/join/${roomCode}/result`);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [roomCode, playerId, router]);

    iframeRef.current?.contentWindow?.focus();

    // ✅ Realtime: dengar pesan dari iframe
    useEffect(() => {
        function handleMessage(event: MessageEvent) {
            if (!event.data || typeof event.data !== 'object') return;

            if (event.data.type === 'racing_finished') {
                console.log('Racing finished detected from iframe');

                // ✅ Update racing=false di Supabase
                if (playerId) {
                    supabase
                        .from('players')
                        .update({ racing: false })
                        .eq('id', playerId)
                        .then(({ error }) => {
                            if (error) console.error('Error updating racing:', error);
                            else {
                                console.log('Racing updated to false');
                                router.replace(`/join/${roomCode}/game`);
                            }
                        });
                }
            }
        }

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [playerId, roomCode, router]);

    useEffect(() => {
        const iframe = iframeRef.current;
        if (iframe) {
            console.log('Game loaded');
        }
    }, []);

    return (
        <div className="w-full h-screen flex justify-center items-center">
            <iframe
                ref={iframeRef}
                src="/racing-game/v4.final.html"
                width="100%"
                height="100%"
                frameBorder="0"
                allowFullScreen
                sandbox="allow-scripts allow-same-origin allow-popups"
                title="Racing Game"
            />
        </div>
    );
}