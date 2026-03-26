import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'https://backbone-thartiyali.nicecurry.fun';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:3b';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemma-3-27b-it';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===== QUESTION CATEGORIES =====

const BASE_RULES = `
Role: Kamu adalah teman ngobrol yang asik, punya intuisi tajam, dan jago mencairkan suasana.

ATURAN OUTPUT — WAJIB DIPATUHI, TANPA PENGECUALIAN:
1. HANYA SATU KALIMAT TANYA. Satu. Tidak lebih.
2. Dilarang keras kasih pengantar, komentar, atau penjelasan apa pun sebelum maupun sesudah pertanyaan.
3. Dilarang menjawab atau menebak jawaban dari pertanyaanmu sendiri.
4. Gunakan bahasa tongkrongan yang natural — "gue/lo" atau "aku/kamu", pakai partikel santai seperti "sih", "deh", "nggak", "ya".
5. Gaya bicara: hangat, personal, sedikit penasaran — tapi nggak kayak interogasi polisi.
6. Output langsung pertanyaannya. Tanpa tanda kutip, tanpa nomor, tanpa label, tanpa basa-basi.
7. GENERATE PERTANYAAN BARU yang belum pernah ada sebelumnya — jangan salin contoh, tapi ikuti gayanya.`;

const CATEGORY_PROMPTS = {
  pasangan: {
    label: 'Pasangan',
    emoji: '💕',
    prompt: `Buat satu pertanyaan intim tentang 'unspoken feelings' antara pasangan. Fokus ke hal kecil yang bikin ngerasa dilihat atau justru ngerasa jauh — bukan pertanyaan klise.

POLA CONTOH — ikuti gaya dan kedalamannya, tapi BUAT YANG BERBEDA:
- Kapan sih momen terakhir kali kamu ngerasa bener-bener disayang sama aku tanpa aku harus ngomong apa-apa?
- Ada nggak sih kebiasaan kecil aku yang sebenernya bikin kamu baper tapi kamu malu buat bilang?
- Apa satu hal dari diri kamu yang cuma boleh aku yang tau dan orang lain nggak perlu liat?
- Kapan kamu ngerasa paling butuh aku tapi malah milih buat diem aja?
- Pernah nggak kamu tiba-tiba kangen aku padahal kita lagi ada di ruangan yang sama?
- Apa sih ekspektasi ke aku yang sebenernya pengen kamu omongin tapi takut bikin aku kepikiran?
- Momen apa yang bikin kamu mikir "Untung ya aku nemuin orang kayak dia"?
- Ada nggak hal yang dulu kamu anggap dealbreaker tapi ternyata di aku malah bikin nyaman?
- Bagian mana dari hari-hari kita yang paling bikin kamu ngerasa 'pulang'?
- Kalau kita lagi berantem, sebenernya apa yang paling kamu butuhin dari aku biar bisa cepet baikan?`
  },

  pertemanan: {
    label: 'Pertemanan',
    emoji: '👫',
    prompt: `Buat satu pertanyaan yang membongkar sisi jujur di balik persahabatan. Fokus ke persepsi tersembunyi atau hal yang sering dipikirin tapi jarang diomongkan.

POLA CONTOH — ikuti gaya dan kedalamannya, tapi BUAT YANG BERBEDA:
- Sejujurnya, apa sih impresi pertama lo ke gue yang ternyata salah total setelah kita kenal lama?
- Ada nggak sifat gue yang sebenernya bikin lo agak capek tapi lo tetep maklumin?
- Kapan momen lo ngerasa kita bener-bener 'klik' dan nggak cuma temenan formalitas doang?
- Apa satu hal yang lo iri dari hidup gue tapi belum pernah berani lo akuin?
- Pernah nggak lo ngerasa pengen jaga jarak bentar sama gue gara-gara hal yang sebenernya sepele?
- Menurut lo, gue bakal jadi orang kayak gimana kalau kita nggak pernah ketemu?
- Hal random apa yang tiba-tiba bikin lo kepikiran gue pas lagi sendirian?
- Lo ngerasa paling jadi diri sendiri pas kita lagi ngelakuin apa sih?
- Kalau kita berantem hebat, masalah apa yang menurut lo bisa bener-bener bikin pertemanan kita bubar?
- Sisi gue yang mana sih yang menurut lo paling sering gue sembunyiin dari orang lain?`
  },

  keluarga: {
    label: 'Keluarga',
    emoji: '🏠',
    prompt: `Buat satu pertanyaan yang menjembatani memori kolektif tentang rumah, tradisi kecil, atau perasaan yang jarang diungkap ke orang tua atau saudara.

POLA CONTOH — ikuti gaya dan kedalamannya, tapi BUAT YANG BERBEDA:
- Bau masakan apa yang kalau dicium langsung bikin kamu berasa ada di rumah?
- Apa satu aturan di rumah dulu yang kamu benci banget, tapi sekarang malah kamu terapin juga?
- Ada nggak kejadian masa kecil yang paling pengen kamu ulang sekali lagi?
- Pernah nggak kamu ngerasa pengen bilang terima kasih ke Ayah/Ibu tapi momennya nggak pernah pas?
- Apa satu hal tentang keluarga kita yang menurut kamu paling unik dibanding keluarga orang lain?
- Momen apa yang paling bikin kamu ngerasa keluarga kita tuh bener-bener solid?
- Ada nggak rahasia kecil masa kecil yang sampe sekarang orang tua kita belum tau?
- Kalau rumah kita bisa ngomong, kira-kira dia bakal cerita apa soal masa kecil kita?
- Apa pelajaran hidup paling berharga yang tanpa sadar kamu dapet dari ngeliat keseharian Ayah/Ibu?
- Siapa anggota keluarga yang paling sering kamu kangenin pas lagi ngerasa capek sama dunia?`
  },

  dalam: {
    label: 'Deep Talk',
    emoji: '🌊',
    prompt: `Buat satu pertanyaan eksistensial yang personal dan memaksa lawan bicara pause sejenak. Fokus ke transisi diri, penyesalan, atau definisi hidup yang belum pernah diucapkan.

POLA CONTOH — ikuti gaya dan kedalamannya, tapi BUAT YANG BERBEDA:
- Kapan terakhir kali lo ngerasa bener-bener bangga sama diri lo sendiri tanpa perlu validasi orang lain?
- Bagian mana dari diri lo yang paling susah buat lo maafin sampe sekarang?
- Kalau hari ini adalah hari terakhir lo, apa satu hal yang bakal paling lo sesali karena belum sempet dilakuin?
- Apa ketakutan terbesar lo yang sebenernya nggak masuk akal tapi selalu menghantui?
- Sejak kapan lo mulai ngerasa kalau 'dewasa' itu nggak seindah yang lo bayangin pas kecil?
- Siapa versi diri lo yang paling pengen lo tinggalin di masa lalu?
- Apa satu hal yang lo anggap bener lima tahun lalu tapi sekarang lo sadar itu salah banget?
- Pernah nggak lo ngerasa kesepian banget padahal lagi ada di tengah keramaian?
- Apa definisi 'cukup' buat lo sebelum akhirnya memutuskan buat berhenti ngejar sesuatu?
- Kalau lo bisa ngobrol sama diri lo versi 10 tahun yang lalu, apa satu peringatan yang bakal lo kasih?`
  },

  nostalgia: {
    label: 'Nostalgia',
    emoji: '📸',
    prompt: `Buat satu pertanyaan yang memicu 'sensory memory'. Fokus ke benda, lagu, suara, atau sudut kota yang menyimpan cerita masa lalu yang spesifik dan vivid.

POLA CONTOH — ikuti gaya dan kedalamannya, tapi BUAT YANG BERBEDA:
- Lagu apa yang kalau diputer langsung bikin kamu inget sama seseorang atau masa-masa tertentu?
- Ada nggak tempat yang dulu sering kamu datengin tapi sekarang udah berubah total atau nggak ada lagi?
- Mainan atau benda apa yang paling kamu sayangi dulu sampe nggak mau pisah sedetik pun?
- Inget nggak momen 'terakhir kali' kamu main sama temen kecil sebelum akhirnya sibuk masing-masing?
- Siapa orang yang udah lama nggak ketemu tapi profilnya masih sering kamu lirik diem-diem?
- Apa jajanan masa kecil yang rasanya paling nggak bisa kamu lupain sampe sekarang?
- Suara apa yang kalau kamu denger langsung bikin kamu ngerasa balik ke masa kecil?
- Pernah nggak kamu nemu barang lama di gudang terus tiba-tiba jadi emosional sendiri?
- Apa satu hobi masa kecil yang sebenernya pengen banget kamu lakuin lagi tapi ngerasa udah telat?
- Kapan momen kamu ngerasa paling bebas dan nggak punya beban apa-apa dalam hidup?`
  },

  seru: {
    label: 'Seru',
    emoji: '🎉',
    prompt: `Buat satu pertanyaan 'chaos' ringan atau perdebatan sepele yang memicu tawa atau jawaban spontan yang konyol. Makin absurd makin bagus.

POLA CONTOH — ikuti gaya dan kedalamannya, tapi BUAT YANG BERBEDA:
- Jujur deh, apa hal paling nggak penting yang pernah lo beli cuma gara-gara laper mata doang?
- Kalau lo tiba-tiba jadi presiden selama sehari, aturan konyol apa yang bakal lo buat?
- Mending bau badan tapi ganteng/cantik maksimal, atau wangi banget tapi muka standar?
- Apa kebiasaan paling aneh yang lo lakuin kalau lagi sendirian di kamar dan nggak ada yang liat?
- Kalau harus makan satu jenis makanan seumur hidup, lo pilih apa dan kenapa?
- Apa momen paling memalukan yang pernah lo alamin di depan umum tapi sekarang jadi cerita lucu?
- Siapa karakter fiksi yang menurut lo paling 'lo banget' secara kepribadian?
- Kalau lo dapet uang 1 miliar tapi harus diabisin dalam satu jam, lo beli apa aja?
- Apa 'hot take' lo tentang hal sepele yang menurut lo semua orang salah paham?
- Kalau bisa punya kekuatan super tapi yang nggak berguna sama sekali, lo mau punya kekuatan apa?`
  }
};

