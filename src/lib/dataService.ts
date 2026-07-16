import { db } from "./firebase";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp
} from "firebase/firestore";

// User Helpers
export const getUserProfile = async (uid: string) => {
  const userDoc = await getDoc(doc(db, "users", uid));
  return userDoc.exists() ? userDoc.data() : null;
};

export const updateUserProfile = async (uid: string, data: any) => {
  await setDoc(doc(db, "users", uid), data, { merge: true });
};

// History Helpers
export const getUserSessions = async (uid: string) => {
  const q = query(
    collection(db, "sessions"), 
    where("uid", "==", uid), 
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const saveMessage = async (message: any) => {
  const docRef = doc(collection(db, "messages"));
  await setDoc(docRef, { ...message, messageId: docRef.id, timestamp: serverTimestamp() });
};

// Files Helpers
export const saveFileMetadata = async (fileData: any) => {
  const docRef = doc(collection(db, "files"));
  await setDoc(docRef, { ...fileData, fileId: docRef.id, createdAt: serverTimestamp() });
};

export const getUserFiles = async (uid: string) => {
  const q = query(collection(db, "files"), where("uid", "==", uid));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
