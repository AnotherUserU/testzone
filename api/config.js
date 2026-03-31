export default function handler(req, res) {
  res.status(200).json({
    apiKey:            process.env.FIREBASE_API_KEY,
    authDomain:        "this-is-the-real-one-4640e.firebaseapp.com",
    databaseURL:       process.env.FIREBASE_DB_URL,
    projectId:         "this-is-the-real-one-4640e",
    storageBucket:     "this-is-the-real-one-4640e.firebasestorage.app",
    messagingSenderId: "660941883787",
    appId:             process.env.FIREBASE_APP_ID
  });
}
