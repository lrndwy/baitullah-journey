/**
 * Rich non-production demo catalogue. Image URLs are absolute Unsplash/CDN
 * links so `mediaUrl()` serves them without object storage uploads.
 */

export const DEMO_IMAGES = {
  kaabaNight:
    'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=1400&q=80',
  kaabaCrowd:
    'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=1400&q=80',
  madinahDome:
    'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?auto=format&fit=crop&w=1400&q=80',
  madinahCourt:
    'https://images.unsplash.com/photo-1519817659744-611ad0c4a0f8?auto=format&fit=crop&w=1400&q=80',
  haramainTrain:
    'https://images.unsplash.com/photo-1474487548417-781cb71495f3?auto=format&fit=crop&w=1400&q=80',
  airplaneCabin:
    'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1400&q=80',
  hotelLobby:
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=80',
  hotelRoom:
    'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=80',
  familyTravel:
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1400&q=80',
  prayerHands:
    'https://images.unsplash.com/photo-1519817914152-22d216bb9170?auto=format&fit=crop&w=1400&q=80',
  quranOpen:
    'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?auto=format&fit=crop&w=1400&q=80',
  desertRoad:
    'https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=1400&q=80',
  airportGate:
    'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1400&q=80',
  groupPhoto:
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=80',
  portrait1:
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&h=400&q=80',
  portrait2:
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&h=400&q=80',
  portrait3:
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&h=400&q=80',
  portrait4:
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&h=400&q=80',
  portrait5:
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&h=400&q=80',
  portrait6:
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&h=400&q=80',
} as const

export const CATEGORY_SEED = [
  {
    name: 'Umroh Reguler',
    slug: 'umroh-reguler',
    description: 'Paket umroh ekonomis–menengah dengan pembimbing bersanad dan hotel nyaman.',
  },
  {
    name: 'Umroh VIP',
    slug: 'umroh-vip',
    description: 'Paket premium dengan hotel bintang 5 ring-1 dan layanan concierge jamaah.',
  },
  {
    name: 'Umroh Plus',
    slug: 'umroh-plus',
    description: 'Umroh diperpanjang dengan wisata Islami Turki atau Dubai sebelum/sesudah ibadah.',
  },
  {
    name: 'Umroh Ramadhan',
    slug: 'umroh-ramadhan',
    description: 'Program khusus Ramadhan: i’tikaf, tarawih di Haram, dan buka puasa berjamaah.',
  },
  {
    name: 'Haji Khusus',
    slug: 'haji-khusus',
    description: 'Program haji khusus / furoda berizin PIHK dengan pendampingan penuh.',
  },
] as const

export const FACILITY_SEED = [
  { name: 'Fullboard Menu Nusantara', description: 'Makan 3× sehari dengan cita rasa Indonesia di hotel Makkah & Madinah.' },
  { name: 'Kereta Cepat Haramain', description: 'Tiket kereta cepat Makkah–Madinah (sekitar 2 jam 20 menit).' },
  { name: 'Audio Receiver Manasik', description: 'Penerima audio wireless agar bimbingan mutawwif terdengar jelas.' },
  { name: 'Visa & Handling Bandara', description: 'Pengurusan visa umroh/haji serta handling kedatangan–kepulangan.' },
  { name: 'Asuransi Perjalanan', description: 'Perlindungan kesehatan dan bagasi selama perjalanan.' },
  { name: 'Perlengkapan Ibadah', description: 'Koper, tas, buku doa, dan kain ihram (sesuai paket).' },
  { name: 'City Tour Madinah', description: 'Ziarah masjid bersejarah dan situs sunnah di Madinah.' },
  { name: 'Lounge Bandara', description: 'Akses lounge sebelum keberangkatan internasional.' },
] as const

