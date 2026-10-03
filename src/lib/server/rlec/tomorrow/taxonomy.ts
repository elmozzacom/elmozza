// Tomorrow Mode taxonomy fence, aligned with the ECW warehouse (domains -> places).
// Keywords are Indonesian + English, lowercase. Pure data + tiny matchers.

export type PlaceDef = { name: string; keywords: string[] };
export type DomainDef = { id: string; name: string; rlec: string; keywords: string[]; places: PlaceDef[] };

export const DOMAINS: DomainDef[] = [
	{
		id: 'D04',
		name: 'Hospital & Healthcare',
		rlec: 'healthcare',
		keywords: ['rumah sakit', 'rs', 'hospital', 'klinik', 'clinic', 'pasien', 'patient', 'dokter', 'doctor', 'perawat', 'nurse', 'icu', 'igd', 'ugd', 'apotek', 'pharmacy', 'bangsal', 'ward', 'operan', 'handover', 'timbang terima', 'visite', 'medical', 'medis', 'rawat inap', 'poli', 'radiologi', 'radiology', 'operasi', 'surgery'],
		places: [
			{ name: 'ICU', keywords: ['icu', 'intensive care', 'ruang intensif', 'hcu', 'picu', 'nicu'] },
			{ name: 'Emergency room', keywords: ['igd', 'ugd', 'emergency room', 'er', 'gawat darurat'] },
			{ name: 'Pharmacy', keywords: ['apotek', 'pharmacy', 'farmasi', 'pharmacist', 'apoteker'] },
			{ name: 'Outpatient clinic', keywords: ['poli', 'poliklinik', 'outpatient', 'klinik', 'clinic', 'rawat jalan'] },
			{ name: 'Inpatient ward', keywords: ['bangsal', 'ward', 'rawat inap', 'inpatient', 'kamar pasien'] },
			{ name: 'Radiology department', keywords: ['radiologi', 'radiology', 'rontgen', 'x-ray', 'ct scan', 'mri', 'usg'] },
			{ name: 'Operating room reception', keywords: ['kamar operasi', 'operating room', 'operasi', 'surgery', 'bedah'] },
			{ name: 'Hospital reception', keywords: ['pendaftaran', 'registration', 'admisi', 'admission', 'resepsionis rs'] },
			{ name: "Doctor's office", keywords: ['ruang dokter', "doctor's office", 'praktik dokter', 'konsultasi'] },
			{ name: 'Examination room', keywords: ['ruang periksa', 'examination room', 'pemeriksaan'] }
		]
	},
	{
		id: 'D03',
		name: 'Workplace & Office',
		rlec: 'workplace',
		keywords: ['kantor', 'office', 'rapat', 'meeting', 'atasan', 'bos', 'boss', 'manager', 'manajer', 'tim', 'team', 'kolega', 'colleague', 'deadline', 'laporan', 'report', 'wawancara kerja', 'job interview', 'interview', 'wawancara', 'hrd', 'hr', 'zoom', 'gmeet', 'teams', 'update'],
		places: [
			{ name: 'Meeting room', keywords: ['rapat', 'meeting', 'zoom', 'gmeet', 'online meeting', 'video call', 'rapat online'] },
			{ name: 'HR office', keywords: ['hrd', 'hr', 'wawancara', 'interview', 'cuti', 'leave'] },
			{ name: "Manager's office", keywords: ['atasan', 'bos', 'boss', 'manager', 'manajer', 'direktur', 'director'] },
			{ name: 'Open office', keywords: ['kantor', 'office', 'kolega', 'colleague'] }
		]
	},
	{
		id: 'D17',
		name: 'Finance & Business',
		rlec: 'workplace',
		keywords: ['vendor', 'negosiasi', 'negotiation', 'negotiate', 'klien', 'client', 'investor', 'diskon', 'discount', 'harga', 'price', 'kontrak', 'contract', 'pengadaan', 'procurement', 'sales', 'penawaran', 'quotation', 'bank'],
		places: [
			{ name: 'Negotiation room', keywords: ['negosiasi', 'negotiation', 'negotiate', 'diskon', 'discount'] },
			{ name: 'Procurement office', keywords: ['vendor', 'pengadaan', 'procurement', 'supplier', 'penawaran', 'quotation'] },
			{ name: 'Investor meeting', keywords: ['investor', 'pitch'] },
			{ name: 'Sales meeting', keywords: ['sales', 'klien', 'client'] },
			{ name: 'Bank counter', keywords: ['bank', 'rekening', 'account'] }
		]
	},
	{
		id: 'D02',
		name: 'School & Education',
		rlec: 'conference',
		keywords: ['konferensi', 'conference', 'seminar', 'presentasi', 'presentation', 'kuliah', 'lecture', 'kampus', 'campus', 'kelas', 'class', 'dosen', 'lecturer', 'guru', 'teacher', 'sekolah', 'school', 'ujian', 'exam', 'simposium', 'symposium', 'webinar', 'workshop ilmiah', 'case report', 'poster'],
		places: [
			{ name: 'Lecture hall', keywords: ['konferensi', 'conference', 'seminar', 'presentasi', 'presentation', 'simposium', 'symposium', 'webinar', 'case report', 'poster', 'kuliah', 'lecture'] },
			{ name: 'University campus', keywords: ['kampus', 'campus', 'universitas', 'university'] },
			{ name: 'Classroom', keywords: ['kelas', 'class', 'sekolah', 'school', 'guru', 'teacher'] },
			{ name: 'Library', keywords: ['perpustakaan', 'library'] }
		]
	},
	{
		id: 'D05',
		name: 'Restaurant & Food',
		rlec: 'daily_life',
		keywords: ['restoran', 'restaurant', 'kafe', 'cafe', 'café', 'coffee shop', 'makan siang', 'lunch', 'dinner', 'makan malam', 'pesan makanan', 'order food', 'waiter', 'pelayan', 'menu'],
		places: [
			{ name: 'Café', keywords: ['kafe', 'cafe', 'café'] },
			{ name: 'Coffee shop', keywords: ['coffee shop', 'kedai kopi', 'starbucks'] },
			{ name: 'Restaurant', keywords: ['restoran', 'restaurant', 'dinner', 'makan malam', 'lunch', 'makan siang'] },
			{ name: 'Hotel restaurant', keywords: ['restoran hotel', 'hotel restaurant', 'breakfast buffet'] }
		]
	},
	{
		id: 'D07',
		name: 'Transportation',
		rlec: 'travel',
		keywords: ['bandara', 'airport', 'pesawat', 'flight', 'penerbangan', 'kereta', 'train', 'bus', 'taksi', 'taxi', 'grab', 'gojek', 'uber', 'ojek online', 'ride-hailing', 'check-in pesawat', 'boarding'],
		places: [
			{ name: 'Airport terminal', keywords: ['bandara', 'airport', 'check-in pesawat', 'boarding', 'flight', 'penerbangan', 'pesawat'] },
			{ name: 'Ride-hailing pickup point', keywords: ['grab', 'gojek', 'uber', 'ojek online', 'ride-hailing', 'driver'] },
			{ name: 'Taxi', keywords: ['taksi', 'taxi'] },
			{ name: 'Train station', keywords: ['stasiun', 'station', 'kereta', 'train'] }
		]
	},
	{
		id: 'D08',
		name: 'Travel & Tourism',
		rlec: 'travel',
		keywords: ['hotel', 'liburan', 'holiday', 'vacation', 'turis', 'tourist', 'imigrasi', 'immigration', 'bea cukai', 'customs', 'museum', 'tur', 'tour', 'resort'],
		places: [
			{ name: 'Hotel reception', keywords: ['hotel', 'check-in hotel', 'resepsionis hotel', 'front desk'] },
			{ name: 'Immigration counter', keywords: ['imigrasi', 'immigration', 'paspor', 'passport control'] },
			{ name: 'Customs', keywords: ['bea cukai', 'customs'] },
			{ name: 'Tourist information center', keywords: ['turis', 'tourist', 'tur', 'tour', 'museum'] }
		]
	},
	{
		id: 'D06',
		name: 'Shopping & Retail',
		rlec: 'daily_life',
		keywords: ['belanja', 'shopping', 'toko', 'store', 'shop', 'mall', 'supermarket', 'minimarket', 'beli', 'buy'],
		places: [
			{ name: 'Shopping mall', keywords: ['mall', 'shopping'] },
			{ name: 'Supermarket', keywords: ['supermarket', 'minimarket'] },
			{ name: 'Clothing store', keywords: ['baju', 'clothes', 'clothing'] }
		]
	},
	{
		id: 'D09',
		name: 'Public Services',
		rlec: 'daily_life',
		keywords: ['kedutaan', 'embassy', 'visa', 'kantor pos', 'post office', 'polisi', 'police', 'kantor imigrasi', 'pemerintah', 'government'],
		places: [
			{ name: 'Embassy', keywords: ['kedutaan', 'embassy', 'visa'] },
			{ name: 'Post office', keywords: ['kantor pos', 'post office'] },
			{ name: 'Police station', keywords: ['polisi', 'police'] }
		]
	},
	{
		id: 'D18',
		name: 'Technology & Communication',
		rlec: 'workplace',
		keywords: ['customer service', 'cs', 'helpdesk', 'help desk', 'internet', 'wifi', 'laptop', 'aplikasi', 'app', 'error', 'telepon cs'],
		places: [
			{ name: 'Customer support call', keywords: ['customer service', 'cs', 'telepon cs', 'call center'] },
			{ name: 'Help desk', keywords: ['helpdesk', 'help desk', 'it support'] }
		]
	},
	{
		id: 'D10',
		name: 'Social & Community',
		rlec: 'daily_life',
		keywords: ['pesta', 'party', 'pernikahan', 'wedding', 'reuni', 'reunion', 'teman', 'friend', 'tetangga', 'neighbor', 'arisan', 'networking'],
		places: [
			{ name: 'Wedding reception', keywords: ['pernikahan', 'wedding', 'resepsi'] },
			{ name: 'Party venue', keywords: ['pesta', 'party'] },
			{ name: 'Social club', keywords: ['networking', 'komunitas', 'community'] }
		]
	},
	{
		id: 'D19',
		name: 'Emergency Situations',
		rlec: 'daily_life',
		keywords: ['kecelakaan', 'accident', 'ambulans', 'ambulance', 'kebakaran', 'fire', 'bencana', 'disaster', 'evakuasi', 'evacuation', '911', '112'],
		places: [
			{ name: 'Accident scene', keywords: ['kecelakaan', 'accident'] },
			{ name: 'Ambulance', keywords: ['ambulans', 'ambulance'] },
			{ name: 'Emergency hotline call', keywords: ['911', '112', 'hotline', 'telepon darurat'] }
		]
	}
];

