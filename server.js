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
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===== QUESTION CATEGORIES =====

const BASE_RULES = `
Role: Kamu adalah teman ngobrol yang punya rasa ingin tahu tinggi, tulus, dan gak sok tahu.

ATURAN OUTPUT — WAJIB DIPATUHI:
1. HANYA SATU KALIMAT TANYA.
2. Dilarang keras kasih pengantar, komentar, atau basa-basi. Langsung pertanyaannya.
3. Dilarang berasumsi atau menebak keadaan lawan bicara. Gunakan kalimat yang mengeksplorasi (bertanya untuk tahu).
4. Bahasa santai tongkrongan (gue/lo atau aku/kamu) dengan partikel natural (sih, ya, nggak, deh).
5. Fokus pada pertanyaan yang bikin orang mikir "Oh iya ya, gue belum pernah cerita ini".`;

const CATEGORY_PROMPTS = {
  pasangan: {
    label: 'Pasangan',
    emoji: '💕',
    prompt: `Buat satu pertanyaan eksploratif tentang hal-hal halus dalam hubungan yang sering terlewatkan. Jangan berasumsi mereka sedang ada masalah atau sangat bahagia.

POLA CONTOH:
- Menurut kamu, ada nggak sih hal kecil yang aku lakuin dan ternyata itu berarti banget buat kamu?
- Pernah nggak kepikiran, bagian mana dari kebersamaan kita yang paling bikin kamu ngerasa tenang?
- Dari semua kebiasaan aku, mana sih yang menurut kamu paling 'kamu banget' buat diterima?
- Penasaran deh, momen kapan yang bikin kamu ngerasa kita bener-bener jadi satu tim?`
  },

  pertemanan: {
    label: 'Pertemanan',
    emoji: '👫',
    prompt: `Buat satu pertanyaan santai yang ingin tahu tentang dinamika pertemanan kalian tanpa kesan menghakimi atau interogasi.

POLA CONTOH:
- Ada nggak sih momen random yang tiba-tiba bikin lo ngerasa bersyukur kita temenan?
- Penasaran, menurut lo hal apa yang paling beda dari gue sekarang dibanding pas pertama kita kenal?
- Lo ngerasa paling bisa jadi diri sendiri pas kita lagi ngomongin apa sih?
- Ada nggak kebiasaan gue yang awalnya lo anggap aneh tapi sekarang malah lo maklumin banget?`
  },

  keluarga: {
    label: 'Keluarga',
    emoji: '🏠',
    prompt: `Buat satu pertanyaan tentang memori atau perasaan di rumah yang sifatnya mengundang cerita, bukan menyimpulkan trauma atau kebahagiaan.

POLA CONTOH:
- Apa sih benda di rumah yang kalau kamu liat langsung bikin inget momen tertentu sama keluarga?
- Ada nggak kebiasaan di keluarga kita yang baru kamu sadari unik pas kamu main ke rumah orang lain?
- Penasaran deh, siapa sih anggota keluarga yang paling sering kamu cari kalau lagi pengen cerita hal random?
- Kalau inget masa kecil di rumah, suara atau bau apa yang paling nempel di ingatan kamu sampe sekarang?`
  },

  dalam: {
    label: 'Deep Talk',
    emoji: '🌊',
    prompt: `Buat satu pertanyaan reflektif tentang pertumbuhan diri. Fokus pada "apa yang dirasakan" bukan "apa yang sudah dicapai".

POLA CONTOH:
- Kapan sih momen terakhir kali lo ngerasa bener-bener nyaman sama diri lo sendiri apa adanya?
- Pernah nggak lo ngerasa kalau versi lo yang sekarang itu sebenernya yang lo pengenin dari dulu?
- Hal apa sih yang belakangan ini lagi sering lo pikirin tapi belum sempet lo obrolin ke siapa-siapa?
- Menurut lo, apa satu hal sederhana yang sebenernya bisa bikin lo ngerasa 'cukup' hari ini?`
  },

  nostalgia: {
    label: 'Nostalgia',
    emoji: '📸',
    prompt: `Buat satu pertanyaan yang memicu ingatan sensorik tentang masa lalu tanpa terkesan sedih atau melankolis berlebihan.

POLA CONTOH:
- Ada nggak sih lagu yang kalau nggak sengaja kedenger sekarang, langsung bawa lo balik ke satu momen spesifik?
- Penasaran, apa hal paling berani yang pernah lo lakuin pas masih kecil dan sekarang lo mikir "kok gue bisa ya"?
- Inget nggak siapa orang dari masa lalu yang pengen banget lo tanyain kabarnya tapi nggak tau lewat mana?
- Sudut kota mana sih yang paling banyak nyimpen cerita lo yang orang lain nggak banyak tau?`
  },

  seru: {
    label: 'Seru',
    emoji: '🎉',
    prompt: `Buat satu pertanyaan absurd yang murni karena penasaran akan pendapat konyol lawan bicara.

POLA CONTOH:
- Kalau dunia ini tiba-tiba jadi kartun, lo ngerasa bakal jadi karakter yang kayak gimana sih?
- Penasaran deh, apa hal paling gak masuk akal yang pernah lo percaya pas lo masih kecil dulu?
- Menurut lo, kenapa sih orang-orang suka banget sama hal yang sebenernya nggak penting-penting amat?
- Kalau lo harus ganti nama jadi benda mati, benda apa yang menurut lo paling cocok sama vibe lo?`
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

async function generateWithGemini(systemPrompt, categoryLabel) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [
        { role: 'user', parts: [{ text: `Buat satu pertanyaan kategori ${categoryLabel}. #${Math.floor(Math.random() * 99999)}` }] }
      ],
      generationConfig: {
        temperature: 1.0,
        topP: 0.95,
        maxOutputTokens: 120,
        stopSequences: ['\n']
      }
    }),
    signal: AbortSignal.timeout(15000)
  });

  if (response.status === 429) throw new Error('Gemini rate limit');
  if (!response.ok) throw new Error(`Gemini error: ${response.status}`);

  const data = await response.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!raw) throw new Error('Gemini empty response');
  return cleanOutput(raw);
}