export const ACCOMMODATION_SEED = [
  {
    name: 'Swissôtel Makkah',
    city: 'Makkah',
    country: 'Arab Saudi',
    accommodationType: 'Hotel Bintang 5',
    address: 'King Abdul Aziz Endowment, Ajyad',
  },
  {
    name: 'Pullman Zamzam Makkah',
    city: 'Makkah',
    country: 'Arab Saudi',
    accommodationType: 'Hotel Bintang 5',
    address: 'Jabal Omar, dekat Masjidil Haram',
  },
  {
    name: 'Anjum Hotel Makkah',
    city: 'Makkah',
    country: 'Arab Saudi',
    accommodationType: 'Hotel Bintang 5',
    address: 'Ajyad Street, Ring-1',
  },
  {
    name: 'Madinah Hilton',
    city: 'Madinah',
    country: 'Arab Saudi',
    accommodationType: 'Hotel Bintang 5',
    address: 'King Fahd Road, dekat Masjid Nabawi',
  },
  {
    name: 'Shaza Al Madina',
    city: 'Madinah',
    country: 'Arab Saudi',
    accommodationType: 'Hotel Bintang 5',
    address: 'Central Area, Madinah',
  },
  {
    name: 'Saja Al Madinah',
    city: 'Madinah',
    country: 'Arab Saudi',
    accommodationType: 'Hotel Bintang 4',
    address: 'Near Prophet’s Mosque',
  },
] as const

type PackageSeed = {
  categorySlug: string
  name: string
  slug: string
  description: string
  packageType: string
  basePrice: number
  isFeatured: boolean
  thumbnailUrl: string
  facilityNames: string[]
  stays: Array<{ hotel: string; role: string; nights: number }>
  departures: Array<{
    departureDate: string
    returnDate: string
    quota: number
    availableQuota: number
    airline: string
    status: 'open' | 'full'
    priceOverride?: number
    days: Array<{ dayNumber: number; title: string; description: string; location: string }>
  }>
}

const DAYS_9 = [
  { dayNumber: 1, title: 'Keberangkatan Jakarta', description: 'Berkumpul di bandara, briefing akhir, dan penerbangan menuju Jeddah.', location: 'Jakarta' },
  { dayNumber: 2, title: 'Tiba Jeddah – Makkah', description: 'Handling bandara, perjalanan ke Makkah, check-in hotel, dan istirahat.', location: 'Makkah' },
  { dayNumber: 3, title: 'Umroh Pertama', description: 'Ihram, thawaf, sa’i, dan tahallul dibimbing mutawwif.', location: 'Masjidil Haram' },
  { dayNumber: 4, title: 'Ibadah di Haram', description: 'Shalat berjamaah, thawaf sunnah, dan kajian singkat.', location: 'Makkah' },
  { dayNumber: 5, title: 'Transfer ke Madinah', description: 'Perjalanan dengan kereta cepat Haramain, check-in hotel Madinah.', location: 'Madinah' },
  { dayNumber: 6, title: 'Ziarah Madinah', description: 'Ziarah Masjid Nabawi, Raudhah (sesuai slot), dan situs sunnah.', location: 'Madinah' },
  { dayNumber: 7, title: 'Ibadah di Nabawi', description: 'Memperbanyak shalat dan doa di Masjid Nabawi.', location: 'Madinah' },
  { dayNumber: 8, title: 'Persiapan Kepulangan', description: 'Belanja oleh-oleh, packing, dan manasik penutup.', location: 'Madinah' },
  { dayNumber: 9, title: 'Kepulangan', description: 'Transfer ke bandara dan penerbangan kembali ke tanah air.', location: 'Jeddah / Jakarta' },
]

const DAYS_12 = [
  ...DAYS_9.slice(0, 4),
  { dayNumber: 5, title: 'Thawaf & I’tikaf Ringan', description: 'Waktu luang untuk ibadah di Haram dengan pendampingan.', location: 'Makkah' },
  { dayNumber: 6, title: 'City Tour Makkah', description: 'Kunjungan Jabal Nur / sejarah singkat sesuai kondisi.', location: 'Makkah' },
  { dayNumber: 7, title: 'Transfer Madinah', description: 'Kereta cepat Haramain menuju Madinah.', location: 'Madinah' },
  { dayNumber: 8, title: 'Ziarah & Raudhah', description: 'Ziarah Nabawi dan upaya masuk Raudhah sesuai kuota.', location: 'Madinah' },
  { dayNumber: 9, title: 'Masjid Quba & Qiblatain', description: 'Ziarah masjid bersejarah di Madinah.', location: 'Madinah' },
  { dayNumber: 10, title: 'Ibadah Tenang', description: 'Hari bebas terstruktur untuk ibadah personal.', location: 'Madinah' },
  { dayNumber: 11, title: 'Manasik Penutup', description: 'Evaluasi perjalanan dan doa bersama.', location: 'Madinah' },
  { dayNumber: 12, title: 'Kepulangan', description: 'Transfer bandara dan penerbangan pulang.', location: 'Jeddah / Jakarta' },
]

