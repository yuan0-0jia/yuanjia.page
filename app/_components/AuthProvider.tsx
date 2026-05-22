"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type AuthContextType = {
  isAuthenticated: boolean;
  isEditMode: boolean;
  toggleEditMode: () => void;
  setEditMode: (v: boolean) => void;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isEditMode: false,
  toggleEditMode: () => {},
  setEditMode: () => {},
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
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    // Skip auth check entirely if no Supabase cookies exist
    if (!hasAuthCookie()) return;

    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setIsAuthenticated(!!data?.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
      if (!session?.user) setIsEditMode(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const toggleEditMode = () => setIsEditMode((prev) => !prev);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isEditMode, toggleEditMode, setEditMode: setIsEditMode }}
    >
      {children}
    </AuthContext.Provider>
  );
}