async function generateWithOllama(systemPrompt, categoryLabel) {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Buat satu pertanyaan kategori ${categoryLabel}.` }
      ],
      stream: false,
      options: { temperature: 0.95, top_p: 0.9, repeat_penalty: 1.15, stop: ['\n'] }
    }),
    signal: AbortSignal.timeout(90000)
  });

  if (!response.ok) throw new Error(`Ollama error: ${response.status}`);
  const data = await response.json();
  const raw = data.message?.content || '';
  if (!raw) throw new Error('Ollama empty response');
  return cleanOutput(raw);
}

async function generateWithGroq(systemPrompt, categoryLabel) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Buat satu pertanyaan kategori ${categoryLabel}. #${Math.floor(Math.random() * 99999)}` }
      ],
      temperature: 1.0,
      max_tokens: 120,
      stop: ['\n']
    }),
    signal: AbortSignal.timeout(15000)
  });

  if (response.status === 429) throw new Error('Groq rate limit');
  if (!response.ok) throw new Error(`Groq error: ${response.status}`);

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content || '';
  if (!raw) throw new Error('Groq empty response');
  return cleanOutput(raw);
}

// Global pool per kategori — shared across all rooms/sessions
const globalUsed = {};
Object.keys(CATEGORY_PROMPTS).forEach(k => { globalUsed[k] = []; });

async function generateQuestion(category, previousQuestions = []) {
  const cat = CATEGORY_PROMPTS[category] || CATEGORY_PROMPTS.pasangan;

  // Gabung global pool + room history, dedupe, ambil 12 terakhir
  const allUsed = [...new Set([...(globalUsed[category] || []), ...previousQuestions])].slice(-12);
  const avoidClause = allUsed.length > 0
    ? `\n\nHINDARI pertanyaan yang mirip dengan ini:\n${allUsed.map(q => `- "${q}"`).join('\n')}`
    : '';

  // BASE_RULES dulu (role + output rules), baru category focus
  const systemPrompt = `${BASE_RULES}\n\n=== FOKUS KATEGORI: ${cat.label.toUpperCase()} ===\n${cat.prompt}${avoidClause}`;

  let q;
  if (GEMINI_API_KEY) {
    try {
      q = await generateWithGemini(systemPrompt, cat.label);
      console.log('[AI] Gemini ✓');
    } catch (err) {
      console.warn(`[AI] Gemini gagal (${err.message}), fallback ke Groq...`);
    }
  }

  if (!q && GROQ_API_KEY) {
    try {
      q = await generateWithGroq(systemPrompt, cat.label);
      console.log('[AI] Groq ✓');
    } catch (err) {
      console.warn(`[AI] Groq gagal (${err.message}), fallback ke Ollama...`);
    }
  }

  if (!q) {
    try {
      q = await generateWithOllama(systemPrompt, cat.label);
      console.log('[AI] Ollama ✓');
    } catch (err) {
      console.error(`[AI] Ollama gagal (${err.message})`);
      throw new Error('Semua provider gagal (Gemini, Groq, Ollama).');
    }
  }

  // Simpan ke global pool, max 50 per kategori
  const pool = globalUsed[category] || (globalUsed[category] = []);
  pool.push(q);
  if (pool.length > 50) pool.splice(0, pool.length - 50);

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
  console.log(`🤖  AI utama : ${GEMINI_API_KEY ? `Gemini (${GEMINI_MODEL})` : '—'}`);
  console.log(`🔁  Fallback 1: ${GROQ_API_KEY ? `Groq (${GROQ_MODEL})` : '— (GROQ_API_KEY tidak diset)'}`);
  console.log(`🔁  Fallback 2: Ollama ${OLLAMA_BASE_URL} (${OLLAMA_MODEL})\n`);
});
