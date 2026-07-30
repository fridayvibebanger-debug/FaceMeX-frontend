import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseApp } from '@/lib/firebase';
import type { DepartmentKey, DepartmentStatus } from '@/enterprise/models/department';

interface DepartmentRecord {
  status: DepartmentStatus;
  price: number;
  unlockedAt?: string;
  department: DepartmentKey;
}

const STORAGE_KEY = 'facemex_enterprise_statuses_v1';
const FIRESTORE_COLLECTION = 'enterprise';

let firestoreDb: ReturnType<typeof getFirestore> | null = null;

try {
  firestoreDb = getFirestore(getFirebaseApp());
} catch (error) {
  console.warn('Firestore is not available; enterprise unlocks will use local storage.', error);
}

function getUserId() {
  if (typeof window === 'undefined') {
    return 'demo-user';
  }

  return localStorage.getItem('faceme_user_id') || 'demo-user';
}

function readFallbackStatuses(): Record<string, DepartmentRecord> {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    return JSON.parse(raw) as Record<string, DepartmentRecord>;
  } catch {
    return {};
  }
}

function writeFallbackStatuses(statuses: Record<string, DepartmentRecord>) {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
}

export async function checkSubscription(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  const cached = localStorage.getItem('facemex_enterprise_subscription');
  return cached === 'active';
}

export async function paymentCallback(department: DepartmentKey) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('facemex_enterprise_subscription', 'active');
  }

  return {
    ok: true,
    message: `${department} unlock flow ready for payment.`,
  };
}

export async function unlockDepartment(department: DepartmentKey): Promise<DepartmentRecord> {
  const userId = getUserId();
  const record: DepartmentRecord = {
    department,
    status: 'unlocked',
    price: 2000,
    unlockedAt: new Date().toISOString(),
  };

  if (firestoreDb) {
    try {
      const ref = doc(firestoreDb, FIRESTORE_COLLECTION, userId, 'departments', department);
      await setDoc(ref, record, { merge: true });
      return record;
    } catch (error) {
      console.warn('Falling back to local storage for enterprise unlock state.', error);
    }
  }

  const statuses = readFallbackStatuses();
  statuses[department] = record;
  writeFallbackStatuses(statuses);
  return record;
}

export async function departmentStatus(department: DepartmentKey): Promise<DepartmentRecord> {
  const userId = getUserId();

  if (firestoreDb) {
    try {
      const ref = doc(firestoreDb, FIRESTORE_COLLECTION, userId, 'departments', department);
      const snapshot = await getDoc(ref);
      if (snapshot.exists()) {
        return snapshot.data() as DepartmentRecord;
      }
    } catch (error) {
      console.warn('Falling back to local storage for enterprise status lookup.', error);
    }
  }

  const fallback = readFallbackStatuses()[department];
  return fallback || { department, status: 'locked', price: 2000 };
}

export async function departmentStatuses(): Promise<Record<string, DepartmentRecord>> {
  const userId = getUserId();

  if (firestoreDb) {
    try {
      const ref = doc(firestoreDb, FIRESTORE_COLLECTION, userId, 'departments', '__root__');
      const snapshot = await getDoc(ref);
      if (snapshot.exists()) {
        return (snapshot.data() as Record<string, DepartmentRecord>) || {};
      }
    } catch (error) {
      console.warn('Falling back to local storage for enterprise department list.', error);
    }
  }

  return readFallbackStatuses();
}
