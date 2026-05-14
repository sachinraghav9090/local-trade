import { initializeApp } from "firebase/app";
import {
  getAuth,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { doc, getDocFromServer, initializeFirestore } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

export const app = initializeApp(firebaseConfig);
console.log(
  "Firebase App initialized with Project ID:",
  firebaseConfig.projectId,
);
console.log(
  "Using Firestore Database ID:",
  firebaseConfig.firestoreDatabaseId || "(default)",
);

export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId || undefined,
);

// CRITICAL: Validate Connection to Firestore on boot
async function testConnection() {
  try {
    // We use a public collection defined in firestore.rules for testing
    await getDocFromServer(doc(db, "_connection_test_", "connection"));
    console.log("Firestore connection verified successfully.");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("the client is offline")) {
      console.error(
        "Firestore connection failed: The client is offline. Please check your Firebase configuration.",
      );
    } else if (errorMessage.includes("Missing or insufficient permissions")) {
      // Permission denied still means we reached the server!
      console.log(
        "Firestore reached, but permission denied for test doc (expected if doc doesn't exist).",
      );
    } else {
      console.warn(
        "Firestore connection check produced an unexpected error:",
        error,
      );
    }
  }
}
testConnection();

export const auth = getAuth(app);

export const logout = async () => {
  if (auth.currentUser) {
    try {
      const { setDoc, serverTimestamp } = await import("firebase/firestore");
      await setDoc(
        doc(db, "users", auth.currentUser.uid),
        {
          isOnline: false,
          lastActive: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (e) {
      console.warn("Could not set offline status before logout", e);
    }
  }
  return signOut(auth);
};

export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  RecaptchaVerifier,
  signInWithPhoneNumber,
};
