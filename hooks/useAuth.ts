import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type Role = 'user' | 'seller' | 'admin' | null;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setLoading(true);
      if (session?.user) {
        setUser(session.user);
        // Fetch user role from your database
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id);
        
        if (error) {
          console.error('Error fetching user role:', error);
          setRole(null);
        } else if (data && data.length > 0) {
          setRole(data[0].role as Role);
        } else {
          console.warn('User not found in the users table');
          setRole(null);
        }
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { user, role, loading };
}