/** Situation keywords (ID+EN) -> ECW situation name. First match wins, so specific first. */
export const SITUATIONS: { name: string; keywords: string[] }[] = [
	{ name: 'Handover', keywords: ['handover', 'operan', 'timbang terima', 'serah terima', 'hand over'] },
	{ name: 'Explaining the purpose', keywords: ['jelaskan kondisi', 'menjelaskan kondisi', 'explain the condition', 'kondisi pasien', 'patient condition', 'keluarga pasien', 'patient family', 'edukasi keluarga'] },
	{ name: 'Procedure explanation', keywords: ['prosedur', 'procedure', 'tindakan', 'informed consent', 'consent'] },
	{ name: 'Describing symptoms', keywords: ['gejala', 'symptom', 'sakit', 'keluhan', 'demam', 'fever'] },
	{ name: 'Medication instructions', keywords: ['obat', 'medication', 'medicine', 'resep', 'prescription'] },
	{ name: 'Task status update', keywords: ['update', 'progress', 'laporan progres', 'status update', 'kasih update', 'beri update'] },
	{ name: 'Negotiation', keywords: ['negosiasi', 'negotiate', 'negotiation', 'tawar', 'diskon', 'discount'] },
	{ name: 'Estimate or quotation', keywords: ['penawaran', 'quotation', 'quote', 'estimasi harga'] },
	{ name: 'Delay or cancellation', keywords: ['delay', 'terlambat', 'telat', 'tertunda', 'cancel', 'batal'] },
	{ name: 'Introducing yourself', keywords: ['perkenalan', 'kenalan', 'introduce', 'introduction', 'memperkenalkan diri', 'interview', 'wawancara'] },
	{ name: 'Small talk', keywords: ['ngobrol', 'small talk', 'basa-basi', 'networking', 'coffee break'] },
	{ name: 'Check-in', keywords: ['check-in', 'check in', 'checkin'] },
	{ name: 'Ordering food or drinks', keywords: ['pesan makanan', 'order food', 'memesan', 'order', 'makan siang', 'lunch', 'dinner'] },
	{ name: 'Complaint', keywords: ['komplain', 'complain', 'complaint', 'keluhan layanan'] },
	{ name: 'Asking directions', keywords: ['arah', 'directions', 'jalan ke', 'tersesat', 'lost'] },
	{ name: 'Making an appointment', keywords: ['janji temu', 'appointment', 'booking', 'reservasi', 'reservation'] },
	{ name: 'Meeting arrangement', keywords: ['rapat', 'meeting', 'presentasi', 'presentation', 'seminar', 'konferensi', 'conference'] }
];

