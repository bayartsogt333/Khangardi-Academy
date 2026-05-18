Setting an `admin` custom claim (recommended)

1) Create a Firebase service account JSON in the GCP Console and download it.
2) On your dev machine or a trusted server, install dependencies:

   npm install firebase-admin

3) Run the script in this repo (replace with the target UID):

   node ./scripts/set-admin-claim.js <USER_UID> path/to/serviceAccountKey.json

4) After the claim is set, the user must refresh their token. Either:
   - Sign out and sign back in in the client app, or
   - On the client, call `await firebase.auth().currentUser.getIdToken(true)` to force a token refresh.

Quick testing alternative (less secure):
- Modify `storage.rules` to allow any authenticated user to write:

  match /courses/{courseId}/{filePath=**} {
    allow read: if true;
    allow write: if request.auth != null; // TEMP for testing only
  }

Then test the upload, and revert to the admin-only rule afterwards.

Security note: Use custom claims + server-side control for production. Uploading from a trusted server or using Cloud Functions is the safest approach for untrusted clients.