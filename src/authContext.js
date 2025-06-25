import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    getUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      const refreshMetadata = async () => {
        const { data: { user: updatedUser } } = await supabase.auth.getUser();
        setUser(updatedUser);
      };
      refreshMetadata();
    }
  }, [user]);

  const username = user?.user_metadata?.username || user?.email || 'unknown';

  return <AuthContext.Provider value={{ user, username }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
