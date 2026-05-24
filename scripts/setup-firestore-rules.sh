#!/bin/bash

# Setup Firestore Security Rules for SIAKAD
# Run: chmod +x scripts/setup-firestore-rules.sh && ./scripts/setup-firestore-rules.sh

cat > firestore.rules << 'EOF'
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ===== HELPER FUNCTIONS =====
    function isAdmin() {
      return request.auth != null &&
             exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    function isOwner(npm) {
      return request.auth != null && request.auth.uid == npm;
    }

    // ===== ADMINS =====
    match /admins/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if false; // Only via Admin SDK
    }

    // ===== MAHASISWA =====
    match /mahasiswa/{npm} {
      allow read: if isAdmin() || isOwner(npm);
      allow write: if false; // Only via Admin SDK

      match /academic_results/{id} {
        allow read: if isAdmin() || isOwner(npm);
        allow write: if false;
      }
      match /tagihan/{id} {
        allow read: if isAdmin() || isOwner(npm);
        allow write: if false;
      }
      match /transkrip/{id} {
        allow read: if isAdmin() || isOwner(npm);
        allow write: if false;
      }
      match /pengaturan/{id} {
        allow read, write: if isOwner(npm);
      }
    }

    // ===== COURSES =====
    match /courses/{code} {
      allow read: if request.auth != null;
      allow write: if false; // Only via Admin SDK
    }

    // ===== LECTURERS =====
    match /lecturers/{nidn} {
      allow read: if request.auth != null;
      allow write: if false;
    }

    // ===== ROOMS =====
    match /rooms/{id} {
      allow read: if request.auth != null;
      allow write: if false;
    }

    // ===== PERTEMUAN (NEW) =====
    match /pertemuan/{id} {
      allow read: if request.auth != null;
      allow write: if false; // Only via Admin SDK
    }

    // ===== PRESENSI =====
    match /presensi/{id} {
      allow read: if isAdmin() ||
                     (request.auth != null && resource.data.npm == request.auth.uid);
      // Mahasiswa hanya bisa CREATE (bukan update/delete) presensi miliknya
      allow create: if request.auth != null &&
                       request.resource.data.npm == request.auth.uid &&
                       request.resource.data.scanMethod == 'QR_SCAN';
      allow update, delete: if false; // Only via Admin SDK
    }

    // ===== PENGUMUMAN =====
    match /pengumuman/{id} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
EOF

echo "Firestore rules file created: firestore.rules"
echo ""
echo "To deploy, run:"
echo "  firebase deploy --only firestore:rules"
echo ""
echo "Or if you don't have Firebase CLI installed:"
echo "  npm install -g firebase-tools"
echo "  firebase login"
echo "  firebase deploy --only firestore:rules --project siakad-widyatama"
echo ""
echo "Alternatively, copy the contents of firestore.rules to:"
echo "  Firebase Console -> Firestore Database -> Rules -> Edit rules -> Publish"
