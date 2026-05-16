"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";
import { getSession } from "@/actions/auth";

interface AuthUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        // 1. Always check for JWT session first (fastest, server-side supported)
        const sessionUser = await getSession();
        
        if (!isMounted) return;

        if (sessionUser) {
          setUser(sessionUser);
          setLoading(false);
        }

        // 2. Setup Firebase listener to handle Google login state
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (!isMounted) return;

          if (firebaseUser) {
            // If we already have a session for this user, don't do anything
            if (sessionUser?.email === firebaseUser.email) {
              setLoading(false);
              return;
            }

            // Otherwise, we might need to sync (this happens on first Google login)
            // But usually the LoginPage handles the sync. 
            // Here we just ensure the user state is set.
            setUser({
              uid: firebaseUser.uid, // Temporary, will be unified by sync action
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
            });
          } else if (!sessionUser) {
            // No Firebase user and no JWT session
            setUser(null);
            if (pathname !== "/login" && pathname !== "/onboarding") {
              router.push("/login");
            }
          }
          
          setLoading(false);
        });

        return () => {
          unsubscribe();
        };
      } catch (error) {
        if (isMounted) setLoading(false);
      }
    }

    const cleanupPromise = init();

    return () => {
      isMounted = false;
      cleanupPromise.then(cleanup => cleanup?.());
    };
  }, [pathname, router]);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
