# SCHEMA --- Database Platform Informasi dan Manajemen Paket Haji & Umroh

**Status:** Draft\
**Versi:** 1.0\
**Tanggal:** 2 November 2026\
**Sumber:** ERD yang diberikan pengguna

## 1. Konvensi

-   Nama tabel dan kolom menggunakan `snake_case`.
-   Primary key menggunakan UUID.
-   `PK` = primary key, `FK` = foreign key, `UK` = unique key.
-   `timestamp`/`timestamptz` mengikuti kebutuhan penyimpanan waktu;
    zona waktu aplikasi perlu ditetapkan.
-   Tipe `text` digunakan untuk konten panjang.
-   Tipe konkret dan sintaks constraint perlu disesuaikan dengan
    database engine yang dipilih kelak.
-   Kolom yang tidak ditandai nullable pada dokumen ini direkomendasikan
    `NOT NULL`, kecuali secara bisnis memang opsional.

## 2. Ringkasan Entitas

  Tabel                      Fungsi
  -------------------------- ----------------------------------------------------
  `roles`                    Definisi peran pengguna dashboard.
  `users`                    Akun administrator dan pengelola konten.
  `site_settings`            Konfigurasi website berbentuk key-value.
  `categories`               Kategori paket perjalanan.
  `packages`                 Informasi utama paket Haji/Umroh.
  `departures`               Jadwal keberangkatan untuk suatu paket.
  `itineraries`              Rangkaian agenda berdasarkan jadwal keberangkatan.
  `facilities`               Master data fasilitas.
  `package_facilities`       Relasi paket dengan fasilitas.
  `accommodations`           Master data hotel/akomodasi.
  `package_accommodations`   Relasi paket dengan akomodasi.
  `articles`                 Artikel/informasi website.
  `galleries`                Kumpulan galeri kegiatan.
  `gallery_images`           Gambar di dalam suatu galeri.
  `testimonials`             Testimoni pelanggan.

## 3. Definisi Tabel

### 3.1 `roles`

Menyimpan daftar role pengguna internal.

  Kolom           Tipe      Key   Aturan
  --------------- --------- ----- --------------------------
  `id`            UUID      PK    Identitas role
  `name`          VARCHAR   UK    Nama role, wajib
  `description`   TEXT            Deskripsi role, opsional

Contoh nilai `name`: `administrator`, `content_manager`.

### 3.2 `users`

Menyimpan akun pengguna dashboard.

  Kolom             Tipe          Key   Aturan
  ----------------- ------------- ----- ------------------------------------
  `id`              UUID          PK    Identitas pengguna
  `role_id`         UUID          FK    Referensi `roles.id`
  `name`            VARCHAR             Nama pengguna
  `email`           VARCHAR       UK    Email unik
  `password_hash`   VARCHAR             Hash password, bukan password asli
  `is_active`       BOOLEAN             Status akun
  `created_at`      TIMESTAMPTZ         Waktu pembuatan

Relasi: satu role dapat dimiliki banyak user; satu user memiliki satu
role pada model saat ini.

### 3.3 `site_settings`

Menyimpan pengaturan website dalam bentuk key-value.

  Kolom             Tipe          Key   Aturan
  ----------------- ------------- ----- --------------------------
  `id`              UUID          PK    Identitas pengaturan
  `setting_key`     VARCHAR       UK    Nama key yang unik
  `setting_value`   TEXT                Nilai pengaturan
  `updated_at`      TIMESTAMPTZ         Waktu perubahan terakhir

Contoh key dapat berupa nama situs, deskripsi situs, nomor kontak,
alamat, atau tautan media sosial. Daftar key final ditentukan pada
implementasi.

### 3.4 `categories`

Mengelompokkan paket perjalanan.

  Kolom           Tipe      Key   Aturan
  --------------- --------- ----- ---------------------
  `id`            UUID      PK    Identitas kategori
  `name`          VARCHAR         Nama kategori
  `slug`          VARCHAR   UK    Slug unik
  `description`   TEXT            Deskripsi, opsional

Contoh kategori: Umroh Reguler, Umroh Plus, Haji Khusus.

### 3.5 `packages`

Menyimpan informasi utama paket perjalanan.

  Kolom             Tipe          Key   Aturan
  ----------------- ------------- ----- ---------------------------
  `id`              UUID          PK    Identitas paket
  `category_id`     UUID          FK    Referensi `categories.id`
  `created_by`      UUID          FK    Referensi `users.id`
  `name`            VARCHAR             Nama paket
  `slug`            VARCHAR       UK    Slug unik
  `description`     TEXT                Deskripsi paket
  `thumbnail_url`   VARCHAR             URL gambar utama
  `package_type`    VARCHAR             Tipe paket
  `status`          VARCHAR             Status paket
  `is_featured`     BOOLEAN             Penanda paket unggulan
  `created_at`      TIMESTAMPTZ         Waktu pembuatan
  `updated_at`      TIMESTAMPTZ         Waktu pembaruan

