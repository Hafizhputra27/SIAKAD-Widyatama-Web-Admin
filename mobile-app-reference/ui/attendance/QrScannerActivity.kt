package com.widyatama.siakad.ui.attendance

import android.content.SharedPreferences
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.widget.Button
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.zxing.Result
import org.json.JSONException
import org.json.JSONObject

/**
 * QrScannerActivity.kt
 * Referensi implementasi QR Scanner untuk SIAKAD Mobile App (Android)
 *
 * File ini adalah REFERENSI yang harus diimplementasikan di project Android Studio
 * Path di Android project: app/src/main/java/com/widyatama/siakad/ui/attendance/
 */
class QrScannerActivity : AppCompatActivity() {

    private lateinit var sharedPrefManager: SharedPreferences
    private lateinit var loadingView: ProgressBar
    private lateinit var resultCard: android.widget.LinearLayout
    private lateinit var resultIcon: ImageView
    private lateinit var resultText: TextView
    private lateinit var resultButton: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Set content view ke activity_qr_scanner.xml
    }

    /**
     * Dipanggil setelah QR berhasil di-scan oleh kamera/Zxing
     */
    private fun processQrResult(rawValue: String) {
        try {
            // 1. Parse JSON payload dari QR
            val payload = JSONObject(rawValue)
            val token = payload.getString("token")
            val courseId = payload.getString("courseId")
            val pertemuanId = payload.getString("pertemuanId")
            val expiresAt = payload.getLong("expiresAt") // Unix timestamp dalam detik

            // 2. Cek expired secara lokal dulu (cepat, tanpa network)
            val nowSeconds = System.currentTimeMillis() / 1000
            if (nowSeconds > expiresAt) {
                showResult(false, "QR Code sudah kedaluwarsa", "⏱️")
                return
            }

            // 3. Ambil NPM mahasiswa dari session (SharedPreferences)
            val npm = sharedPrefManager.getString("npm", "")
            if (npm.isNullOrEmpty()) {
                showResult(false, "Session tidak valid, silakan login ulang", "⚠️")
                return
            }

            // 4. Validasi ke Firestore — cek pertemuan
            validateAndSubmitPresensi(token, courseId, pertemuanId, npm)

        } catch (e: JSONException) {
            showResult(false, "QR Code tidak valid (bukan SIAKAD QR)", "❌")
        }
    }

    private fun validateAndSubmitPresensi(
        token: String,
        courseId: String,
        pertemuanId: String,
        npm: String
    ) {
        showLoading("Memverifikasi absensi...")

        val db = FirebaseFirestore.getInstance()

        // STEP 1: Cek dokumen pertemuan
        db.collection("pertemuan").document(pertemuanId).get()
            .addOnSuccessListener { pertemuanDoc ->
                if (!pertemuanDoc.exists()) {
                    showResult(false, "Data pertemuan tidak ditemukan", "❌")
                    return@addOnSuccessListener
                }

                val isQrActive = pertemuanDoc.getBoolean("isQrActive") ?: false
                val qrToken = pertemuanDoc.getString("qrToken") ?: ""
                val enrolledNpms = pertemuanDoc.get("enrolledNpms") as? List<String> ?: emptyList()

                // VALIDASI 1: Apakah QR masih aktif?
                if (!isQrActive) {
                    showResult(false, "QR Code sudah tidak aktif", "⏱️")
                    return@addOnSuccessListener
                }

                // VALIDASI 2: Apakah token cocok?
                if (qrToken != token) {
                    showResult(false, "QR Code tidak valid", "❌")
                    return@addOnSuccessListener
                }

                // VALIDASI 3: Apakah mahasiswa terdaftar di matkul ini?
                if (!enrolledNpms.contains(npm)) {
                    showResult(false, "Anda tidak terdaftar di mata kuliah ini", "🚫")
                    return@addOnSuccessListener
                }

                // STEP 2: Cek apakah sudah pernah absen (prevent duplicate)
                checkDuplicateAndSubmit(db, pertemuanId, courseId, npm)
            }
            .addOnFailureListener { e ->
                showResult(false, "Gagal memverifikasi: ${e.message}", "❌")
            }
    }

    private fun checkDuplicateAndSubmit(
        db: FirebaseFirestore,
        pertemuanId: String,
        courseId: String,
        npm: String
    ) {
        db.collection("presensi")
            .whereEqualTo("pertemuanId", pertemuanId)
            .whereEqualTo("npm", npm)
            .get()
            .addOnSuccessListener { querySnapshot ->
                // VALIDASI 4: Sudah pernah absen?
                if (!querySnapshot.isEmpty) {
                    showResult(false, "Anda sudah tercatat hadir di pertemuan ini", "✅")
                    return@addOnSuccessListener
                }

                // SEMUA VALIDASI LOLOS → Tulis presensi
                submitPresensi(db, pertemuanId, courseId, npm)
            }
            .addOnFailureListener { e ->
                showResult(false, "Gagal cek data: ${e.message}", "❌")
            }
    }

    private fun submitPresensi(
        db: FirebaseFirestore,
        pertemuanId: String,
        courseId: String,
        npm: String
    ) {
        val presensiData = hashMapOf(
            "npm" to npm,
            "mataKuliahId" to courseId,
            "courseId" to courseId,
            "pertemuanId" to pertemuanId,
            "status" to "HADIR",
            "scanMethod" to "QR_SCAN",
            "timestamp" to FieldValue.serverTimestamp(),
            "deviceInfo" to "${android.os.Build.MANUFACTURER} ${android.os.Build.MODEL}"
        )

        db.collection("presensi").add(presensiData)
            .addOnSuccessListener { documentRef ->
                // Update field attendance di courses (increment)
                db.collection("courses").document(courseId)
                    .update("attendance", FieldValue.increment(1))

                showResult(true, "Absensi berhasil dicatat!", "✅")
            }
            .addOnFailureListener { e ->
                showResult(false, "Gagal menyimpan absensi: ${e.message}", "❌")
            }
    }

    // UI Helper Methods
    private fun showLoading(message: String) {
        // Tampilkan loading overlay
    }

    private fun hideLoading() {
        // Sembunyikan loading overlay
    }

    private fun showResult(success: Boolean, message: String, emoji: String) {
        runOnUiThread {
            hideLoading()
            // Update UI: tampilkan card result dengan warna hijau (success) atau merah (error)
            // Setelah 3 detik, finish() untuk kembali ke Dashboard
            Handler(Looper.getMainLooper()).postDelayed({
                finish()
            }, 3000)
        }
    }
}
