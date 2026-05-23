"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/utils/supabase/client";

type AuthContextType = {
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

function hasAuthCookie(): boolean {
  return document.cookie.split(";").some((c) => c.trim().startsWith("sb-"));
}

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Skip the auth check entirely if no Supabase cookies exist.
    if (!hasAuthCookie()) return;

    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setIsAuthenticated(!!data?.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo(() => ({ isAuthenticated }), [isAuthenticated]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