Relasi: satu kategori memiliki banyak paket; satu paket memiliki banyak
departure; paket berelasi many-to-many dengan fasilitas dan akomodasi.

### 3.6 `departures`

Menyimpan jadwal keberangkatan suatu paket.

  Kolom               Tipe      Key   Aturan
  ------------------- --------- ----- -------------------------
  `id`                UUID      PK    Identitas keberangkatan
  `package_id`        UUID      FK    Referensi `packages.id`
  `departure_date`    DATE            Tanggal berangkat
  `return_date`       DATE            Tanggal pulang
  `quota`             INT             Total kuota
  `available_quota`   INT             Kuota tersedia
  `airline`           VARCHAR         Maskapai
  `status`            VARCHAR         Status keberangkatan

Relasi: satu paket memiliki banyak departure; satu departure memiliki
banyak itinerary.

### 3.7 `itineraries`

Menyimpan agenda perjalanan berdasarkan hari keberangkatan.

  Kolom            Tipe      Key   Aturan
  ---------------- --------- ----- ---------------------------
  `id`             UUID      PK    Identitas itinerary
  `departure_id`   UUID      FK    Referensi `departures.id`
  `day_number`     INT             Nomor hari
  `title`          VARCHAR         Judul agenda
  `description`    TEXT            Deskripsi agenda
  `location`       VARCHAR         Lokasi agenda

Rekomendasi constraint: `day_number > 0`. Pertimbangkan unique
constraint gabungan (`departure_id`, `day_number`) jika satu jadwal
hanya boleh memiliki satu entri per hari.

### 3.8 `facilities`

Master data fasilitas paket.

  Kolom           Tipe      Key   Aturan
  --------------- --------- ----- ---------------------
  `id`            UUID      PK    Identitas fasilitas
  `name`          VARCHAR   UK    Nama fasilitas unik
  `description`   TEXT            Deskripsi, opsional

### 3.9 `package_facilities`

Tabel penghubung many-to-many paket dan fasilitas.

  Kolom           Tipe   Key      Aturan
  --------------- ------ -------- ---------------------------
  `package_id`    UUID   PK, FK   Referensi `packages.id`
  `facility_id`   UUID   PK, FK   Referensi `facilities.id`

Primary key gabungan: (`package_id`, `facility_id`). Kombinasi yang sama
tidak boleh tercatat lebih dari sekali.

### 3.10 `accommodations`

Master data hotel atau akomodasi.

  Kolom                  Tipe      Key   Aturan
  ---------------------- --------- ----- ----------------------
  `id`                   UUID      PK    Identitas akomodasi
  `name`                 VARCHAR         Nama hotel/akomodasi
  `city`                 VARCHAR         Kota
  `country`              VARCHAR         Negara
  `accommodation_type`   VARCHAR         Tipe akomodasi
  `address`              TEXT            Alamat
  `website_url`          VARCHAR         Website, opsional

### 3.11 `package_accommodations`

Tabel penghubung paket dan akomodasi.

  Kolom                  Tipe      Key      Aturan
  ---------------------- --------- -------- -------------------------------
  `package_id`           UUID      PK, FK   Referensi `packages.id`
  `accommodation_id`     UUID      PK, FK   Referensi `accommodations.id`
  `accommodation_role`   VARCHAR            Peran akomodasi dalam paket
  `nights`               INT                Jumlah malam

Primary key gabungan: (`package_id`, `accommodation_id`). Rekomendasi
constraint: `nights >= 0`. Jika hotel yang sama dapat digunakan lebih
dari sekali dengan peran berbeda dalam satu paket, desain primary key
perlu ditinjau ulang.

### 3.12 `articles`

Menyimpan artikel website.

  Kolom             Tipe          Key   Aturan
  ----------------- ------------- ----- ---------------------------
  `id`              UUID          PK    Identitas artikel
  `author_id`       UUID          FK    Referensi `users.id`
  `title`           VARCHAR             Judul artikel
  `slug`            VARCHAR       UK    Slug unik
  `excerpt`         TEXT                Ringkasan artikel
  `content`         TEXT                Isi artikel
  `thumbnail_url`   VARCHAR             URL thumbnail
  `status`          VARCHAR             Status publikasi
  `published_at`    TIMESTAMPTZ         Waktu publikasi, opsional

### 3.13 `galleries`