export const PACKAGE_SEED: PackageSeed[] = [
  {
    categorySlug: 'umroh-reguler',
    name: 'Umroh Reguler Barokah 9 Hari',
    slug: 'umroh-reguler-barokah-09-hari',
    description:
      'Paket umroh 9 hari untuk keluarga. Hotel bintang 4–5 walking distance, mutawwif alumni Madinah, dan jadwal yang tidak terburu-buru.',
    packageType: 'Umroh Reguler',
    basePrice: 28_500_000,
    isFeatured: true,
    thumbnailUrl: DEMO_IMAGES.kaabaNight,
    facilityNames: [
      'Fullboard Menu Nusantara',
      'Kereta Cepat Haramain',
      'Audio Receiver Manasik',
      'Visa & Handling Bandara',
      'Asuransi Perjalanan',
      'Perlengkapan Ibadah',
    ],
    stays: [
      { hotel: 'Anjum Hotel Makkah', role: 'Makkah', nights: 4 },
      { hotel: 'Saja Al Madinah', role: 'Madinah', nights: 3 },
    ],
    departures: [
      {
        departureDate: '2026-12-15',
        returnDate: '2026-12-24',
        quota: 45,
        availableQuota: 18,
        airline: 'Saudia',
        status: 'open',
        days: DAYS_9,
      },
      {
        departureDate: '2027-01-20',
        returnDate: '2027-01-29',
        quota: 40,
        availableQuota: 40,
        airline: 'Garuda Indonesia',
        status: 'open',
        days: DAYS_9,
      },
    ],
  },
  {
    categorySlug: 'umroh-reguler',
    name: 'Umroh Reguler Keluarga 10 Hari',
    slug: 'umroh-reguler-keluarga-10-hari',
    description:
      'Dirancang untuk keluarga dengan anak: tempo lebih longgar, kamar connecting (subject to availability), dan mutawwif ramah keluarga.',
    packageType: 'Umroh Reguler',
    basePrice: 31_900_000,
    isFeatured: false,
    thumbnailUrl: DEMO_IMAGES.familyTravel,
    facilityNames: [
      'Fullboard Menu Nusantara',
      'Kereta Cepat Haramain',
      'Visa & Handling Bandara',
      'Asuransi Perjalanan',
      'Perlengkapan Ibadah',
    ],
    stays: [
      { hotel: 'Anjum Hotel Makkah', role: 'Makkah', nights: 5 },
      { hotel: 'Saja Al Madinah', role: 'Madinah', nights: 3 },
    ],
    departures: [
      {
        departureDate: '2027-02-10',
        returnDate: '2027-02-20',
        quota: 36,
        availableQuota: 22,
        airline: 'Saudia',
        status: 'open',
        days: DAYS_9,
      },
    ],
  },
  {
    categorySlug: 'umroh-vip',
    name: 'Umroh VIP Zamzam 12 Hari',
    slug: 'umroh-vip-zamzam-12-hari',
    description:
      'Hotel bintang 5 ring-1, lounge bandara, guiding rasio kecil, dan layanan concierge untuk keluarga VIP.',
    packageType: 'Umroh VIP',
    basePrice: 42_000_000,
    isFeatured: true,
    thumbnailUrl: DEMO_IMAGES.hotelLobby,
    facilityNames: [
      'Fullboard Menu Nusantara',
      'Kereta Cepat Haramain',
      'Audio Receiver Manasik',
      'Visa & Handling Bandara',
      'Asuransi Perjalanan',
      'Perlengkapan Ibadah',
      'Lounge Bandara',
      'City Tour Madinah',
    ],
    stays: [
      { hotel: 'Swissôtel Makkah', role: 'Makkah', nights: 6 },
      { hotel: 'Madinah Hilton', role: 'Madinah', nights: 4 },
    ],
    departures: [
      {
        departureDate: '2026-11-28',
        returnDate: '2026-12-10',
        quota: 24,
        availableQuota: 6,
        airline: 'Saudia',
        status: 'open',
        priceOverride: 43_500_000,
        days: DAYS_12,
      },
      {
        departureDate: '2027-03-05',
        returnDate: '2027-03-17',
        quota: 24,
        availableQuota: 24,
        airline: 'Garuda Indonesia',
        status: 'open',
        days: DAYS_12,
      },
    ],
  },
  {
    categorySlug: 'umroh-vip',
    name: 'Umroh VIP Platinum Ring-1',
    slug: 'umroh-vip-platinum-ring-1',
    description:
      'Menginap di Pullman Zamzam dengan view Haram (subject to allotment). Ideal untuk orang tua yang ingin dekat masjid.',
    packageType: 'Umroh VIP',
    basePrice: 48_750_000,
    isFeatured: true,
    thumbnailUrl: DEMO_IMAGES.kaabaCrowd,
    facilityNames: [
      'Fullboard Menu Nusantara',
      'Kereta Cepat Haramain',
      'Audio Receiver Manasik',
      'Visa & Handling Bandara',
      'Asuransi Perjalanan',
      'Lounge Bandara',
    ],
    stays: [
      { hotel: 'Pullman Zamzam Makkah', role: 'Makkah', nights: 5 },
      { hotel: 'Shaza Al Madina', role: 'Madinah', nights: 4 },
    ],
    departures: [
      {
        departureDate: '2027-01-08',
        returnDate: '2027-01-19',
        quota: 20,
        availableQuota: 11,
        airline: 'Saudia',
        status: 'open',
        days: DAYS_12,
      },
    ],
  },
  {
    categorySlug: 'umroh-plus',
    name: 'Umroh Plus Istanbul 14 Hari',
    slug: 'umroh-plus-istanbul-14-hari',
    description:
      'Kombinasi umroh dan wisata Islami Istanbul: Hagia Sophia, Blue Mosque, dan Grand Bazaar sebelum pulang ke Indonesia.',
    packageType: 'Umroh Plus',
    basePrice: 39_500_000,
    isFeatured: true,
    thumbnailUrl: DEMO_IMAGES.madinahDome,
    facilityNames: [
      'Fullboard Menu Nusantara',
      'Kereta Cepat Haramain',
      'Visa & Handling Bandara',
      'Asuransi Perjalanan',
      'Perlengkapan Ibadah',
      'City Tour Madinah',
    ],
    stays: [
      { hotel: 'Anjum Hotel Makkah', role: 'Makkah', nights: 4 },
      { hotel: 'Madinah Hilton', role: 'Madinah', nights: 3 },
    ],
    departures: [
      {
        departureDate: '2027-04-12',
        returnDate: '2027-04-26',
        quota: 30,
        availableQuota: 30,
        airline: 'Turkish Airlines',
        status: 'open',
        days: DAYS_12,
      },
    ],
  },
  {
    categorySlug: 'umroh-ramadhan',
    name: 'Umroh Ramadhan Awal 16 Hari',
    slug: 'umroh-ramadhan-awal-16-hari',
    description:
      'Hadir di awal Ramadhan: tarawih di Haram, buka puasa berjamaah, dan pendampingan i’tikaf terbatas.',
    packageType: 'Umroh Ramadhan',
    basePrice: 52_000_000,
    isFeatured: true,
    thumbnailUrl: DEMO_IMAGES.prayerHands,
    facilityNames: [
      'Fullboard Menu Nusantara',
      'Kereta Cepat Haramain',
      'Audio Receiver Manasik',
      'Visa & Handling Bandara',
      'Asuransi Perjalanan',
      'Perlengkapan Ibadah',
    ],
    stays: [
      { hotel: 'Swissôtel Makkah', role: 'Makkah', nights: 8 },
      { hotel: 'Shaza Al Madina', role: 'Madinah', nights: 5 },
    ],
    departures: [
      {
        departureDate: '2027-02-18',
        returnDate: '2027-03-06',
        quota: 28,
        availableQuota: 9,
        airline: 'Saudia',
        status: 'open',
        days: DAYS_12,
      },
    ],
  },
  {
    categorySlug: 'umroh-ramadhan',
    name: 'Umroh Lailatul Qadar 12 Hari',
    slug: 'umroh-lailatul-qadar-12-hari',
    description:
      'Fokus 10 malam terakhir Ramadhan. Kuota terbatas, booking early recommended.',
    packageType: 'Umroh Ramadhan',
    basePrice: 58_500_000,
    isFeatured: false,
    thumbnailUrl: DEMO_IMAGES.quranOpen,
    facilityNames: [
      'Fullboard Menu Nusantara',
      'Kereta Cepat Haramain',
      'Visa & Handling Bandara',
      'Asuransi Perjalanan',
      'Lounge Bandara',
    ],
    stays: [
      { hotel: 'Pullman Zamzam Makkah', role: 'Makkah', nights: 7 },
      { hotel: 'Madinah Hilton', role: 'Madinah', nights: 3 },
    ],
    departures: [
      {
        departureDate: '2027-03-20',
        returnDate: '2027-04-01',
        quota: 20,
        availableQuota: 0,
        airline: 'Saudia',
        status: 'full',
        days: DAYS_12,
      },
    ],
  },
  {
    categorySlug: 'haji-khusus',
    name: 'Haji Furoda Plus 2027',
    slug: 'haji-furoda-plus-2027',
    description:
      'Program haji furoda dengan pendampingan syariat intensif, tenda ber-AC di Arafah/Mina (sesuai allotment), dan hotel dekat area manasik.',
    packageType: 'Haji Khusus',
    basePrice: 185_000_000,
    isFeatured: true,
    thumbnailUrl: DEMO_IMAGES.desertRoad,
    facilityNames: [
      'Fullboard Menu Nusantara',
      'Visa & Handling Bandara',
      'Asuransi Perjalanan',
      'Perlengkapan Ibadah',
      'Audio Receiver Manasik',
      'Lounge Bandara',
    ],
    stays: [
      { hotel: 'Swissôtel Makkah', role: 'Makkah', nights: 10 },
      { hotel: 'Madinah Hilton', role: 'Madinah', nights: 8 },
    ],
    departures: [
      {
        departureDate: '2027-05-28',
        returnDate: '2027-06-20',
        quota: 16,
        availableQuota: 4,
        airline: 'Saudia',
        status: 'open',
        days: DAYS_12,
      },
    ],
  },
]

