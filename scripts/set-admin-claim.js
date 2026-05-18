// Usage: node set-admin-claim.js <USER_UID> [path/to/serviceAccountKey.json]
// Requires Node.js and firebase-admin installed: `npm install firebase-admin`

const admin = require('firebase-admin')
const path = require('path')

const uid = process.argv[2]
const keyPathArg = process.argv[3]

if (!uid) {
    console.error('Usage: node set-admin-claim.js <USER_UID> [path/to/serviceAccountKey.json]')
    process.exit(1)
}

let serviceAccount
if (keyPathArg) {
    serviceAccount = require(path.resolve(keyPathArg))
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS)
    admin.initializeApp({ credential: admin.credential.applicationDefault() })
} else {
    console.error('Provide a service account JSON path as the 2nd argument, or set GOOGLE_APPLICATION_CREDENTIALS.')
    process.exit(1)
}

admin.auth().setCustomUserClaims(uid, { admin: true })
    .then(() => {
        console.log(`Admin claim set for ${uid}.`)
        console.log('User needs to sign out and sign back in (or refresh ID token) to see the new claim.')
        process.exit(0)
    })
    .catch((err) => {
        console.error('Failed to set custom claim:', err)
        process.exit(2)
    })
