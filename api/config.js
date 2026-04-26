export default function handler(req, res) {
  // Only expose non-sensitive public identifiers if needed
  res.status(200).json({
    authDomain: "this-is-the-real-one-4640e.firebaseapp.com",
    projectId: "this-is-the-real-one-4640e",
    storageBucket: "this-is-the-real-one-4640e.firebasestorage.app",
    messagingSenderId: "660941883787"
    // apiKey and databaseURL are hidden as the backend proxies all requests
  });
}