export const ARTICLE_SEED = [
  {
    title: 'Persiapan Dokumen Umroh: Checklist Lengkap',
    slug: 'persiapan-dokumen-umroh',
    excerpt: 'Paspor, vaksin, mahram, dan berkas Kemenag — susun semuanya sebelum manasik.',
    thumbnailUrl: DEMO_IMAGES.airportGate,
    content: `Sebelum keberangkatan, pastikan dokumen berikut siap:

1. Paspor berlaku minimal 8 bulan
2. Kartu keluarga & buku nikah (bila relevan)
3. Sertifikat vaksin meningitis (ACWY)
4. Foto terbaru sesuai ketentuan visa
5. Formulir kesehatan dan asuransi

Tim Baitullah Journey akan mengingatkan via WhatsApp grup keberangkatan. Simpan salinan digital di cloud dan cetak satu set cadangan.`,
  },
  {
    title: 'Tips Menjaga Kekhusyukan di Tanah Suci',
    slug: 'tips-ibadah-tanah-suci',
    excerpt: 'Fokus pada ibadah, jaga adab di masjid, dan ikuti arahan mutawwif.',
    thumbnailUrl: DEMO_IMAGES.prayerHands,
    content: `Tanah suci ramai. Untuk tetap khusyuk:

- Istirahat cukup sebelum thawaf
- Gunakan audio receiver agar bimbingan terdengar
- Jangan memaksakan diri jika kondisi badan lemah
- Utamakan shalat berjamaah di waktu utama
- Tunda belanja hingga jadwal yang ditentukan

Mutawwif kami siap membantu lansia dan keluarga dengan anak.`,
  },
  {
    title: 'Mengenal Kereta Cepat Haramain',
    slug: 'mengenal-kereta-cepat-haramain',
    excerpt: 'Perjalanan Makkah–Madinah sekitar 2 jam 20 menit dengan kenyamanan kelas ekonomi/bisnis.',
    thumbnailUrl: DEMO_IMAGES.haramainTrain,
    content: `Haramain High Speed Railway menghubungkan Jeddah, Makkah, dan Madinah. Di paket kami, tiket biasanya sudah termasuk.

Datang 45–60 menit sebelum keberangkatan, bawa paspor, dan ikuti petugas handling. Bagasi kabin dibatasi — koper besar biasanya dikirim via bus handling terpisah (sesuai SOP trip).`,
  },
  {
    title: 'Panduan Ihram untuk Pemula',
    slug: 'panduan-ihram-pemula',
    excerpt: 'Kapan berniat, apa yang boleh dan tidak boleh, serta kesalahan umum jamaah baru.',
    thumbnailUrl: DEMO_IMAGES.quranOpen,
    content: `Ihram dimulai dengan niat dan talbiyah di miqat. Untuk jamaah pesawat, miqat biasanya diumumkan awak kabin / mutawwif.

Larangan ihram meliputi wewangian, memotong kuku/rambut, dan beberapa aktivitas lain sesuai fiqh yang diajarkan pembimbing. Tanya langsung jika ragu — lebih baik daripada menebak.`,
  },
  {
    title: 'Hotel Ring-1: Apa Artinya?',
    slug: 'hotel-ring-1-apa-artinya',
    excerpt: 'Istilah “ring-1” merujuk kedekatan berjalan kaki ke Masjidil Haram atau Nabawi.',
    thumbnailUrl: DEMO_IMAGES.hotelLobby,
    content: `Ring-1 biasanya berarti hotel dalam radius berjalan kaki singkat ke masjid. Ini sangat membantu lansia.

Catatan: view langsung ke Kaaba tidak selalu dijamin kecuali disebutkan khusus di kontrak kamar. Tim kami akan menjelaskan allotment saat konfirmasi.`,
  },
  {
    title: 'Persiapan Fisik Sebelum Umroh',
    slug: 'persiapan-fisik-sebelum-umroh',
    excerpt: 'Latihan jalan kaki, hidrasi, dan obat pribadi yang perlu dibawa.',
    thumbnailUrl: DEMO_IMAGES.familyTravel,
    content: `Mulai 4–6 minggu sebelumnya:

- Jalan kaki 30–45 menit sehari
- Latihan naik-turun tangga ringan
- Konsultasi dokter bila punya penyakit kronis
- Bawa obat rutin + surat keterangan

Gunakan sepatu yang sudah “dijinakkan”. Blister di Haram bisa mengganggu ibadah.`,
  },
  {
    title: 'Etika di Masjidil Haram & Nabawi',
    slug: 'etika-di-masjidil-haram-nabawi',
    excerpt: 'Adab duduk, antri Raudhah, dan menjaga ketertiban bersama jamaah dunia.',
    thumbnailUrl: DEMO_IMAGES.madinahCourt,
    content: `Hormati petugas keamanan, jangan mendorong, dan jaga kebersihan. Untuk Raudhah, ikuti sistem slot resmi — jangan menebus jalan dengan memotong antrean.

Wanita dan pria memiliki area serta waktu yang diatur; mutawwif akan mengarahkan sesuai hari tersebut.`,
  },
  {
    title: 'FAQ Pembayaran & Cicilan Paket',
    slug: 'faq-pembayaran-cicilan-paket',
    excerpt: 'DP, pelunasan, dan apa yang terjadi jika jadwal berubah.',
    thumbnailUrl: DEMO_IMAGES.airplaneCabin,
    content: `Alur umum: booking seat → DP → pelunasan sebelum batas yang disepakati → penerbitan dokumen.

Jika airline mengubah jadwal, kami informasikan segera. Biaya tambahan di luar paket (mis. kamar upgrade) dikonfirmasikan tertulis sebelum diproses.`,
  },
] as const

