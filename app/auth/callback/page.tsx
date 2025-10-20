'use client'; // Next.js App Router

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // Sesuaikan path-mu ke Supabase client
import LoadingRetro from '@/components/loadingRetro';

// Custom pixel font & glow utilities (sama kayak di login page)
// .pixel-text { font-family: 'Pixel', monospace; }
// .glow-cyan { text-shadow: 0 0 10px #00ffff; }
// .animate-neon-bounce { animation: neon-bounce 2s infinite; }

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error getting session:', error);
        router.push('/auth/login?error=auth_failed');
        return;
      }

      if (data.session) {
        console.log('Auth successful, session created');
        
        // 🔥 FIXED: Baca next URL dari params (dari Google login)
        const nextUrl = searchParams.get('next') || '/'
        router.push(decodeURIComponent(nextUrl)) // Redirect ke home dengan ?code kalau ada
      } else {
        router.push('/auth/login?error=no_session');
      }
    };

    // Handle URL params (error dari OAuth)
    const error = searchParams.get('error');
    if (error) {
      console.error('OAuth error:', error);
      router.push(`/auth/login?error=${error}`);
      return;
    }

    const code = searchParams.get('code');

    if (code) {
      handleCallback();
    } else {
      handleCallback();
    }
  }, [router, searchParams]);

  return (
    <LoadingRetro />
  );
}