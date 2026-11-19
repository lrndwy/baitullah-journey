# PRD --- Platform Informasi dan Manajemen Paket Haji & Umroh

**Status:** Draft\
**Versi:** 1.0\
**Tanggal:** 2 November 2026

## 1. Ringkasan Produk

Platform ini merupakan website informasi dan sistem pengelolaan konten
untuk penyedia layanan perjalanan Haji dan Umroh. Platform memiliki dua
area utama: website publik untuk calon jamaah dan dashboard internal
untuk administrator/pengelola konten.

Website publik menyajikan informasi paket, kategori perjalanan, jadwal
keberangkatan, fasilitas, akomodasi, itinerary, artikel, galeri, dan
testimoni. Dashboard memungkinkan tim internal mengelola informasi
tersebut tanpa mengubah kode aplikasi.

Dokumen ini berangkat dari ERD yang diberikan. Belum ada keputusan
teknologi, framework, database engine, layanan hosting, atau vendor
eksternal.

## 2. Latar Belakang dan Masalah

Informasi paket perjalanan biasanya terdiri dari banyak bagian yang
saling berkaitan: kategori, detail paket, jadwal, kuota, fasilitas,
hotel, dan agenda perjalanan. Jika informasi tersebut dikelola secara
terpisah atau manual, pembaruan dapat menjadi tidak konsisten dan sulit
dipantau.

Tim juga membutuhkan tempat terpusat untuk mengelola artikel, galeri,
testimoni, serta pengaturan informasi website.

## 3. Tujuan Produk

1.  Menyediakan sumber informasi resmi mengenai layanan dan paket
    Haji/Umroh.
2.  Memudahkan calon jamaah menemukan dan membandingkan informasi paket
    serta jadwal.
3.  Memungkinkan admin mengelola data operasional dan konten melalui
    dashboard.
4.  Menjaga konsistensi relasi antara paket, keberangkatan, fasilitas,
    akomodasi, dan itinerary.
5.  Menyediakan kontrol publikasi agar konten yang belum siap tidak
    tampil di website.

### 3.1 Indikator Keberhasilan

-   Seluruh paket yang berstatus publik dapat ditampilkan dengan
    informasi terkait.
-   Admin dapat membuat, memperbarui, dan mengarsipkan data sesuai
    kewenangannya.
-   Jadwal dan kuota yang tampil berasal dari data keberangkatan yang
    dikelola.
-   Artikel, galeri, dan testimoni hanya tampil jika memenuhi status
    publikasi.
-   Tidak terdapat data relasi yatim pada relasi utama.

## 4. Pengguna dan Hak Akses

### 4.1 Pengunjung Website

Pengunjung yang belum login. Dapat melihat informasi publik, menelusuri
paket dan jadwal, membaca artikel, serta melihat galeri dan testimoni.

### 4.2 Administrator

Pengguna internal dengan hak akses pengelolaan menyeluruh. Dapat
mengelola akun, role, data perjalanan, konten, dan pengaturan website.

### 4.3 Content Manager

Pengguna internal yang berfokus pada pengelolaan konten website. Hak
akses final perlu ditetapkan oleh pemilik produk. Rekomendasi awal:
dapat mengelola artikel, galeri, testimoni, dan informasi paket; tidak
dapat mengelola akun, role, maupun pengaturan keamanan.

Hak akses harus diperiksa di sisi server untuk setiap operasi, bukan
hanya dengan menyembunyikan menu pada antarmuka.

## 5. Ruang Lingkup Fitur

### 5.1 Website Publik

-   Beranda yang menampilkan pengenalan layanan, paket unggulan, jadwal
    terdekat, testimoni, dan konten pilihan.
-   Daftar kategori dan paket perjalanan.
-   Halaman detail paket berisi deskripsi, gambar, tipe paket, status,
    kategori, fasilitas, akomodasi, serta jadwal keberangkatan yang
    tersedia.
-   Informasi keberangkatan: tanggal berangkat/pulang, maskapai, kuota,
    sisa kuota, dan status.
-   Itinerary berdasarkan hari keberangkatan.
-   Halaman artikel dan detail artikel.
-   Halaman galeri dan detail galeri beserta gambar.
-   Halaman testimoni.
-   Informasi website yang dapat dikelola melalui pengaturan.

### 5.2 Dashboard Admin

-   Login dan logout.
-   Dashboard ringkasan data.
-   Manajemen pengguna dan role.
-   Manajemen kategori.
-   Manajemen paket.
-   Manajemen jadwal keberangkatan dan kuota.
-   Manajemen fasilitas dan pengaitan fasilitas ke paket.
-   Manajemen data akomodasi dan pengaitan akomodasi ke paket.
-   Manajemen itinerary per keberangkatan.
-   Manajemen artikel.
-   Manajemen galeri dan gambar galeri.
-   Manajemen testimoni.
-   Manajemen pengaturan website.
-   Pengendalian status publikasi dan status data.

