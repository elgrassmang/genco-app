import { initializeApp, getApps } from "firebase/app";
    import { getAnalytics } from "firebase/analytics";
    import { getAuth } from "firebase/auth";
    import { getFirestore } from "firebase/firestore";
    import { getStorage } from "firebase/storage";

    const firebaseConfig = {
      apiKey: "AIzaSyCkK9y3m1lUgmXXgg33qRoQR8vE0HQQ140",
      authDomain: "gencocans.firebaseapp.com",
      projectId: "gencocans",
      storageBucket: "gencocans.firebasestorage.app",
      messagingSenderId: "512093151402",
      appId: "1:512093151402:web:81e5f342ad8315924f70d3",
      measurementId: "G-58EW985814"
    };

    let app;
    let authInstance;
    let dbInstance;
    let storageInstance;
    
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
      authInstance = getAuth(app);
      dbInstance = getFirestore(app);
      storageInstance = getStorage(app);

      if (typeof window !== 'undefined') {
        try {
          getAnalytics(app);
        } catch (e) {
          console.warn("Analytics not supported in this environment");
        }
      }
    } else {
      app = getApps()[0];
      authInstance = getAuth(app);
      dbInstance = getFirestore(app);
      storageInstance = getStorage(app);
    }

    export default app;
    export { authInstance as auth, dbInstance as db, storageInstance as storage };