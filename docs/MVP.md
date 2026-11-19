# MVP --- Platform Informasi dan Manajemen Paket Haji & Umroh

**Status:** Draft\
**Versi:** 1.0\
**Tanggal:** 2 November 2026

## 1. Tujuan MVP

Membangun versi pertama yang sudah dapat digunakan untuk: - Menampilkan
informasi paket Haji dan Umroh kepada calon jamaah. - Menampilkan jadwal
keberangkatan dan itinerary. - Memberi tim internal kemampuan mengelola
data perjalanan dan konten website melalui dashboard. - Mengontrol
konten mana yang boleh ditampilkan ke publik.

MVP berfokus pada katalog informasi dan CMS. MVP ini **belum merupakan
sistem booking atau transaksi jamaah**.

## 2. Pengguna MVP

1.  **Pengunjung:** melihat seluruh informasi publik tanpa login.
2.  **Administrator:** mengelola seluruh data dan pengguna.
3.  **Content Manager:** mengelola konten sesuai izin yang diberikan.

## 3. Fitur Wajib (P0)

### 3.1 Autentikasi dan Hak Akses

-   Login dan logout admin.
-   Penyimpanan password dalam bentuk hash.
-   Status akun aktif/nonaktif.
-   Role Administrator dan Content Manager.
-   Pembatasan akses berdasarkan role.

### 3.2 Manajemen Kategori

-   Membuat, melihat, mengubah, dan menghapus kategori.
-   Nama, slug, dan deskripsi.
-   Slug unik.
-   Kategori yang masih digunakan paket tidak dapat dihapus tanpa
    penanganan relasi.

### 3.3 Manajemen Paket

-   CRUD paket.
-   Mengatur kategori, nama, slug, deskripsi, thumbnail, tipe paket,
    status, dan featured.
-   Mengaitkan fasilitas dan akomodasi.
-   Menampilkan paket berdasarkan status publik.
-   Slug harus unik.

**Catatan:** harga paket belum dapat menjadi fitur MVP berbasis ERD saat
ini karena kolom harga belum tersedia. Jika harga wajib ditampilkan,
tambahkan atribut harga dan mata uang sebelum implementasi.

### 3.4 Manajemen Keberangkatan

-   Menambahkan dan mengubah jadwal untuk suatu paket.
-   Menyimpan tanggal keberangkatan dan kepulangan.
-   Menyimpan kuota, kuota tersedia, maskapai, dan status.
-   Validasi tanggal dan kuota.
-   Menampilkan jadwal pada detail paket.

### 3.5 Manajemen Itinerary

-   Menambahkan itinerary pada jadwal keberangkatan.
-   Mengelola nomor hari, judul, deskripsi, dan lokasi.
-   Menampilkan itinerary secara berurutan berdasarkan `day_number`.

### 3.6 Manajemen Fasilitas dan Akomodasi

-   CRUD fasilitas.
-   CRUD akomodasi.
-   Menghubungkan banyak fasilitas ke satu paket dan sebaliknya.
-   Menghubungkan banyak akomodasi ke satu paket dan sebaliknya.
-   Menyimpan peran akomodasi dan jumlah malam menginap.

### 3.7 Manajemen Konten

-   CRUD artikel dengan judul, slug, excerpt, konten, thumbnail, status,
    dan tanggal publikasi.
-   CRUD galeri beserta tanggal acara dan status publikasi.
-   Menambah, mengubah, menghapus, dan mengurutkan gambar galeri.
-   CRUD testimoni dengan nama pelanggan, isi, rating, foto, dan status
    publikasi.

### 3.8 Pengaturan Website

-   Melihat dan mengubah pasangan `setting_key` dan `setting_value`.
-   Hanya pengguna berwenang yang dapat mengubah pengaturan.

### 3.9 Website Publik

-   Beranda.
-   Daftar kategori dan paket.
-   Detail paket.
-   Informasi jadwal keberangkatan.
-   Itinerary.
-   Daftar artikel dan detail artikel.
-   Galeri dan gambar.
-   Testimoni.
-   Halaman informasi/kontak dengan CTA konsultasi.

CTA konsultasi pada MVP dapat berupa tautan kontak eksternal.
Penyimpanan lead belum termasuk karena belum ada tabel terkait.

## 4. Fitur yang Ditunda (P1/P2)

-   Formulir permintaan konsultasi dengan penyimpanan lead.
-   Booking dan data calon jamaah.
-   Pembayaran, invoice, refund, dan status pembayaran.
-   Pengelolaan dokumen perjalanan.
-   Notifikasi otomatis.
-   Riwayat perubahan/audit log.
-   Multi-bahasa.
-   Multi-cabang.
-   Pencarian dan filter lanjutan.
-   Analitik pengunjung dan laporan bisnis.
-   Impor/ekspor data massal.

