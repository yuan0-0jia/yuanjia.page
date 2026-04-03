"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type AuthContextType = {
  isAuthenticated: boolean;
  isEditMode: boolean;
  toggleEditMode: () => void;
};

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isEditMode: false,
  toggleEditMode: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
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
    <AuthContext.Provider value={{ isAuthenticated, isEditMode, toggleEditMode }}>
      {children}
    </AuthContext.Provider>
  );
}