// ===== QUESTION GENERATION =====
function cleanOutput(raw) {
  let q = raw.trim()
    .replace(/^["'`*#\-–—]+\s*/g, '')
    .replace(/^\d+\.\s*/, '')
    .split(/\n/)[0]
    .trim();
  const firstQ = q.match(/^[^?]+\?/);
  if (firstQ) q = firstQ[0].trim();
  return q;
}

async function generateWithGemini(systemPrompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Siap.' }] },
        { role: 'user', parts: [{ text: 'Satu pertanyaan.' }] }
      ],
      generationConfig: {
        temperature: 0.95,
        topP: 0.9,
        maxOutputTokens: 120,
        stopSequences: ['\n']
      }
    }),
    signal: AbortSignal.timeout(15000)
  });

  if (response.status === 429) throw Object.assign(new Error('Gemini rate limit'), { rateLimited: true });
  if (!response.ok) throw new Error(`Gemini error: ${response.status}`);

  const data = await response.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!raw) throw new Error('Gemini empty response');
  return cleanOutput(raw);
}

async function generateWithOllama(systemPrompt) {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Satu pertanyaan.' }
      ],
      stream: false,
      options: { temperature: 0.95, top_p: 0.9, repeat_penalty: 1.15, stop: ['\n'] }
    }),
    signal: AbortSignal.timeout(30000)
  });

  if (!response.ok) throw new Error(`Ollama error: ${response.status}`);
  const data = await response.json();
  const raw = data.message?.content || '';
  if (!raw) throw new Error('Ollama empty response');
  return cleanOutput(raw);
}

