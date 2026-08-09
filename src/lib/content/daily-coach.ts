export type DailyCoachLesson = {
	id: string;
	day: number;
	title: string;
	objective: string;
	durationMinutes: number;
	dialogue: Array<{ speaker: string; english: string; indonesian: string }>;
	vocabulary: Array<{ english: string; indonesian: string }>;
	grammar: string;
	practice: string;
	question: { prompt: string; options: string[]; answer: number; explanation: string };
	reviews: string[];
};

const makeLesson = (
	day: number,
	title: string,
	objective: string,
	dialogue: DailyCoachLesson['dialogue'],
	vocabulary: DailyCoachLesson['vocabulary'],
	grammar: string,
	practice: string,
	question: DailyCoachLesson['question']
): DailyCoachLesson => ({
	id: `ENG-A1-D${String(day).padStart(2, '0')}`,
	day,
	title,
	objective,
	durationMinutes: 7,
	dialogue,
	vocabulary,
	grammar,
	practice,
	question,
	reviews: ['Review H+1: ulangi kosakata tanpa melihat arti.', 'Review H+3: jawab ulang kuis.', 'Review H+7: gunakan pola dalam dialog baru.']
});

export const dailyCoachLessons: DailyCoachLesson[] = [
	makeLesson(1, 'Greeting and Introduction', 'Learner can greet someone and introduce themselves.', [
		{ speaker: 'A', english: 'Good morning. My name is Ahmad.', indonesian: 'Selamat pagi. Nama saya Ahmad.' },
		{ speaker: 'B', english: 'Good morning, Ahmad. I’m Siti. Nice to meet you.', indonesian: 'Selamat pagi, Ahmad. Saya Siti. Senang bertemu denganmu.' },
		{ speaker: 'A', english: 'Nice to meet you, too. How are you?', indonesian: 'Senang bertemu denganmu juga. Apa kabar?' },
		{ speaker: 'B', english: 'I’m fine, thank you.', indonesian: 'Saya baik, terima kasih.' }
	], [{ english: 'good morning', indonesian: 'selamat pagi' }, { english: 'nice to meet you', indonesian: 'senang bertemu denganmu' }, { english: 'fine', indonesian: 'baik' }], 'I am / You are', 'Tulis dua kalimat untuk memperkenalkan diri.', { prompt: 'Respons yang paling tepat untuk “Nice to meet you” adalah …', options: ['Nice to meet you, too.', 'Good night.', 'I like coffee.', 'See you yesterday.'], answer: 0, explanation: '“Nice to meet you, too” adalah respons alami saat pertama berkenalan.' }),
	makeLesson(2, 'Morning Routine', 'Learner can describe a simple morning routine.', [{ speaker: 'A', english: 'What time do you wake up?', indonesian: 'Pukul berapa kamu bangun?' }, { speaker: 'B', english: 'I wake up at five and have breakfast.', indonesian: 'Saya bangun pukul lima dan sarapan.' }], [{ english: 'wake up', indonesian: 'bangun' }, { english: 'breakfast', indonesian: 'sarapan' }, { english: 'morning', indonesian: 'pagi' }], 'Present simple: I wake up / She wakes up', 'Ceritakan rutinitas pagi Anda dalam dua kalimat.', { prompt: 'Pilih kalimat yang benar.', options: ['I wake up at five.', 'I wakes up at five.', 'I waking up at five.', 'I woke up every morning.'], answer: 0, explanation: 'Untuk subjek I, gunakan bentuk dasar: wake up.' }),
	makeLesson(3, 'Breakfast and Preferences', 'Learner can state a preference and respond to an offer.', [{ speaker: 'A', english: 'Would you like some coffee?', indonesian: 'Apakah Anda mau kopi?' }, { speaker: 'B', english: 'Yes, please. I’d like some coffee.', indonesian: 'Ya, terima kasih. Saya mau kopi.' }], [{ english: 'would like', indonesian: 'ingin/mau saat ini' }, { english: 'prefer', indonesian: 'lebih memilih' }, { english: 'sugar', indonesian: 'gula' }], 'Would you like …? → Yes, please / No, thank you.', 'Tulis preferensi sarapan Anda.', { prompt: 'Jawaban yang paling alami untuk “Would you like some tea?” adalah …', options: ['Yes, please.', 'I like yesterday.', 'Tea is a noun.', 'No, I do.'], answer: 0, explanation: 'Untuk tawaran saat ini, gunakan “Yes, please” atau “No, thank you”.' }),
	makeLesson(4, 'Leaving Home and Transport', 'Learner can say how they travel.', [{ speaker: 'A', english: 'How do you go to work?', indonesian: 'Bagaimana Anda pergi kerja?' }, { speaker: 'B', english: 'I go by bus. I leave home at seven.', indonesian: 'Saya naik bus. Saya berangkat dari rumah pukul tujuh.' }], [{ english: 'leave home', indonesian: 'berangkat dari rumah' }, { english: 'by bus', indonesian: 'naik bus' }, { english: 'traffic', indonesian: 'lalu lintas' }], 'go home tanpa “to”; go to work dengan “to”.', 'Tulis cara Anda pergi ke tempat kerja.', { prompt: 'Pilih kalimat yang tepat.', options: ['I go home by bus.', 'I go to home by bus.', 'I go bus home to.', 'I am go home bus.'], answer: 0, explanation: 'Gunakan “go home”, tanpa “to”.' }),
	makeLesson(5, 'At the Workplace', 'Learner can use basic workplace expressions.', [{ speaker: 'A', english: 'Good morning. Are you ready for the meeting?', indonesian: 'Selamat pagi. Apakah Anda siap untuk rapat?' }, { speaker: 'B', english: 'Yes, I am. I have the report.', indonesian: 'Ya. Saya membawa laporannya.' }], [{ english: 'meeting', indonesian: 'rapat' }, { english: 'report', indonesian: 'laporan' }, { english: 'ready', indonesian: 'siap' }], 'Be: I am / You are / We are.', 'Tulis satu kalimat tentang pekerjaan Anda hari ini.', { prompt: 'Pilih respons yang benar untuk “Are you ready?”', options: ['Yes, I am.', 'Yes, I ready.', 'I am yes.', 'Ready are.'], answer: 0, explanation: 'Pertanyaan dengan “Are you” dijawab “Yes, I am.”' }),
	makeLesson(6, 'Short Meeting', 'Learner can give a short update in a meeting.', [{ speaker: 'A', english: 'Can you give us an update?', indonesian: 'Bisakah Anda memberi kami pembaruan?' }, { speaker: 'B', english: 'The project is on schedule.', indonesian: 'Proyek berjalan sesuai jadwal.' }], [{ english: 'update', indonesian: 'pembaruan' }, { english: 'schedule', indonesian: 'jadwal' }, { english: 'project', indonesian: 'proyek' }], 'Can you …? untuk permintaan sopan.', 'Buat satu kalimat update singkat.', { prompt: 'Arti “on schedule” adalah …', options: ['sesuai jadwal', 'terlambat', 'sangat mahal', 'sudah selesai'], answer: 0, explanation: 'On schedule berarti berjalan sesuai jadwal.' }),
	makeLesson(7, 'Weekly Review', 'Learner reviews greetings, routines, preferences, transport, and work.', [{ speaker: 'A', english: 'How was your week?', indonesian: 'Bagaimana minggu Anda?' }, { speaker: 'B', english: 'It was busy, but good.', indonesian: 'Sibuk, tetapi baik.' }], [{ english: 'week', indonesian: 'minggu' }, { english: 'busy', indonesian: 'sibuk' }, { english: 'review', indonesian: 'ulasan' }], 'Review present simple and polite responses.', 'Ulangi satu dialog dari Day 1–6.', { prompt: 'Pilih kalimat yang paling alami.', options: ['It was busy, but good.', 'It busy but good is.', 'Busy it was good.', 'It was busily good.'], answer: 0, explanation: 'Struktur yang alami: It was busy, but good.' }),
	makeLesson(8, 'At the Canteen', 'Learner can order food and drink politely.', [{ speaker: 'A', english: 'What would you like to eat?', indonesian: 'Anda ingin makan apa?' }, { speaker: 'B', english: 'I’d like rice and chicken, please.', indonesian: 'Saya mau nasi dan ayam, terima kasih.' }], [{ english: 'canteen', indonesian: 'kantin' }, { english: 'order', indonesian: 'memesan' }, { english: 'chicken', indonesian: 'ayam' }], 'I’d like … untuk memesan.', 'Tulis pesanan makanan Anda.', { prompt: 'Untuk memesan dengan sopan, pilih …', options: ['I’d like rice, please.', 'I like rice now.', 'Rice is like.', 'Give rice.'], answer: 0, explanation: 'I’d like … adalah bentuk sopan untuk pesanan saat ini.' }),
	makeLesson(9, 'Telephone Message', 'Learner can take a simple telephone message.', [{ speaker: 'A', english: 'May I speak to Mr. Hasan?', indonesian: 'Bolehkah saya berbicara dengan Pak Hasan?' }, { speaker: 'B', english: 'He is not available. Can I take a message?', indonesian: 'Beliau tidak tersedia. Bisakah saya menerima pesan?' }], [{ english: 'available', indonesian: 'tersedia' }, { english: 'message', indonesian: 'pesan' }, { english: 'call back', indonesian: 'menelepon kembali' }], 'May I …? untuk permintaan formal/sopan.', 'Buat satu pesan telepon singkat.', { prompt: 'Arti “Can I take a message?” adalah …', options: ['Bolehkah saya menerima pesan?', 'Saya akan mengirim foto.', 'Bisakah saya pergi?', 'Saya tidak punya telepon.'], answer: 0, explanation: 'Frasa ini digunakan untuk menawarkan menerima pesan telepon.' }),
	makeLesson(10, 'Asking About Time', 'Learner can ask and tell the time.', [{ speaker: 'A', english: 'What time is the appointment?', indonesian: 'Jam berapa janji temu?' }, { speaker: 'B', english: 'It is at half past two.', indonesian: 'Pukul dua lewat tiga puluh.' }], [{ english: 'appointment', indonesian: 'janji temu' }, { english: 'half past', indonesian: 'lewat tiga puluh' }, { english: 'quarter', indonesian: 'seperempat' }], 'What time is …? / It is at …', 'Tulis waktu kegiatan Anda besok.', { prompt: '“Half past two” berarti …', options: ['2:30', '2:15', '2:45', '3:00'], answer: 0, explanation: 'Half past two = pukul 2:30.' }),
	makeLesson(11, 'Community Invitation', 'Learner can invite and respond to an invitation.', [{ speaker: 'A', english: 'Would you like to join our community event?', indonesian: 'Apakah Anda ingin ikut acara komunitas kami?' }, { speaker: 'B', english: 'Yes, I’d love to.', indonesian: 'Ya, saya sangat mau.' }], [{ english: 'join', indonesian: 'bergabung' }, { english: 'event', indonesian: 'acara' }, { english: 'invitation', indonesian: 'undangan' }], 'Would you like to …? / I’d love to.', 'Buat undangan singkat untuk teman.', { prompt: 'Respons positif yang alami untuk undangan adalah …', options: ['I’d love to.', 'I love.', 'Yes, I join yesterday.', 'Event good.'], answer: 0, explanation: 'I’d love to adalah respons positif dan ramah.' }),
	makeLesson(12, 'Going Home', 'Learner can describe going home after work.', [{ speaker: 'A', english: 'What do you do after work?', indonesian: 'Apa yang Anda lakukan setelah kerja?' }, { speaker: 'B', english: 'I go home and rest.', indonesian: 'Saya pulang dan beristirahat.' }], [{ english: 'after work', indonesian: 'setelah kerja' }, { english: 'rest', indonesian: 'istirahat' }, { english: 'finish', indonesian: 'selesai' }], 'After I finish work / After finishing work.', 'Tulis aktivitas Anda setelah kerja.', { prompt: 'Pilih kalimat yang benar.', options: ['After I finish work, I go home.', 'After finish my work, I go home.', 'After I finish work, I go to home.', 'After work finish, I go.'], answer: 0, explanation: 'Gunakan subjek: After I finish work.' }),
	makeLesson(13, 'Evening Plans', 'Learner can discuss a simple evening plan.', [{ speaker: 'A', english: 'Do you have any plans tonight?', indonesian: 'Apakah Anda punya rencana malam ini?' }, { speaker: 'B', english: 'I am going to read a book.', indonesian: 'Saya akan membaca buku.' }], [{ english: 'tonight', indonesian: 'malam ini' }, { english: 'plan', indonesian: 'rencana' }, { english: 'going to', indonesian: 'akan' }], 'be going to untuk rencana.', 'Tulis rencana Anda malam ini.', { prompt: 'Pilih bentuk rencana yang benar.', options: ['I am going to read.', 'I going to read.', 'I am go to read.', 'I read going.'], answer: 0, explanation: 'Gunakan I am going to + verb.' }),
	makeLesson(14, 'Final Review', 'Learner combines key language from the 14-day pilot.', [{ speaker: 'A', english: 'Nice to see you again. How was your day?', indonesian: 'Senang bertemu lagi. Bagaimana hari Anda?' }, { speaker: 'B', english: 'It was good. I learned a lot.', indonesian: 'Baik. Saya belajar banyak.' }], [{ english: 'again', indonesian: 'lagi' }, { english: 'learned', indonesian: 'belajar (lampau)' }, { english: 'a lot', indonesian: 'banyak' }], 'Review: greetings, offers, routines, plans, and polite replies.', 'Buat dialog empat kalimat memakai materi yang sudah dipelajari.', { prompt: 'Kalimat penutup yang tepat setelah pilot adalah …', options: ['I learned a lot.', 'I learn lot yesterday now.', 'A lot learned I.', 'Learn is lot.'], answer: 0, explanation: 'I learned a lot adalah kalimat lampau yang benar dan alami.' })
];

export const getDailyCoachLesson = (day: number) => dailyCoachLessons.find((lesson) => lesson.day === day);

export function verifyDailyCoachAnswer(dayValue: FormDataEntryValue | null, answerValue: FormDataEntryValue | null) {
	const day = Number(dayValue);
	const lesson = getDailyCoachLesson(day);
	if (!lesson) return { error: 'Lesson tidak valid.' } as const;
	if (answerValue === null || answerValue === '') return { error: 'Jawaban wajib dipilih.' } as const;
	const answer = Number(answerValue);
	if (!Number.isInteger(answer) || answer !== lesson.question.answer) {
		return { error: 'Jawaban belum tepat.' } as const;
	}
	return { day, lesson } as const;
}
