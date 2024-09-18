import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export function useRoleCheck(requiredRole: string, checkInterval = 60000) {
  const [hasRequiredRole, setHasRequiredRole] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const checkRole = async () => {
    if (!user) {
      setHasRequiredRole(false);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setHasRequiredRole(data?.role === requiredRole);
    } catch (error) {
      console.error('Error checking user role:', error);
      setHasRequiredRole(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkRole();
    const interval = setInterval(checkRole, checkInterval);
    return () => clearInterval(interval);
  }, [user, requiredRole, checkInterval]);

  return { hasRequiredRole, isLoading };
}