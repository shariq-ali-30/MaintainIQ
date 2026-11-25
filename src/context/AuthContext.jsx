import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const profileUnsubscribe = useRef(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (nextUser) => {
      profileUnsubscribe.current?.();
      profileUnsubscribe.current = null;
      setUser(nextUser);

      if (!nextUser || nextUser.isAnonymous) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      profileUnsubscribe.current = onSnapshot(
        doc(db, "users", nextUser.uid),
        (profileSnapshot) => {
          setProfile(profileSnapshot.exists()
            ? { uid: nextUser.uid, ...profileSnapshot.data() }
            : null);
          setLoading(false);
        },
        (error) => {
          console.error("Unable to subscribe to the user profile:", error);
          setProfile(null);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      profileUnsubscribe.current?.();
    };
  }, []);

  const signIn = useCallback(async (email, password, selectedRole) => {
    const credential = await signInWithEmailAndPassword(
      auth,
      email.trim().toLowerCase(),
      password
    );
    const profileSnapshot = await getDoc(doc(db, "users", credential.user.uid));

    if (!profileSnapshot.exists()) {
      await signOut(auth);
      throw new Error("This account does not have a staff profile. Contact an administrator.");
    }

    const nextProfile = { uid: credential.user.uid, ...profileSnapshot.data() };
    if (selectedRole && String(nextProfile.role || "").toLowerCase() !== selectedRole.toLowerCase()) {
      await signOut(auth);
      throw new Error("The selected role does not match this account.");
    }

    return { user: credential.user, profile: nextProfile };
  }, []);

  const logout = useCallback(() => signOut(auth), []);
  const value = useMemo(
    () => ({ user, profile, loading, signIn, logout }),
    [user, profile, loading, signIn, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}