async function generateQuestion(category, previousQuestions = []) {
  const cat = CATEGORY_PROMPTS[category] || CATEGORY_PROMPTS.pasangan;
  const avoidClause = previousQuestions.length > 0
    ? `\n\nHINDARI pertanyaan yang mirip dengan ini: ${previousQuestions.slice(-8).map(q => `"${q}"`).join(', ')}`
    : '';
  const systemPrompt = `${cat.prompt}\n${BASE_RULES}${avoidClause}`;

  if (GEMINI_API_KEY) {
    try {
      const q = await generateWithGemini(systemPrompt);
      console.log('[AI] Gemini ✓');
      return q;
    } catch (err) {
      console.warn(`[AI] Gemini gagal (${err.message}), fallback ke Ollama...`);
    }
  }

  const q = await generateWithOllama(systemPrompt);
  console.log('[AI] Ollama ✓');
  return q;
}

// ===== REST API =====
app.post('/api/generate', async (req, res) => {
  const { category = 'pasangan', previousQuestions = [] } = req.body;
  try {
    const question = await generateQuestion(category, previousQuestions);
    const cat = CATEGORY_PROMPTS[category] || CATEGORY_PROMPTS.pasangan;
    res.json({ question, category: cat.label, emoji: cat.emoji });
  } catch (err) {
    console.error('Generate error:', err.message);
    res.status(500).json({ error: 'Gagal membuat pertanyaan. Coba lagi.' });
  }
});

app.get('/api/categories', (_req, res) => {
  res.json(Object.entries(CATEGORY_PROMPTS).map(([id, c]) => ({ id, label: c.label, emoji: c.emoji })));
});

// ===== ROOM MANAGEMENT =====
const rooms = new Map();
const socketToRoom = new Map();

function genRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 4; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function getRoomPublicState(room) {
  return {
    id: room.id,
    mode: room.mode,
    category: room.category,
    status: room.status,
    currentTurn: room.currentTurn,
    questionCount: room.questionCount,
    players: {
      host: room.host ? { name: room.host.name } : null,
      guest: room.guest ? { name: room.guest.name } : null
    }
  };
}

// ===== SOCKET.IO =====
io.on('connection', (socket) => {
  console.log(`[+] ${socket.id}`);

  socket.on('create-room', ({ name, category }) => {
    if (!name?.trim()) return socket.emit('error', { message: 'Masukkan nama terlebih dahulu.' });

    let roomId;
    do { roomId = genRoomId(); } while (rooms.has(roomId));

    const room = {
      id: roomId,
      mode: 'online',
      host: { id: socket.id, name: name.trim() },
      guest: null,
      category: category || 'pasangan',
      status: 'waiting',
      currentTurn: 'host',
      questionCount: 0,
      previousQuestions: []
    };

    rooms.set(roomId, room);
    socketToRoom.set(socket.id, roomId);
    socket.join(roomId);

    socket.emit('room-created', { roomId, room: getRoomPublicState(room) });
    console.log(`Room created: ${roomId} by ${name}`);
  });

  socket.on('join-room', ({ roomId, name }) => {
    if (!name?.trim()) return socket.emit('error', { message: 'Masukkan nama terlebih dahulu.' });

    const room = rooms.get(roomId?.toUpperCase?.());
    if (!room) return socket.emit('error', { message: 'Kode ruangan tidak ditemukan.' });
    if (room.guest) return socket.emit('error', { message: 'Ruangan sudah penuh.' });
    if (room.status === 'playing') return socket.emit('error', { message: 'Permainan sudah dimulai.' });

    room.guest = { id: socket.id, name: name.trim() };
    socketToRoom.set(socket.id, roomId.toUpperCase());
    socket.join(room.id);

    io.to(room.id).emit('player-joined', { room: getRoomPublicState(room) });
    console.log(`${name} joined room ${room.id}`);
  });

  socket.on('start-game', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || room.host.id !== socket.id) return;
    if (!room.guest) return socket.emit('error', { message: 'Tunggu pemain lain bergabung dulu.' });

    room.status = 'playing';
    io.to(room.id).emit('game-started', { room: getRoomPublicState(room) });
  });

  socket.on('draw-card', async ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || room.status !== 'playing') return;

    const isHost = room.host.id === socket.id;
    const isGuest = room.guest?.id === socket.id;
    const myRole = isHost ? 'host' : isGuest ? 'guest' : null;
    if (!myRole || myRole !== room.currentTurn) return;

    io.to(room.id).emit('card-drawing');

    try {
      const question = await generateQuestion(room.category, room.previousQuestions);
      room.previousQuestions.push(question);
      if (room.previousQuestions.length > 30) room.previousQuestions = room.previousQuestions.slice(-30);
      room.questionCount++;
      room.currentTurn = room.currentTurn === 'host' ? 'guest' : 'host';

      io.to(room.id).emit('card-drawn', {
        question,
        questionCount: room.questionCount,
        currentTurn: room.currentTurn,
        room: getRoomPublicState(room)
      });
    } catch (err) {
      console.error('Draw error:', err.message);
      io.to(room.id).emit('draw-error', { message: 'Gagal membuat pertanyaan. Coba lagi.' });
    }
  });

  socket.on('change-category', ({ roomId, category }) => {
    const room = rooms.get(roomId);
    if (!room || room.host.id !== socket.id) return;

    room.category = category;
    room.previousQuestions = [];
    io.to(room.id).emit('category-changed', { category, room: getRoomPublicState(room) });
  });

  socket.on('disconnect', () => {
    console.log(`[-] ${socket.id}`);
    const roomId = socketToRoom.get(socket.id);
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        const who = room.host?.id === socket.id ? 'host' : 'guest';
        io.to(roomId).emit('player-left', { who, room: getRoomPublicState(room) });
        if (who === 'host') {
          rooms.delete(roomId);
        } else {
          room.guest = null;
          room.status = 'waiting';
          room.currentTurn = 'host';
        }
      }
      socketToRoom.delete(socket.id);
    }
  });
});

// ===== START =====
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`\n🎴  Obrolan Kita berjalan di → http://localhost:${PORT}`);
  console.log(`🤖  AI utama : ${GEMINI_API_KEY ? `Gemini (${GEMINI_MODEL})` : 'tidak dikonfigurasi'}`);
  console.log(`🔁  Fallback : Ollama ${OLLAMA_BASE_URL} (${OLLAMA_MODEL})\n`);
});
