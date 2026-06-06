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
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONException
import org.json.JSONObject
import java.io.IOException

/**
 * QrScannerActivity.kt
 * Referensi implementasi QR Scanner untuk SIAKAD Mobile App (Android)
 *
 * File ini adalah REFERENSI yang harus diimplementasikan di project Android Studio.
 * Path di Android project: app/src/main/java/com/widyatama/siakad/ui/attendance/
 *
 * UPDATED: Juni 2026 — Implementasi API /api/presensi/scan sebagai primary method.
 *
 * -----------------------------------------------------------
 * BASE URL CONFIGURATION (PILIH SALAH SATU SESUAI ENV):
 * -----------------------------------------------------------
 * 1. ANDROID EMULATOR →  http://10.0.2.2:3000/api
 *    (IP khusus emulator ke host machine localhost)
 *
 * 2. REAL DEVICE (same WiFi/LAN) → http://192.168.1.x:3000/api
 *    (Ganti 192.168.1.x dengan IP LAN komputer yang jalankan npm run dev)
 *    Cara cek IP: cmd/terminal → ipconfig (Windows) atau ifconfig (Mac/Linux)
 *
 * 3. PRODUCTION / STAGING → https://your-domain.vercel.app/api
 *    (Ganti dengan URL deploy web admin, contoh: https://siakad-widyatama.vercel.app/api)
 *
 * 4. NGROK (beda network / internet) → https://xxxx.ngrok-free.app/api
 *    (Install ngrok, run: ngrok http 3000, copy HTTPS URL)
 *
 * JANGAN lupa tambahkan android:usesCleartextTraffic="true" di AndroidManifest.xml
 * kalau pakai HTTP (mode 1 & 2). Kalau HTTPS (mode 3 & 4) tidak perlu.
 */
class QrScannerActivity : AppCompatActivity() {

    // ============================================================
    // KONFIGURASI URL — GANTI SESUAI ENVIRONMENT ANDA
    // ============================================================
    companion object {
        // Pilih salah satu:
        // const val BASE_URL = "http://10.0.2.2:3000/api"               // Emulator
        // const val BASE_URL = "http://192.168.1.x:3000/api"             // Real device LAN
        // const val BASE_URL = "https://siakad-widyatama.vercel.app/api" // Production
        const val BASE_URL = "http://10.0.2.2:3000/api" // DEFAULT: Emulator
    }

    private lateinit var sharedPrefManager: SharedPreferences
    private lateinit var loadingView: ProgressBar
    private lateinit var resultCard: android.widget.LinearLayout
    private lateinit var resultIcon: ImageView
    private lateinit var resultText: TextView
    private lateinit var resultButton: Button

    private val apiClient = OkHttpClient.Builder()
        .connectTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
        .readTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
        .build()

    private val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()

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

            // 2. Parse expiresAt (ISO 8601 string — web admin format. Fallback: Unix timestamp long)
            val expiresAtRaw = payload.get("expiresAt")
            val expiresAtMillis = when (expiresAtRaw) {
                is String -> {
                    // ISO 8601 string, e.g. "2026-06-04T10:30:00Z"
                    try {
                        java.time.Instant.parse(expiresAtRaw).toEpochMilli()
                    } catch (e: Exception) {
                        showResult(false, "Format QR tidak valid", "❌")
                        return
                    }
                }
                is Number -> expiresAtRaw.toLong() * 1000 // Unix timestamp (detik)
                else -> {
                    showResult(false, "Format QR tidak valid", "❌")
                    return
                }
            }

            // 3. Cek expired secara lokal dulu (cepat, tanpa network)
            val nowMillis = System.currentTimeMillis()
            if (nowMillis > expiresAtMillis) {
                showResult(false, "QR Code sudah kedaluwarsa. Minta dosen generate ulang.", "⏱️")
                return
            }

            // 4. Ambil NPM mahasiswa dari session (SharedPreferences)
            val npm = sharedPrefManager.getString("npm", "")
            if (npm.isNullOrEmpty()) {
                showResult(false, "Session tidak valid, silakan login ulang", "⚠️")
                return
            }

            // 5. Validasi ke Firestore — cek pertemuan & token
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
                val ptCourseId = pertemuanDoc.getString("courseId") ?: ""

                // VALIDASI 1: Apakah QR masih aktif?
                if (!isQrActive) {
                    showResult(false, "QR Code sudah tidak aktif", "⏱️")
                    return@addOnSuccessListener
                }

