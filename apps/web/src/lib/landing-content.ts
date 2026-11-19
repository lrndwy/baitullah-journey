/**
 * Baitullah Journey — every word the landing page renders.
 *
 * Text and data extracted from the .fig design. The API does not yet manage
 * packages, departures, testimonials or FAQ, so this module stands in for it.
 * When those modules land, each export below becomes a fetch and the section
 * components do not change.
 */

const MONTHS_ID_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'] as const

export function formatDateId(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return `${day} ${MONTHS_ID_SHORT[month - 1]} ${year}`
}

export function formatRupiah(amount: number): string {
  return `Rp ${Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

export const BRAND = {
  name: 'Baitullah Journey',
  tagline: 'Perjalanan ibadah yang tenang, terencana, dan penuh makna.',
  description: 'Paket Umroh dan Haji dengan pembimbing bersertifikat, akomodasi dekat Masjidil Haram, dan jadwal keberangkatan yang pasti sejak awal.',
  whatsapp: '6281234567890',
  phone: '0800-1-BAITULLAH',
  email: 'salam@baitullahjourney.id',
  address: 'Jl. KH. Abdullah Syafei No. 39, Tebet, Jakarta Selatan 12810',
  license: 'PIHK No. 789/2023 & PPIU No. U.412/2021 (Akreditasi A)',
  copyright: `© ${new Date().getFullYear()} PT Baitullah Global Amanah. Seluruh Hak Cipta Dilindungi Undang-Undang.`,
}

export const NAV_LINKS = [
  { label: 'Beranda', href: '/' },
  { label: 'Paket', href: '/katalog' },
  { label: 'Galeri', href: '/galeri' },
  { label: 'Panduan', href: '/panduan' },
  { label: 'Profil', href: '/profil' },
] as const

export const KURS_INFO = {
  label: 'Kurs Hari Ini',
  rate: 'USD 1 = Rp 16.050',
}

export const HEADER_IZIN = 'Izin Kemenag RI: PPIU No. U.412/2021 & PIHK No. 789/2023 (Akreditasi A)'

export const HERO = {
  overlinePill: {
    icon: 'shield',
    text: 'PPIU Akreditasi A • SK Kemenag RI No. U.412/2021',
  },
  overlineAccent: {
    icon: 'check',
    text: '100% Berangkat Sesuai 5 Pasti Kemenag RI',
  },
  heading: 'Wujudkan Panggilan Suci ke Baitullah\n dengan Amanah & Khusyuk',
  description: 'Bimbingan ibadah mendalam sesuai Sunnah Rasulullah SAW, jaminan kepastian tiket direct tanpa transit melelahkan, dan ketenangan bermalam di hotel Ring-1 pelataran Masjidil Haram & Nabawi.',
  trustSeals: [
    { icon: 'certificate', label: 'PIHK & PPIU', sub: 'Resmi Berizin Kemenag' },
    { icon: 'plane', label: 'Direct Flight', sub: 'Garuda & Saudia\nLangsung' },
    { icon: 'quran', label: 'Mutawwif Bersanad', sub: 'Alumni Madinah & Kairo' },
  ],
  nextDeparture: {
    label: 'PEMBERANGKATAN TERDEKAT',
    date: '14 Rajab 1446 H • Jakarta Direct JED',
    pitSisa: 'Sisa Seat',
    kursiTersisa: 4,
  },
  searchTabs: ['Semua Paket', 'Umroh Reguler', 'Umroh VIP Ramadhan', 'Haji Furoda', 'Haji Khusus'],
  benefitBadges: [
    { icon: 'badge-hotel', text: 'Hotel Bintang 5 Ring-1 (50-100m Depan Masjid)' },
    { icon: 'badge-train', text: 'Termasuk Tiket Kereta Cepat Haramain' },
    { icon: 'badge-audio', text: 'Free Audio Receiver Manasik' },
  ],
  cta: 'Cari Jadwal Ibadah',
}

export const KOMITMEN = {
  overline: 'STANDARISASI KEAMANAN IBADAH RI',
  heading: '5 Komitmen Pasti Ibadah Kemenag',
  description: 'Kami mematuhi seluruh panduan ketat Gerakan 5 Pasti Umroh dari Direktorat Jenderal Penyelenggaraan Haji dan Umrah Kementerian Agama RI tanpa kompromi.',
  items: [
    {
      number: '01',
      title: 'Pasti Travelnya',
      description: 'Penjaminan PPIU & PIHK resmi, berizin dan terakreditasi A oleh Kemenag RI, serta terdaftar di MUI dan Kemenkumham.',
      linkText: 'Cek Izin Travel',
    },
    {
      number: '02',
      title: 'Pasti Tiketnya',
      description: 'Tiket pesawat PP terbit dan terverifikasi H-20 (jadwal pasti Nama di Panggil/NODIP) melalui sistem SISKOPATUH Kemenag.',
      linkText: 'Cek Tiket SISKOPATUH',
    },
    {
      number: '03',
      title: 'Pasti Hotelya',
      description: 'Hotel di Makkah & Madinah telah terverifikasi Kemenag dengan jarak maksimal 500m ke Masjid dan kapasitas kamar jelas.',
      linkText: 'Cek Hotel',
    },
    {
      number: '04',
      title: 'Pasti Visanya',
      description: 'Visa Umroh & Visa Mujamalah resmi terbit melalui sistem Tasheer & Muassasah Saudi Arabia.',
      linkText: 'Visa Resmi Muassasah',
    },
    {
      number: '05',
      title: 'Pasti Bimbingannya',
      description: 'Bimbingan ibadah reguler dan manasik elong oleh muthawwif bersertifikasi resmi Kemenag & alumi timur tengah.',
      linkText: 'Sertifikasi Pembimbing',
    },
  ],
}

export interface CardBadge {
  label: string
  variant: 'gold' | 'emerald'
}

export interface PackageCard {
  imageId: string
  badges: CardBadge[]
  flightLabel: string
  duration: string
  type: string
  title: string
  schedule: string
  hotels: Array<{ name: string; icon: string; distance: string }>
  facilities: string[]
  priceLabel: string
  price: number
  priceNote: string
  ctaPrimary: { label: string; href: string }
  ctaSecondary: { label: string; href: string }
}

export const PAKET = {
  overline: 'PILIHAN TERBAIK JAMAAH',
  heading: 'Katalog Paket Unggulan Musim 1446 H',
  description: 'Transparansi harga total tanpa biaya tersembunyi. Termasuk perlengkapan premium koper hardcase, manasik eksklusif, dan asuransi perjalanan syariah.',
  linkAll: 'Jelajahi Semua 28 Paket',
  cards: [
    {
      imageId: 'umroh-baru',
      badges: [{ label: 'Best Seller', variant: 'gold' }, { label: 'Sisa 6 Seat', variant: 'emerald' }],
      flightLabel: 'Saudia Direct CGK-JED',
      duration: '9 Hari Perjalanan',
      type: 'UMROH REGULER KHIDMAT',
      title: 'Umroh Reguler Barokah 09 Hari',
      schedule: 'Keberangkatan: 18 Januari 2025 • Landing Jeddah,\nPulang Madinah',
      hotels: [
        { name: 'Makkah: Pullman\nZamZam', icon: 'hotel', distance: '50m\nKa\'bah' },
        { name: 'Madinah: Rove Al\nMadinah', icon: 'hotel', distance: '100m\nNabawi' },
      ],
      facilities: ['Fullboard Nusantara', 'Free Kereta Cepat', 'Audio Receiver Manasik'],
      priceLabel: 'Mulai Dari (Quad Room)',
      price: 28500000,
      priceNote: '/ pax • All-in',
      ctaPrimary: { label: 'Lihat Detail', href: '/paket/umroh-reguler-baru' },
      ctaSecondary: { label: 'Konsul WA', href: BRAND.whatsapp },
    },
    {
      imageId: 'turki',
      badges: [{ label: 'Hot Deal', variant: 'gold' }],
      flightLabel: 'Turkish Airlines CGK-IST-JED',
      duration: '12 Hari Perjalanan',
      type: 'UMROH PLUS POPULER',
      title: 'Umroh Plus Turki & Cappadocia 12 Hari',
      schedule: 'Keberangkatan: 05 Februari 2025 • Istanbul, Konya,\nMakkah, Madinah',
      hotels: [
        { name: 'Makkah: Swissotel\nAl Maqam', icon: 'hotel', distance: '50m\nKa\'bah' },
        { name: 'Madinah: Oberoi\nMadinah', icon: 'hotel', distance: '80m\nNabawi' },
      ],
      facilities: ['Fullboard Nusantara', 'Tour Turki Full', 'Audio Receiver Manasik'],
      priceLabel: 'Mulai Dari (Triple Room)',
      price: 42900000,
      priceNote: '/ pax • All-in',
      ctaPrimary: { label: 'Lihat Detail', href: '/paket/umroh-plus-turki' },
      ctaSecondary: { label: 'Konsul WA', href: BRAND.whatsapp },
    },
    {
      imageId: 'furoda',
      badges: [{ label: 'Premium', variant: 'gold' }, { label: 'Terbatas', variant: 'emerald' }],
      flightLabel: 'Garuda Indonesia CGK-JED',
      duration: '14 Hari Perjalanan',
      type: 'HAJI FURODA PREMIUM',
      title: 'Haji Furoda Mujamalah 2025',
      schedule: 'Keberangkatan: 15 Mei 2025 • Jakarta Direct JED,\nPulang JED-CGK',
      hotels: [
        { name: 'Makkah: Raffles\nPalace', icon: 'hotel', distance: '30m\nKa\'bah' },
        { name: 'Madinah: Anwar\nMadinah', icon: 'hotel', distance: '60m\nNabawi' },
      ],
      facilities: ['Fullboard International', 'Visa Mujamalah', 'Tenda VIP Mina'],
      priceLabel: 'Mulai Dari (Triple Room)',
      price: 128000000,
      priceNote: '/ pax • Maktab VIP',
      ctaPrimary: { label: 'Lihat Detail', href: '/paket/haji-furoda' },
      ctaSecondary: { label: 'Konsul WA', href: BRAND.whatsapp },
    },
  ] as PackageCard[],
}

export const STATS = {
  heading: 'Mengapa Ribuan Keluarga Memilih\nBaitullah Journey',
  description: 'Lebih dari satu dekade kami mengabdi sebagai khadim dhyufurrahman (pelayan tamu Allah). Mengedepankan kepastian syariat, transparansi anggaran, dan kehangatan rasa kekeluargaan sejak manasik hingga kepulangan ke tanah air.',
  numbers: [
    { value: '12+', label: 'Tahun Pengabdian', icon: 'calendar' },
    { value: '22.000+', label: 'Jamaah Berangkat', icon: 'users' },
    { value: '98.7%', label: 'Kepuasan Ibadah', icon: 'star' },
    { value: '5', label: 'Kantor Cabang Resmi', icon: 'map' },
  ],
  facilityCards: [
    {
      icon: 'lounge',
      title: 'Executive Lounge VIP',
      description: 'Kenyamanan ruang tunggu eksekutif ber-AC sebelum boarding. Dilengkapi sarapan prasmanan nusantara, musholla khusus, dan penanganan bagasi tanpa repot.',
    },
    {
      icon: 'train',
      title: 'Kereta Cepat Haramain',
      description: 'Perjalanan Makkah ke Madinah hanya 2 jam 20 menit pada kecepatan 300 km/jam, memangkas kelelahan rute darat bus konvensional 6 jam.',
    },
    {
      icon: 'headphone',
      title: 'Audio Receiver Manasik',
      description: 'Setiap jemaah dipinjamkan perangkat receiver wireless jernih. Doa bimbingan muthawwif terdengar jelas meski berada di tengah ribuan jamaah dunia.',
    },
    {
      icon: 'food',
      title: 'Catering Rasa Nusantara 3x Sehari',
      description: 'Menu prasmanan khas Indonesia yang dimasak langsung oleh koki nusantara di hotel Makkah & Madinah untuk menjaga stamina dan selera makan jamaah.',
    },
  ],
}

export interface ScholarCard {
  imageId: string
  name: string
  title: string
  expertise: string
  certification: string
  background: string
}

export const DEWAN = {
  heading: 'Dewan Asatidz & Pembimbing Ibadah',
  description: 'Didampingi secara intensif oleh asatidz berkompeten alumni universitas Islam ternama Timur Tengah, bersertifikasi resmi Kemenag RI serta memahami fikih haji dan umroh secara menyeluruh.',
  overline: 'BIMBINGAN KHUSYUK SESUAI SUNNAH',
  asatidz: [
    {
      imageId: 'asatidz-1',
      name: 'KH. Ahmad Fauzi\nSyihab, Lc., M.Ag.',
      title: 'Dewan Pembina & Pembimbing Ibadah Umroh',
      expertise: 'Mudir Tahfidz & Pengajar Fikih Haji. Membimbing jamaah dalam memahami fadhillah amal dan adab di dua tanah suci.',
      certification: 'Sertifikasi Kemenag No. 719/H',
      background: 'Lulusan Universitas Al-Azhar, Kairo. Dewan Pembina Pesantren',
    },
    {
      imageId: 'asatidz-2',
      name: 'Ust. Muhammad\nAl-Farisi, S.S.',
      title: 'Kepala Muthawwif & Pembimbing Manasik',
      expertise: 'Hafidz 30 Juz & Instruktur Tajwid. Membimbing qiyamullail dan halaqah tadabbur Al-Qur\'an selama di tanah suci.',
      certification: 'Sertifikasi Kemenag No. 720/H',
      background: 'Lulusan Universitas Islam Madinah. Pendamping Haji Khusus',
    },
    {
      imageId: 'asatidz-3',
      name: 'Dr. Yusuf\nAl-Makki, Lc., MA',
      title: 'Pembimbing Ibadah & Konsultan Syariah',
      expertise: 'Mudir Tahfidz & Pengajar Fikih Haji. Membimbing jamaah dalam memahami fadhillah amal dan adab di dua tanah suci.',
      certification: 'Sertifikasi Kemenag No. 721/H',
      background: 'Lulusan Universitas Ummul Qura, Makkah. Dewan Syariah',
    },
    {
      imageId: 'asatidz-4',
      name: 'Ust. Abdul\nQadir, Lc.',
      title: 'Muthawwif & Pembimbing Manasik Khusus',
      expertise: 'Hafidz 30 Juz & Instruktur Tajwid. Membimbing qiyamullail dan halaqah tadabbur Al-Qur\'an selama di tanah suci.',
      certification: 'Sertifikasi Kemenag No. 722/H',
      background: 'Lulusan Universitas Islam Madinah. Pembimbing Lansia & kursi roda',
    },
  ],
}

export interface TestimonialCard {
  imageId: string
  quote: string
  author: string
  origin: string
}

export const TESTIMONI = {
  heading: 'Kisah Sakinah & Jejak Bahagia Jamaah',
  overline: 'Rating 4.9/5 dari 1.420+ Review Terverifikasi di Google Reviews',
  linkGaleri: 'Lihat Galeri Dokumentasi',
  cards: [
    {
      imageId: 'testi-1',
      quote: '"Alhamdulillah, membawa kedua orang tua yang berusia di atas 70 tahun terasa sangat ringan bersama Baitullah Journey. Hotelnya benar-benar di pelataran Ka\'bah, keluar lift langsung jalan kaki santai. Muthawwif sangat telaten mendampingi kursi roda ayah."',
      author: 'Bambang Suryoputro',
      origin: 'Jamaah Umroh Reguler VIP • Jakarta Selatan',
    },
    {
      imageId: 'testi-2',
      quote: '"Keberangkatan Haji Furoda kami berjalan mulus 100%. Dari urusan Visa Mujamalah Tasheer resmi, Tenda Maktab VIP Mina yang sangat dingin dan nyaman, sampai bimbingan manasik dari Ustadz yang menentramkan jiwa. Sangat amanah dan kredibel."',
      author: 'Hj. Ratih Kusumaningrum',
      origin: 'Jamaah Haji Furoda 2024 • Surabaya',
    },
    {
      imageId: 'testi-3',
      quote: '"Audio receiver saat Thawaf dan Sa\'i sangat membantu fokus! Suara doa Ustadz jernih tanpa terdistraksi hiruk pikuk jutaan jemaah. Makanan nusantaranya enak dan selalu cocok di lidah. Rekomendasi travel ibadah terbaik untuk keluarga kami."',
      author: 'Dimas Anggoro & Istri',
      origin: 'Jamaah Umroh Plus Turki • Bandung',
    },
  ],
  photogrid: ['mosaic-1', 'mosaic-2', 'mosaic-3', 'mosaic-4'] as string[],
}

export const EDUKASI = {
  overline: 'EDUKASI & PANDUAN JAMAAH',
  heading: 'Bekali Diri Menuju Ibadah yang\nMabrur',
  description: 'Persiapkan fisik, dokumen, dan wawasan syariah Anda secara matang sebelum menjejakkan kaki di tanah suci dengan panduan komprehensif kami.',
  downloads: [
    {
      icon: 'book',
      title: 'E-Book Manasik Umroh & Doa Harian',
      description: 'Lengkap dengan lafadz Arab, latin, terjemahan Indonesia & tata urutan rukun sesuai sunnah. (PDF • 8.4 MB)',
      cta: 'Unduh Gratis (PDF)',
    },
    {
      icon: 'checklist',
      title: 'Ceklist Persiapan Keberangkatan',
      description: 'Panduan lengkap dokumen, barang bawaan, vaksinasi, & kesehatan fisik untuk jamaah lansia. (PDF • 1.5 MB)',
      cta: 'Unduh Gratis (PDF)',
    },
    {
      icon: 'guidbook',
      title: 'Buku Panduan Ibadah di Masjid Nabawi',
      description: 'Panduan praktis ziyarah, tata cara sholat di Raudhah, dan adab di Masjid Nabawi. (PDF • 3.2 MB)',
      cta: 'Unduh Gratis (PDF)',
    },
  ],
  faqs: [
    {
      q: 'Apa saja dokumen yang diperlukan untuk mendaftar Umroh?',
      a: 'Paspor berlaku minimal 8 bulan, KTP, kartu keluarga, pas foto terbaru, dan formulir kesehatan. Tim kami akan mengirim daftar lengkap setelah pemesanan diterima.',
    },
    {
      q: 'Bagaimana jika saya memiliki kondisi kesehatan khusus atau lansia?',
      a: 'Kami melayani jamaah lansia dan berkebutuhan khusus. Informasikan kondisi Anda saat mengisi formulir pemesanan agar kami siapkan pendampingan kursi roda atau kamar yang sesuai.',
    },
    {
      q: 'Berapa lama proses pengurusan visa Umroh?',
      a: 'Setelah berkas lengkap, pengurusan visa biasanya 7–14 hari kerja, tergantung musim dan antrian Tasheer/Muassasah.',
    },
    {
      q: 'Bagaimana jika terjadi pembatalan karena alasan darurat medis?',
      a: 'Hubungi konsultan Anda segera. Kebijakan refund mengikuti syarat paket dan ketentuan maskapai/visa yang berlaku pada saat itu.',
    },
    {
      q: 'Berapa kali bimbingan manasik diadakan sebelum keberangkatan?',
      a: 'Umumnya dua sesi manasik offline/online sebelum berangkat, plus bimbingan intensif di tanah suci oleh muthawwif bersertifikat.',
    },
  ],
}

export const CTA = {
  overline: 'Layanan Konsultasi Bebas Biaya',
  heading: 'Masih Ragu Menentukan Paket atau Jadwal\nyang Tepat?',
  description: 'Diskusikan kebutuhan perjalanan ibadah Anda dan keluarga bersama Tim Konsultan Ahli Baitullah Journey. Kami siap melayani konsultasi pemilihan kamar, fasilitas lansia, hingga kemudahan skema pembayaran.',
  wa: { label: 'Hubungi WhatsApp Resmi', href: BRAND.whatsapp },
  hotline: { label: 'Hotline Bebas Pulsa', tel: '0800-1-BAITULLAH' },
}

export const FOOTER = {
  tagline: 'PT BAITULLAH GLOBAL AMANAH',
  description: 'Penyelenggara Ibadah Haji Khusus (PIHK) dan Umroh (PPIU) resmi terakreditasi A oleh Kementerian Agama Republik Indonesia. Menjamin kepastian keberangkatan, kenyamanan hotel dekat masjid, dan bimbingan ibadah sesuai sunnah Rasulullah SAW.',
  kop: {
    name: 'Baitullah Journey',
    sub: 'PT BAITULLAH GLOBAL AMANAH',
  },
  groups: [
    {
      title: 'Paket Ibadah',
      links: [
        { label: 'Umroh Reguler', href: '/paket?type=umroh' },
        { label: 'Umroh Ramadhan', href: '/paket?type=ramadhan' },
        { label: 'Umroh Plus', href: '/paket?type=umroh-plus' },
        { label: 'Haji Khusus', href: '/paket?type=haji' },
      ],
    },
    {
      title: 'Kantor Pusat',
      address: ['Jl. KH. Abdullah Syafei No. 39', 'Tebet, Jakarta Selatan 12810', 'Tel: 0800-1-BAITULLAH', 'WA: 6281234567890', 'Email: salam@baitullahjourney.id'],
    },
    {
      title: 'Kantor Cabang',
      branches: [
        { city: 'Bandung', address: 'Jl. Raya Kopo No. 102' },
        { city: 'Surabaya', address: 'Jl. Dharmawangsa No. 45' },
        { city: 'Makassar', address: 'Jl. Pettarani Square Blok C' },
        { city: 'Medan', address: 'Jl. Sisingamangaraja No. 78' },
      ],
    },
  ],
  legal: [
    { label: 'Kebijakan Privasi', href: '/privacy' },
    { label: 'Syarat & Ketentuan', href: '/terms' },
    { label: 'Peta Situs', href: '/sitemap' },
  ],
  social: [
    { icon: 'instagram', href: 'https://instagram.com/baitullahjourney' },
    { icon: 'youtube', href: 'https://youtube.com/@baitullahjourney' },
    { icon: 'facebook', href: 'https://facebook.com/baitullahjourney' },
  ],
}