## 5. Alur Penggunaan Utama

### 5.1 Admin Menerbitkan Paket

1.  Admin login.
2.  Admin membuat atau memilih kategori.
3.  Admin membuat paket dan melengkapi informasi.
4.  Admin menghubungkan fasilitas dan akomodasi.
5.  Admin menambahkan jadwal keberangkatan.
6.  Admin menambahkan itinerary untuk jadwal tersebut.
7.  Admin mengubah status paket sesuai aturan publikasi.
8.  Paket tampil pada website publik.

### 5.2 Pengunjung Mencari Informasi Paket

1.  Pengunjung membuka website.
2.  Pengunjung melihat daftar paket atau memilih kategori.
3.  Pengunjung membuka detail paket.
4.  Pengunjung memeriksa fasilitas dan akomodasi.
5.  Pengunjung melihat jadwal keberangkatan.
6.  Pengunjung membaca itinerary.
7.  Pengunjung menghubungi penyedia layanan melalui CTA kontak.

### 5.3 Content Manager Menerbitkan Artikel

1.  Content Manager login.
2.  Membuat artikel dan melengkapi konten.
3.  Mengatur slug, thumbnail, status, dan waktu publikasi.
4.  Artikel yang memenuhi aturan publikasi tampil pada website.

## 6. Kriteria Selesai MVP

-   [ ] Login dan logout admin berfungsi.
-   [ ] Role dan otorisasi diterapkan pada setiap operasi yang
    dilindungi.
-   [ ] CRUD kategori, paket, keberangkatan, itinerary, fasilitas, dan
    akomodasi berfungsi.
-   [ ] Relasi many-to-many paket-fasilitas dan paket-akomodasi
    berfungsi.
-   [ ] CRUD artikel, galeri, gambar galeri, dan testimoni berfungsi.
-   [ ] Pengaturan website dapat dikelola oleh pengguna berwenang.
-   [ ] Website publik menampilkan paket dan konten yang dipublikasikan.
-   [ ] Detail paket menampilkan jadwal, fasilitas, dan akomodasi yang
    benar.
-   [ ] Itinerary tampil sesuai urutan hari.
-   [ ] Validasi data dan relasi berjalan.
-   [ ] Tampilan responsif pada perangkat mobile dan desktop.
-   [ ] Halaman publik memiliki metadata dasar untuk SEO.
-   [ ] Pengujian hak akses, validasi, dan alur utama telah dilakukan.

## 7. Data Minimum untuk Uji Coba

-   Minimal 2 role: Administrator dan Content Manager.
-   Minimal 1 akun administrator dan 1 akun content manager.
-   Minimal 3 kategori perjalanan.
-   Minimal 3 paket.
-   Setiap paket memiliki minimal 1 jadwal keberangkatan.
-   Setiap paket memiliki fasilitas dan akomodasi yang relevan.
-   Setiap jadwal memiliki contoh itinerary.
-   Minimal 2 artikel, 1 galeri dengan beberapa gambar, dan 2 testimoni.

Data tersebut adalah data uji awal, bukan batasan jumlah data sistem.

## 8. Risiko MVP

  -----------------------------------------------------------------------
  Risiko                              Penanganan
  ----------------------------------- -----------------------------------
  Harga tidak tersedia di ERD         Putuskan apakah harga ditambahkan
                                      sebelum MVP dibangun.

  Kuota tidak terhubung ke booking    Kelola kuota secara manual dan
                                      dokumentasikan prosedurnya.

  Status publikasi tidak seragam      Tetapkan aturan status dan
                                      visibilitas pada tiap modul.

  Data paket terhapus saat masih      Gunakan validasi relasi dan
  dipakai                             arsip/nonaktif sebagai alternatif
                                      hapus.

  Konten memiliki URL gambar yang     Validasi URL dan tetapkan prosedur
  tidak valid                         unggah/penyimpanan media.

  Hak akses terlalu luas              Tetapkan matriks izin per modul dan
                                      uji akses langsung.
  -----------------------------------------------------------------------

## 9. Batas Keberhasilan MVP

MVP dianggap berhasil ketika tim dapat mengelola katalog perjalanan dan
konten secara mandiri, sementara calon jamaah dapat memperoleh informasi
paket dan jadwal secara jelas. MVP tidak dinilai dari keberhasilan
menerima pembayaran atau mengelola pemesanan, karena proses tersebut
belum termasuk dalam ruang lingkup.