export const GALLERY_SEED = [
  {
    title: 'Keberangkatan Jamaah Desember 2025',
    slug: 'keberangkatan-jamaah-desember-2025',
    description: 'Dokumentasi briefing bandara dan momen keberangkatan jamaah batch Desember.',
    eventDate: '2025-12-12',
    images: [
      { imageUrl: DEMO_IMAGES.groupPhoto, caption: 'Foto bersama sebelum boarding' },
      { imageUrl: DEMO_IMAGES.airportGate, caption: 'Persiapan di gate internasional' },
      { imageUrl: DEMO_IMAGES.airplaneCabin, caption: 'Di kabin menuju Jeddah' },
    ],
  },
  {
    title: 'Ibadah di Masjidil Haram',
    slug: 'ibadah-di-masjidil-haram',
    description: 'Thawaf, sa’i, dan suasana malam di Haram.',
    eventDate: '2025-12-15',
    images: [
      { imageUrl: DEMO_IMAGES.kaabaNight, caption: 'Suasana malam di sekitar Kaaba' },
      { imageUrl: DEMO_IMAGES.kaabaCrowd, caption: 'Jamaah saat thawaf' },
      { imageUrl: DEMO_IMAGES.prayerHands, caption: 'Doa setelah shalat' },
    ],
  },
  {
    title: 'Ziarah & Ibadah di Madinah',
    slug: 'ziarah-ibadah-di-madinah',
    description: 'Masjid Nabawi, Raudhah, dan city tour sunnah.',
    eventDate: '2025-12-18',
    images: [
      { imageUrl: DEMO_IMAGES.madinahDome, caption: 'Kubah hijau Masjid Nabawi' },
      { imageUrl: DEMO_IMAGES.madinahCourt, caption: 'Halaman Masjid Nabawi' },
      { imageUrl: DEMO_IMAGES.quranOpen, caption: 'Kajian singkat di hotel' },
    ],
  },
  {
    title: 'Fasilitas Hotel & Perjalanan',
    slug: 'fasilitas-hotel-perjalanan',
    description: 'Cuplikan kamar, lobby, dan kereta Haramain.',
    eventDate: '2026-01-05',
    images: [
      { imageUrl: DEMO_IMAGES.hotelLobby, caption: 'Lobby hotel Makkah' },
      { imageUrl: DEMO_IMAGES.hotelRoom, caption: 'Contoh kamar twin' },
      { imageUrl: DEMO_IMAGES.haramainTrain, caption: 'Di kereta cepat Haramain' },
    ],
  },
] as const

