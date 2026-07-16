import { db, auth } from "./firebase.js";
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where } from "firebase/firestore";
import { ChatSession, UsagePools, PricingTier } from "../types.js";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  currentTier: PricingTier;
  usagePools: UsagePools;
  createdAt: string;
  customInstructionsAboutMe?: string;
  customInstructionsResponseStyle?: string;
  defaultTemperature?: number;
  defaultModel?: string;
  defaultMaxTokens?: number;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Get user profile from Firestore
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const userDocRef = doc(db, "users", uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

// Save or update user profile in Firestore
export async function saveUserProfile(
  uid: string,
  profile: Partial<UserProfile>
): Promise<void> {
  const path = `users/${uid}`;
  try {
    const userDocRef = doc(db, "users", uid);
    const existing = await getUserProfile(uid);
    
    const dataToSave = {
      ...existing,
      ...profile,
      uid,
      updatedAt: new Date().toISOString()
    };
    
    // Clean undefined
    Object.keys(dataToSave).forEach(key => {
      if ((dataToSave as any)[key] === undefined) {
        delete (dataToSave as any)[key];
      }
    });

    await setDoc(userDocRef, dataToSave, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Fetch all sessions for a user, sorted by creation date or order
export async function getUserSessions(uid: string): Promise<ChatSession[]> {
  const path = "sessions";
  try {
    const sessionsCol = collection(db, "sessions");
    const q = query(sessionsCol, where("uid", "==", uid));
    const querySnapshot = await getDocs(q);
    const sessions: ChatSession[] = [];
    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;

    for (const d of querySnapshot.docs) {
      const data = d.data();
      const createdStr = data.createdAt || data.updatedAt || new Date().toISOString();
      const createdTime = new Date(createdStr).getTime();

      // Auto-delete if older than 1 year
      if (createdTime < oneYearAgo) {
        await deleteDoc(d.ref);
        continue;
      }

      sessions.push({
        id: data.sessionId,
        name: data.name,
        mode: data.mode,
        selectedModels: data.selectedModels || [],
        messages: data.messages || [],
        createdAt: createdStr,
        lastAccessedAt: data.lastAccessedAt || data.updatedAt || new Date().toISOString(),
        isPermanent: data.isPermanent || false,
        files: data.files || [],
      });
    }
    // Sort in-memory to avoid needing index setup errors initially
    return sessions.sort((a, b) => b.id.localeCompare(a.id));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

// Save or update a session (including its nested messages)
export async function saveUserSession(uid: string, session: ChatSession): Promise<void> {
  const path = `sessions/${session.id}`;
  try {
    const sessionDocRef = doc(db, "sessions", session.id);
    await setDoc(sessionDocRef, {
      sessionId: session.id,
      uid,
      name: session.name,
      mode: session.mode,
      selectedModels: session.selectedModels,
      messages: session.messages,
      createdAt: session.createdAt || new Date().toISOString(),
      lastAccessedAt: session.lastAccessedAt || new Date().toISOString(),
      isPermanent: session.isPermanent || false,
      files: session.files || [],
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Delete a session
export async function deleteUserSession(sessionId: string): Promise<void> {
  const path = `sessions/${sessionId}`;
  try {
    const sessionDocRef = doc(db, "sessions", sessionId);
    await deleteDoc(sessionDocRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}