/** Strong place words per domain: if a card for domain X names one of these for a different domain, it left the fence. */
export const FOREIGN_PLACE_WORDS: Record<string, string[]> = {
	D04: ['hospital', 'icu', 'ward', 'clinic', 'pharmacy', 'emergency room', 'patient'],
	D05: ['restaurant', 'café', 'cafe', 'waiter', 'menu'],
	D07: ['airport', 'flight', 'boarding pass', 'taxi', 'train station', 'driver'],
	D08: ['hotel', 'immigration', 'customs', 'tourist'],
	D06: ['supermarket', 'shopping mall', 'cashier'],
	D02: ['conference', 'lecture hall', 'classroom', 'seminar'],
	D03: ['office', 'meeting room', 'manager'],
	D17: ['vendor', 'quotation', 'investor'],
	D09: ['embassy', 'police station', 'post office'],
	D19: ['accident scene', 'ambulance'],
	D10: ['wedding', 'party'],
	D18: ['help desk', 'customer support']
};

/** Domains that can legitimately share vocabulary (a hospital vendor meeting is D17 but says 'hospital'). */
export const RELATED_DOMAINS: Record<string, string[]> = {
	D04: ['D19', 'D02'],
	D19: ['D04'],
	D03: ['D17', 'D18', 'D02'],
	D17: ['D03', 'D04'],
	D02: ['D04', 'D03', 'D10'],
	D07: ['D08'],
	D08: ['D07', 'D05'],
	D05: ['D08', 'D10'],
	D10: ['D05', 'D02'],
	D18: ['D03'],
	D06: [],
	D09: ['D08']
};

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Whole-word / whole-phrase match, case-insensitive. */
export function hasKeyword(text: string, kw: string): boolean {
	return new RegExp(`(^|[^\\p{L}\\p{N}])${esc(kw.toLowerCase())}($|[^\\p{L}\\p{N}])`, 'u').test(text.toLowerCase());
}

export const domainById = (id: string | null | undefined) => DOMAINS.find((d) => d.id === id) ?? null;

/** ECW domain id -> rlec_scenarios.domain values that count as the same fence. */
export function rlecDomainsFor(domainId: string): string[] {
	const d = domainById(domainId);
	return d ? [d.rlec] : [];
}