### 5.3 Di Luar Ruang Lingkup MVP

Fitur berikut tidak tercakup dalam ERD saat ini dan tidak diasumsikan
tersedia pada MVP:

-   Registrasi jamaah, formulir pemesanan, dan manajemen booking.
-   Pembayaran, invoice, refund, dan rekonsiliasi.
-   Pengelolaan dokumen paspor/visa dan data sensitif jamaah.
-   Manajemen keberangkatan secara operasional di lapangan.
-   Notifikasi WhatsApp, SMS, email transaksional, atau integrasi pihak
    ketiga.
-   Multi-cabang, multi-perusahaan, dan multi-bahasa.
-   Review pelanggan dengan verifikasi transaksi.

Jika dibutuhkan, fitur-fitur tersebut perlu dianalisis sebagai modul dan
model data tersendiri.

## 6. Kebutuhan Fungsional

  -----------------------------------------------------------------------
  ID                                  Kebutuhan
  ----------------------------------- -----------------------------------
  FR-01                               Pengunjung dapat melihat daftar
                                      kategori dan paket yang berstatus
                                      publik.

  FR-02                               Pengunjung dapat membuka detail
                                      paket dan melihat fasilitas serta
                                      akomodasinya.

  FR-03                               Pengunjung dapat melihat jadwal
                                      keberangkatan, tanggal, maskapai,
                                      kuota, dan status.

  FR-04                               Pengunjung dapat melihat itinerary
                                      yang terhubung dengan jadwal
                                      keberangkatan.

  FR-05                               Pengunjung dapat membaca artikel
                                      yang telah dipublikasikan.

  FR-06                               Pengunjung dapat melihat galeri dan
                                      gambar di dalamnya.

  FR-07                               Pengunjung dapat melihat testimoni
                                      yang telah dipublikasikan.

  FR-08                               Pengguna internal dapat login dan
                                      logout.

  FR-09                               Sistem membatasi operasi dashboard
                                      berdasarkan role pengguna.

  FR-10                               Admin berwenang dapat mengelola
                                      akun dan role.

  FR-11                               Pengguna berwenang dapat membuat,
                                      membaca, memperbarui, dan
                                      menghapus/menonaktifkan kategori,
                                      paket, jadwal, fasilitas,
                                      akomodasi, dan itinerary.

  FR-12                               Pengguna berwenang dapat mengelola
                                      artikel, galeri, gambar galeri, dan
                                      testimoni.

  FR-13                               Pengguna berwenang dapat mengubah
                                      pengaturan website.

  FR-14                               Sistem memvalidasi relasi dan data
                                      wajib sebelum menyimpan perubahan.

  FR-15                               Sistem hanya menampilkan konten
                                      yang memenuhi aturan publikasi.
  -----------------------------------------------------------------------

## 7. Aturan Bisnis

1.  Email pengguna harus unik.
2.  Nama role harus unik.
3.  Slug kategori, paket, dan artikel harus unik pada lingkup tabel
    masing-masing.
4.  Satu paket berada dalam satu kategori sesuai ERD saat ini.
5.  Satu paket dapat memiliki banyak jadwal keberangkatan.
6.  Satu jadwal keberangkatan dapat memiliki banyak itinerary; nomor
    hari harus valid dan urutannya dapat ditampilkan secara konsisten.
7.  Paket dan fasilitas memiliki relasi many-to-many melalui
    `package_facilities`.
8.  Paket dan akomodasi memiliki relasi many-to-many melalui
    `package_accommodations`.
9.  Kuota tidak boleh negatif dan `available_quota` tidak boleh melebihi
    `quota`.
10. `return_date` tidak boleh lebih awal dari `departure_date`.
11. Jumlah malam menginap tidak boleh negatif.
12. Rating testimoni harus mengikuti rentang yang ditetapkan produk;
    rekomendasi awal 1--5.
13. Konten yang belum dipublikasikan tidak boleh tampil di website
    publik.
14. Penghapusan data induk yang masih digunakan harus ditolak atau
    menggunakan mekanisme arsip/soft delete.
15. `created_by`, `author_id`, dan relasi pengguna lain harus merujuk ke
    akun yang valid.

## 8. Kebutuhan Nonfungsional

-   **Keamanan:** password disimpan sebagai hash yang kuat; sesi
    autentikasi dan otorisasi dikelola secara aman.
-   **Validasi:** validasi dilakukan pada sisi antarmuka dan sisi
    server.
-   **Integritas data:** foreign key, unique constraint, dan transaksi
    digunakan sesuai kebutuhan.
-   **Performa:** halaman daftar dan detail harus tetap responsif ketika
    jumlah paket, artikel, dan gambar bertambah.
-   **SEO:** halaman publik memiliki judul, deskripsi, slug, dan
    metadata yang sesuai.