export const TESTIMONIAL_SEED = [
  {
    customerName: 'Ahmad Fauzi',
    content:
      'Alhamdulillah perjalanan sangat tertata. Mutawwif sabar menjelaskan manasik, dan hotelnya benar-benar dekat masjid. Orangtua saya tidak kelelahan.',
    rating: 5,
    photoUrl: DEMO_IMAGES.portrait1,
  },
  {
    customerName: 'Siti Nurhaliza',
    content:
      'Jadwal jelas sejak awal, handling bandara rapi, dan menu makanannya cocok di lidah. Recommended untuk keluarga.',
    rating: 5,
    photoUrl: DEMO_IMAGES.portrait2,
  },
  {
    customerName: 'Budi Santoso',
    content:
      'Pertama kali umroh. Awalnya gugup, tapi audio receiver dan bimbingan membuat thawaf terasa tenang. Terima kasih Baitullah Journey.',
    rating: 5,
    photoUrl: DEMO_IMAGES.portrait3,
  },
  {
    customerName: 'Dewi Lestari',
    content:
      'Paket VIP-nya worth it. Lounge, guiding kecil, dan respon CS cepat saat ada perubahan seat pesawat.',
    rating: 5,
    photoUrl: DEMO_IMAGES.portrait4,
  },
  {
    customerName: 'Rizky Pratama',
    content:
      'Dokumentasi galeri membantu keluarga di rumah ikut merasakan. Proses pemesanan via formulir juga mudah.',
    rating: 4,
    photoUrl: DEMO_IMAGES.portrait5,
  },
  {
    customerName: 'Nur Aisyah',
    content:
      'Umroh Ramadhan kami terasa khusyuk. Tim selalu mengingatkan waktu tarawih dan menjaga lansia di grup.',
    rating: 5,
    photoUrl: DEMO_IMAGES.portrait6,
  },
] as const

export const SETTINGS_SEED = {
  siteName: 'Baitullah Journey',
  tagline: 'Perjalanan ibadah yang tenang, terencana, dan penuh makna.',
  whatsapp: '6281234567890',
  phone: '0800-1-BAITULLAH',
  email: 'salam@baitullahjourney.id',
  address: 'Jl. KH. Abdullah Syafei No. 39, Tebet, Jakarta Selatan 12810',
  license: 'PIHK No. 789/2023 & PPIU No. U.412/2021 (Akreditasi A)',
  aboutHtml: `<p><strong>Baitullah Journey</strong> adalah merek perjalanan ibadah dari PT Baitullah Global Amanah — penyelenggara Umroh (PPIU) dan Haji Khusus (PIHK) berizin Kementerian Agama RI dengan akreditasi A.</p>
<p>Kami melayani keluarga Indonesia yang ingin menunaikan umroh dan haji dengan pendampingan syariat yang jelas, hotel yang nyaman, serta komunikasi yang tenang sejak manasik hingga kepulangan.</p>
<p>Kantor pusat di Tebet, Jakarta Selatan, dengan jaringan mitra di Bandung, Surabaya, Makassar, dan Medan.</p>`,
} as const
