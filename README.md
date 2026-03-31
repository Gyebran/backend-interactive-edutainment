# Interactive Edutainment

Proyek ini adalah aplikasi edukasi interaktif yang dibangun dengan arsitektur microservices sederhana.

## Struktur Proyek

Berikut adalah penjelasan mengenai fungsi dari setiap folder utama:

### 1. `backend/`

Pusat logika server-side (API utama).

- **Fungsi**: Menangani logika bisnis, otentikasi, dan jembatan antara frontend dengan data.
- **Teknologi**: Node.js/TypeScript.

### 2. `frontend/`

Antarmuka pengguna (UI).

- **Fungsi**: Mengatur tampilan aplikasi web dan interaksi pengguna.
- **Teknologi**: Next.js (framework React), Tailwind CSS.

### 3. `connector/`

Penghubung khusus ke database dan layanan pihak ketiga.

- **Fungsi**: Memisahkan logika integrasi eksternal (Database, Cloudinary, AI).
- **Isi Penting**:
  - `src/maia.ts`: Integrasi AI (Gemini 2.5-Flash).
  - `src/db.ts`: Koneksi Database.
  - `src/cloudinary.ts`: Manajemen Media.

### 4. Konfigurasi Sistem

- `.env`: Penyimpanan variabel lingkungan (API Keys, DB URL).
- `docker-compose.yml`: Konfigurasi untuk menjalankan seluruh layanan menggunakan Docker secara efisien.