Menyimpan kumpulan galeri kegiatan.

  Kolom            Tipe      Key   Aturan
  ---------------- --------- ----- ----------------------
  `id`             UUID      PK    Identitas galeri
  `created_by`     UUID      FK    Referensi `users.id`
  `title`          VARCHAR         Judul galeri
  `description`    TEXT            Deskripsi
  `event_date`     DATE            Tanggal kegiatan
  `is_published`   BOOLEAN         Status publikasi

### 3.14 `gallery_images`

Menyimpan gambar di dalam galeri.

  Kolom          Tipe      Key   Aturan
  -------------- --------- ----- -----------------------------
  `id`           UUID      PK    Identitas gambar
  `gallery_id`   UUID      FK    Referensi `galleries.id`
  `image_url`    VARCHAR         URL gambar
  `caption`      TEXT            Keterangan gambar, opsional
  `sort_order`   INT             Urutan tampilan

Rekomendasi constraint: `sort_order >= 0`. Urutan gambar ditentukan
berdasarkan `sort_order`.

### 3.15 `testimonials`

Menyimpan testimoni pelanggan.

  Kolom             Tipe      Key   Aturan
  ----------------- --------- ----- ----------------------
  `id`              UUID      PK    Identitas testimoni
  `created_by`      UUID      FK    Referensi `users.id`
  `customer_name`   VARCHAR         Nama pelanggan
  `content`         TEXT            Isi testimoni
  `rating`          INT             Nilai rating
  `photo_url`       VARCHAR         URL foto, opsional
  `is_published`    BOOLEAN         Status publikasi

Rekomendasi rentang rating: 1 sampai 5.

## 4. Relasi Antar Tabel

  --------------------------------------------------------------------------
  Tabel induk             Tabel anak/penghubung   Kardinalitas
  ----------------------- ----------------------- --------------------------
  `roles`                 `users`                 1 : N

  `users`                 `articles`              1 : N melalui `author_id`

  `users`                 `packages`              1 : N melalui `created_by`

  `users`                 `galleries`             1 : N melalui `created_by`

  `users`                 `testimonials`          1 : N melalui `created_by`

  `categories`            `packages`              1 : N

  `packages`              `departures`            1 : N

  `departures`            `itineraries`           1 : N

  `packages`              `facilities`            N : N melalui
                                                  `package_facilities`

  `packages`              `accommodations`        N : N melalui
                                                  `package_accommodations`

  `galleries`             `gallery_images`        1 : N
  --------------------------------------------------------------------------

`site_settings` tidak memiliki relasi langsung pada ERD saat ini.

## 5. Constraint dan Validasi yang Direkomendasikan

### Unique

-   `roles.name`
-   `users.email`
-   `site_settings.setting_key`
-   `categories.slug`
-   `packages.slug`
-   `articles.slug`
-   `facilities.name`
-   Primary key gabungan pada tabel penghubung.

### Check

-   `departures.quota >= 0`
-   `departures.available_quota >= 0`
-   `departures.available_quota <= departures.quota`
-   `departures.return_date >= departures.departure_date`
-   `itineraries.day_number > 0`
-   `package_accommodations.nights >= 0`
-   `gallery_images.sort_order >= 0`
-   `testimonials.rating BETWEEN 1 AND 5`

### Foreign Key

Semua FK harus mengarah ke primary key yang sesuai. Kebijakan
`ON DELETE` perlu ditetapkan secara eksplisit. Rekomendasi umum: -
Gunakan `RESTRICT` untuk data induk yang masih direferensikan. - Gunakan
`CASCADE` untuk data anak yang memang tidak bermakna tanpa induknya,
misalnya gambar galeri ketika galeri dihapus secara permanen. - Untuk
data operasional/konten yang pernah dipublikasikan, pertimbangkan arsip
atau soft delete daripada hard delete.

## 6. Index yang Direkomendasikan

Selain primary key dan unique index, pertimbangkan index berikut sesuai
pola query:

-   `users(role_id)`
-   `packages(category_id)`
-   `packages(status)`
-   `packages(is_featured)`
-   `departures(package_id)`
-   `departures(departure_date)`
-   `departures(status)`
-   `itineraries(departure_id, day_number)`
-   `package_facilities(facility_id)`
-   `package_accommodations(accommodation_id)`
-   `articles(status, published_at)`
-   `galleries(is_published, event_date)`
-   `gallery_images(gallery_id, sort_order)`
-   `testimonials(is_published)`

Hindari menambahkan index tanpa kebutuhan query yang jelas; evaluasi
menggunakan pola akses dan volume data aktual.

## 7. Catatan Desain dan Gap ERD

Bagian ini penting untuk disepakati sebelum implementasi database.

### 7.1 Harga Paket Belum Ada

