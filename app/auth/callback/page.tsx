'use client'; // Next.js App Router

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import LoadingRetro from '@/components/loadingRetro';

export default function AuthCallbackPage() {
  const router = useRouter();

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
        router.push('/'); // Langsung redirect ke home
      } else {
        router.push('/auth/login?error=no_session');
      }
    };

    handleCallback(); // ⚠️ Ini penting agar efek dijalankan
  }, [router]);

  return <LoadingRetro />;
}
