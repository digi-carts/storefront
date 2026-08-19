'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
}

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;

export function initFirebase(config: FirebaseClientConfig): { app: FirebaseApp; auth: Auth } {
  if (!_app || getApps().length === 0) {
    _app = initializeApp({
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
    });
  } else {
    _app = getApp();
  }
  _auth = getAuth(_app);
  return { app: _app, auth: _auth };
}

export function getFirebaseAuth(): Auth | null { return _auth; }