ERD belum memiliki kolom harga. Jika website harus menampilkan harga,
pertimbangkan menambahkan: - `price` - `currency` - Opsional:
`price_note` atau informasi periode harga

Jika harga dapat berbeda untuk setiap jadwal keberangkatan, atribut
harga lebih tepat ditempatkan pada `departures` atau tabel harga
tersendiri, bukan hanya pada `packages`.

### 7.2 Kuota dan Booking

Belum ada tabel booking/jamaah. Dengan demikian: - `available_quota`
belum dapat dihitung dari jumlah pemesanan. - Pada MVP, nilai kuota
tersedia perlu diperbarui manual. - Jika kelak ada booking, tentukan
status booking yang mengurangi kuota dan mekanisme transaksi agar tidak
terjadi overselling.

### 7.3 `package_type` dan `categories`

Keduanya berpotensi menyimpan informasi yang mirip. Tetapkan definisi: -
`category`: pengelompokan untuk navigasi/katalog. - `package_type`:
karakteristik atau jenis produk yang lebih spesifik.

Jika tidak ada perbedaan bisnis yang jelas, pertimbangkan menghapus
salah satunya.

### 7.4 Status

Gunakan daftar nilai yang terdokumentasi dan tervalidasi untuk: -
`packages.status` - `departures.status` - `articles.status`

Contoh awal status paket: `draft`, `published`, `archived`. Status
keberangkatan perlu ditetapkan terpisah, misalnya `scheduled`, `full`,
`departed`, `completed`, `cancelled`. Nilai final harus disetujui
pemilik produk.

### 7.5 Konsistensi Publikasi

Artikel menggunakan `status` dan `published_at`, sedangkan
galeri/testimoni menggunakan `is_published`. Tetapkan aturan kapan data
dianggap tampil. Pertimbangkan menyeragamkan pola publikasi agar lebih
mudah dipahami dan diuji.

### 7.6 Audit dan Soft Delete

ERD belum memiliki `updated_by`, `deleted_at`, atau tabel audit log.
Jika perubahan data perlu dilacak, tambahkan mekanisme audit. Untuk data
yang pernah dipakai atau dipublikasikan, soft delete dapat lebih aman
daripada penghapusan permanen.

### 7.7 Media

Kolom gambar saat ini menyimpan URL. Belum ada entitas media terpusat.
Jika kebutuhan pengelolaan file berkembang, pertimbangkan tabel `media`
untuk metadata file, ukuran, tipe MIME, alt text, dan pemilik unggahan.

### 7.8 Role dan Permission

ERD saat ini memakai satu `role_id` pada setiap user. Model ini cukup
untuk dua role sederhana. Jika kelak satu user dapat memiliki banyak
role atau permission granular per modul, dibutuhkan tabel tambahan
seperti `permissions`, `role_permissions`, atau `user_roles`.

## 8. Entitas Tambahan untuk Fase Berikutnya

Tidak dimasukkan ke skema inti MVP karena belum ada pada ERD awal,
tetapi dapat dipertimbangkan sesuai kebutuhan bisnis:

  -----------------------------------------------------------------------
  Entitas                             Tujuan
  ----------------------------------- -----------------------------------
  `inquiries` / `leads`               Menyimpan permintaan konsultasi
                                      calon jamaah.

  `bookings`                          Menyimpan pemesanan paket dan
                                      jadwal.

  `customers` / `pilgrims`            Menyimpan data calon jamaah/jamaah
                                      dengan kontrol privasi ketat.

  `payments`                          Mencatat pembayaran dan statusnya.

  `media`                             Mengelola file unggahan secara
                                      terpusat.

  `audit_logs`                        Mencatat aktivitas penting pengguna
                                      dashboard.
  -----------------------------------------------------------------------

Entitas tambahan tersebut memerlukan analisis kebutuhan, aturan akses,
retensi data, dan keamanan tersendiri.

## 9. Checklist Sebelum Implementasi

-   [ ] Konfirmasi apakah harga paket wajib ditampilkan.
-   [ ] Konfirmasi definisi `package_type` dibanding `category`.
-   [ ] Tetapkan enum/status resmi untuk paket, keberangkatan, dan
    artikel.
-   [ ] Tetapkan apakah kuota dikelola manual atau berasal dari booking.
-   [ ] Tetapkan kebijakan penghapusan dan arsip.
-   [ ] Tetapkan matriks izin Administrator dan Content Manager.
-   [ ] Tetapkan kebijakan unggah dan penyimpanan media.
-   [ ] Tetapkan zona waktu aplikasi dan format timestamp.
-   [ ] Pilih database engine, lalu sesuaikan tipe data, constraint, dan
    sintaks migrasi.