                // VALIDASI 1b: courseId cocok?
                if (ptCourseId != courseId) {
                    showResult(false, "Data mata kuliah tidak cocok", "❌")
                    return@addOnSuccessListener
                }

                // VALIDASI 2: Apakah token cocok?
                // Jika tidak cocok, mungkin QR baru saja di-refresh
                if (qrToken != token) {
                    if (qrToken.isNotEmpty() && isQrActive) {
                        showResult(false, "QR baru saja diperbarui, silakan scan ulang", "🔄")
                    } else {
                        showResult(false, "QR Code tidak valid", "❌")
                    }
                    return@addOnSuccessListener
                }

                // VALIDASI 3: Apakah mahasiswa terdaftar di matkul ini?
                if (!enrolledNpms.contains(npm)) {
                    showResult(false, "Anda tidak terdaftar di mata kuliah ini", "🚫")
                    return@addOnSuccessListener
                }

                // STEP 2: Cek apakah sudah pernah absen (prevent duplicate)
                checkDuplicateAndSubmit(db, pertemuanId, courseId, npm, token)
            }
            .addOnFailureListener { e ->
                showResult(false, "Gagal memverifikasi: ${e.message}", "❌")
            }
    }

    private fun checkDuplicateAndSubmit(
        db: FirebaseFirestore,
        pertemuanId: String,
        courseId: String,
        npm: String,
        token: String
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

                // SEMUA VALIDASI LOLOS → Submit via API (primary) atau Firestore (fallback)
                submitPresensiViaApi(db, pertemuanId, courseId, npm, token)
            }
            .addOnFailureListener { e ->
                showResult(false, "Gagal cek data: ${e.message}", "❌")
            }
    }

    /**
     * PRIMARY: Kirim ke REST API /api/presensi/scan
     * Lebih aman karena validasi server-side.
     */
    private fun submitPresensiViaApi(
        db: FirebaseFirestore,
        pertemuanId: String,
        courseId: String,
        npm: String,
        token: String
    ) {
        showLoading("Mengirim data absensi ke server...")

        val jsonBody = JSONObject().apply {
            put("token", token)
            put("courseId", courseId)
            put("pertemuanId", pertemuanId)
            put("npm", npm)
        }

        val request = Request.Builder()
            .url("$BASE_URL/presensi/scan")
            .post(jsonBody.toString().toRequestBody(JSON_MEDIA_TYPE))
            .header("Content-Type", "application/json")
            .build()

        apiClient.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                // Fallback ke Firestore direct jika API tidak bisa diakses
                showLoading("Server tidak tersedia, menggunakan metode lokal...")
                submitPresensiViaFirestore(db, pertemuanId, courseId, npm)
            }

            override fun onResponse(call: Call, response: Response) {
                val body = response.body?.string()
                val jsonResponse = try {
                    body?.let { JSONObject(it) }
                } catch (e: Exception) { null }

                if (response.isSuccessful && jsonResponse?.optBoolean("success") == true) {
                    showResult(true, jsonResponse.optString("message", "Absensi berhasil dicatat!"), "✅")
                } else {
                    val error = jsonResponse?.optString("error") ?: "Gagal mencatat absensi"
                    when {
                        error.contains("tidak aktif", ignoreCase = true) ->
                            showResult(false, "QR sudah tidak aktif, minta dosen generate ulang", "⏱️")
                        error.contains("tidak valid", ignoreCase = true) || error.contains("expired", ignoreCase = true) ->
                            showResult(false, "QR sudah expired, scan ulang", "❌")
                        error.contains("sudah tercatat", ignoreCase = true) || error.contains("sudah absen", ignoreCase = true) ->
                            showResult(false, "Anda sudah absen di pertemuan ini", "✅")
                        error.contains("tidak terdaftar", ignoreCase = true) ->
                            showResult(false, "Anda tidak terdaftar di mata kuliah ini", "🚫")
                        else ->
                            showResult(false, error, "❌")
                    }
                }
            }
        })
    }

    /**
     * FALLBACK: Tulis presensi langsung ke Firestore (direct write).
     * Digunakan jika API tidak bisa diakses (offline / server down).
     */
    private fun submitPresensiViaFirestore(
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

                showResult(true, "Absensi berhasil dicatat (lokal)!", "✅")
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
