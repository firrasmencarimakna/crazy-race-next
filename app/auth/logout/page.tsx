'use client'; // Next.js App Router

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // Sesuaikan path-mu ke Supabase client
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'; // shadcn/ui Dialog
import { Button } from '@/components/ui/button'; // shadcn/ui Button
import { Loader2, LogOut, AlertTriangle, X } from 'lucide-react'; // Icons dari lucide-react
import { useToast } from '@/components/ui/use-toast'; // shadcn/ui Toast (optional, buat notif)

// Custom pixel font & glow utilities (sama kayak login page)
// .pixel-text { font-family: 'Pixel', monospace; }
// .glow-cyan { text-shadow: 0 0 10px #00ffff; }
// .animate-neon-bounce { animation: neon-bounce 2s infinite; }

interface LogoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function LogoutDialog({ open, onOpenChange }: LogoutDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Handle logout
  const handleLogout = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Optional: Toast success
      toast({
        title: "Logout Berhasil",
        description: "Sampai jumpa lagi!",
        className: "border-cyan-400/30 bg-[#1a0a2a]/80 text-white",
      });

      // Redirect ke login
      router.push('/login');
      onOpenChange(false); // Tutup dialog
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Logout Gagal",
        description: err.message || "Coba lagi nanti.",
        className: "border-red-400/30 bg-red-900/20 text-red-100",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="pixel-card bg-[#1a0a2a]/80 backdrop-blur-md border-cyan-400/30 text-white max-w-md sm:max-w-lg shadow-2xl shadow-cyan-500/20">
        <DialogHeader className="text-center space-y-2">
          <DialogTitle className="text-2xl font-bold text-[#00ffff] pixel-text glow-cyan animate-neon-bounce flex items-center justify-center gap-2">
            <LogOut className="h-6 w-6" />
            Konfirmasi Logout
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-300 pixel-text">
            Kamu yakin mau keluar? Progress game-mu aman, tapi sesi login akan direset.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center py-4">
          <AlertTriangle className="h-12 w-12 text-yellow-400 animate-pulse" />
        </div>

        <DialogFooter className="flex gap-2 sm:gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            className="flex-1 bg-gradient-to-r from-gray-600/20 to-gray-800/20 border border-gray-500/30 hover:from-gray-600/30 hover:to-gray-800/30 text-white pixel-text glow-text transition-all duration-300"
          >
            <X className="mr-2 h-4 w-4" />
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleLogout}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-400/30 hover:from-red-500/30 hover:to-red-600/30 text-white pixel-text glow-text transition-all duration-300"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Keluar...
              </>
            ) : (
              <>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}