-   **Responsif:** website dapat digunakan pada ponsel, tablet, dan
    desktop.
-   **Aksesibilitas:** navigasi, kontras, label, dan struktur konten
    dapat digunakan secara wajar oleh berbagai pengguna.
-   **Ketersediaan:** kegagalan pengelolaan dashboard tidak boleh
    menyebabkan data publik menjadi tidak konsisten.
-   **Pemeliharaan:** struktur data dan aturan bisnis didokumentasikan
    agar mudah dikembangkan.

## 9. Gambaran Halaman

### Website Publik

-   Beranda
-   Daftar Paket
-   Detail Paket
-   Daftar Keberangkatan / Jadwal
-   Artikel
-   Detail Artikel
-   Galeri
-   Detail Galeri
-   Testimoni
-   Tentang / Informasi Perusahaan
-   Kontak atau CTA konsultasi

### Dashboard

-   Login
-   Ringkasan
-   Pengguna
-   Role
-   Kategori
-   Paket
-   Keberangkatan
-   Itinerary
-   Fasilitas
-   Akomodasi
-   Artikel
-   Galeri dan Gambar
-   Testimoni
-   Pengaturan Website

Daftar halaman dapat disesuaikan saat perancangan UX. Halaman kontak/CTA
merupakan kebutuhan presentasi website, tetapi penyimpanan lead belum
dimodelkan pada ERD.

## 10. Asumsi dan Keputusan yang Belum Ditentukan

-   Harga paket, mata uang, termin pembayaran, dan rincian biaya belum
    tersedia pada ERD.
-   Belum ditentukan apakah pengunjung dapat mengirim permintaan
    konsultasi atau pemesanan melalui formulir.
-   Belum ditentukan aturan pasti status paket, keberangkatan, dan
    artikel.
-   Belum ditentukan apakah satu paket boleh memiliki beberapa kategori.
-   Belum ditentukan apakah kuota tersedia diperbarui manual atau
    dihitung dari transaksi jamaah.
-   Belum ditentukan penyimpanan file gambar dan batas ukuran/formatnya.
-   Belum ditentukan kebijakan penghapusan, retensi, dan audit aktivitas
    admin.
-   Hak akses detail Content Manager perlu dikonfirmasi.

## 11. Risiko dan Catatan ERD

1.  Entitas transaksi jamaah/booking belum ada. Karena itu kuota pada
    versi awal hanya dapat dikelola secara manual dan bukan hasil
    perhitungan booking.
2.  Kolom harga paket belum ada, padahal harga umumnya merupakan
    informasi penting dalam penjualan paket.
3.  `package_type` pada paket berpotensi tumpang tindih dengan kategori.
    Definisi keduanya perlu diperjelas.
4.  `available_quota` berpotensi tidak konsisten dengan `quota` jika
    tidak ada proses pemutakhiran yang jelas.
5.  Data gambar saat ini disimpan sebagai URL pada beberapa tabel. Perlu
    kebijakan pengelolaan file dan validasi URL.
6.  Belum ada audit log untuk mengetahui siapa mengubah data dan kapan.
7.  `site_settings.setting_value` bertipe teks; format dan validasi tiap
    key perlu ditentukan.
8.  Artikel memiliki `status` dan `published_at`, sedangkan
    galeri/testimoni menggunakan `is_published`. Aturan publikasi
    sebaiknya diseragamkan pada level aplikasi.

## 12. Kriteria Penerimaan Produk

-   Pengunjung dapat menemukan paket berdasarkan kategori.
-   Detail paket menampilkan relasi fasilitas, akomodasi, dan jadwal
    secara benar.
-   Detail keberangkatan menampilkan itinerary sesuai urutan hari.
-   Konten draft/tidak publik tidak muncul di website publik.
-   Admin dapat mengelola semua modul sesuai role.
-   Pengguna tanpa hak akses tidak dapat melakukan operasi terlarang
    melalui endpoint langsung.
-   Validasi mencegah kuota negatif, tanggal tidak valid, slug duplikat,
    dan relasi yang tidak sah.
-   Data yang saling berelasi tidak hilang atau menjadi tidak konsisten
    akibat penghapusan yang tidak aman.

## 13. Rencana Tahapan

1.  **Fondasi:** autentikasi, role, pengaturan website, dan kerangka
    dashboard.
2.  **Data perjalanan:** kategori, paket, fasilitas, akomodasi,
    keberangkatan, dan itinerary.
3.  **Konten:** artikel, galeri, gambar, dan testimoni.
4.  **Website publik:** halaman informasi, daftar/detail paket, jadwal,
    dan konten.
5.  **Penyempurnaan:** SEO, aksesibilitas, keamanan, pengujian, dan
    optimasi.

Urutan ini merupakan rekomendasi implementasi, bukan penetapan
teknologi.
