"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { User, UserRole } from "@/types";

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: User | null;
  userRole?: UserRole;
  loading: boolean;
  signupWithEmail: (email: string, pass: string, name: string) => Promise<FirebaseUser>;
  loginWithEmail: (email: string, pass: string) => Promise<FirebaseUser>;
  loginWithGoogle: () => Promise<{ user: FirebaseUser; isNewUser: boolean }>;
  logout: () => Promise<void>;
  selectRole: (role: UserRole) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to fetch user profile from Firestore
  const fetchUserProfile = async (uid: string) => {
    try {
      const userDocRef = doc(db, "users", uid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        setUserProfile(userSnap.data() as User);
      } else {
        setUserProfile(null);
      }
    } catch (err) {
      console.error("Failed to load user profile:", err);
      setUserProfile(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchUserProfile(currentUser.uid);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signupWithEmail = async (email: string, pass: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (cred.user) {
      await updateProfile(cred.user, { displayName: name });
    }
    return cred.user;
  };

  const loginWithEmail = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    if (cred.user) {
      await fetchUserProfile(cred.user.uid);
    }
    return cred.user;
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const uid = cred.user.uid;

    const userDocRef = doc(db, "users", uid);
    const userSnap = await getDoc(userDocRef);

    let isNewUser = false;
    if (userSnap.exists()) {
      setUserProfile(userSnap.data() as User);
    } else {
      isNewUser = true;
    }

    return { user: cred.user, isNewUser };
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setUserProfile(null);
  };

  const selectRole = async (role: UserRole) => {
    if (!user) throw new Error("No authenticated user found.");

    const profileData: User = {
      uid: user.uid,
      role,
      email: user.email || "",
      name: user.displayName || user.email?.split("@")[0] || "User",
      createdAt: new Date().toISOString(),
    };

    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, profileData, { merge: true });
    setUserProfile(profileData);
  };

  const refreshUserProfile = async () => {
    if (user) {
      await fetchUserProfile(user.uid);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        userRole: userProfile?.role,
        loading,
        signupWithEmail,
        loginWithEmail,
        loginWithGoogle,
        logout,
        selectRole,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
