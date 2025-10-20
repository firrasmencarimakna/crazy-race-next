'use client'; // Next.js App Router

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // Sesuaikan path-mu ke Supabase client
import { Loader2 } from 'lucide-react'; // Icons dari lucide-react
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
        // Optional: Redirect ke login dengan error message
        router.push('/login?error=auth_failed');
        return;
      }

      if (data.session) {
        console.log('Auth successful, session created');
        // Update user profile atau fetch data kalau perlu
        // Misal: await fetchUserProfile(data.session.user.id);
        
        // Redirect ke dashboard/game lobby
        router.push('/'); // Sesuaikan route-mu
      } else {
        // No session, back to login
        router.push('/login?error=no_session');
      }
    };

    // Handle URL params (error dari OAuth)
    const error = searchParams.get('error');
    if (error) {
      console.error('OAuth error:', error);
      router.push(`/login?error=${error}`);
      return;
    }

    const code = searchParams.get('code');
    const next = searchParams.get('next') || '/dashboard'; // Optional: Allow custom redirect

    if (code) {
      // Exchange code for session (Supabase handles this via getSession)
      handleCallback();
    } else {
      // Fallback
      handleCallback();
    }
  }, [router, searchParams]);

  return (
    <LoadingRetro />
  );
}