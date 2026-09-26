import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updatePassword,
} from "firebase/auth";
import { auth } from "../firebase";
import { userApi } from "../api/api";
import { connectSocket, disconnectSocket } from "../api/socket";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null); // server-side user document
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const { data } = await userApi.get(fbUser.uid);
          setProfile(data.user);
        } catch (err) {
          console.error("Failed to load profile:", err);
        }
        connectSocket(fbUser.uid);
      } else {
        setProfile(null);
        disconnectSocket();
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function register({ name, email, phone_number, password }) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const { data } = await userApi.create({
      name,
      email,
      phone_number,
      uid: cred.user.uid,
    });
    setProfile(data.user);
    return cred.user;
  }

  async function login({ email, password }) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  }

  async function logout() {
    await signOut(auth);
  }

  async function resetPassword(email) {
    await sendPasswordResetEmail(auth, email);
  }

  async function changePassword(newPassword) {
    if (!auth.currentUser) throw new Error("Not logged in");
    await updatePassword(auth.currentUser, newPassword);
  }

  const value = {
    firebaseUser,
    profile,
    setProfile,
    loading,
    register,
    login,
    logout,
    resetPassword,
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
