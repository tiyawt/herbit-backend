import { ok, fail } from "../utils/response.js";
import { todayBucketWIB } from "../utils/date.js";
import AiUsage from "../models/aiUsage.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL =
  process.env.OPENAI_API_URL || "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT || 20);
const MAX_MESSAGES = Number(process.env.AI_HISTORY_LIMIT || 20);
const MAX_MESSAGE_LENGTH = Number(process.env.AI_MESSAGE_MAX_LENGTH || 1200);

const SYSTEM_MESSAGE = {
  role: "system",
  content: [
    "Kamu adalah asisten Herbit. Jawab singkat dalam Bahasa Indonesia.",
    "Kamu bebas membahas topik keberlanjutan secara luas: Eco Enzyme, gaya hidup hijau sehari-hari, perempuan & lingkungan, dan isu ramah lingkungan lainnya.",
    "Jika pengguna bertanya tentang fitur atau bantuan aplikasi Herbit, gunakan fakta ringkas di bawah ini:",
    "- Herbit = aplikasi kebiasaan hijau: Daily Habits, Eco Enzyme tracker, game sorting, poin & rewards, chat AI.",
    "- Mulai dengan daftar akun, lengkapi profil, centang 5 habits harian, dan buat proyek Eco Enzyme.",
    "- Poin didapat dari panen Eco Enzyme, panen buah (10 poin per buah), streak milestones, dan game sorting (10 poin/hari).",
    "- Daily Habits: checklist selesai => daun hijau; daun kuning muncul jika kemarin tidak aktif dan pulih saat checklist baru selesai; setiap 5 daun jadi 1 buah, meng-uncheck bisa menghapus daun/buah.",
    "- Eco Enzyme: catat sampah organik, unggah foto tiap 30/60/90 hari, klaim poin setelah 90 hari jika syarat terpenuhi.",
    "- Rewards/Voucher: tukar poin melalui tab Rewards & Vouchers, poin otomatis berkurang dan kode tersimpan di riwayat.",
    "- Bantuan teknis: reset kata sandi via menu lupa sandi, login lintas perangkat, kontak support tiyaland3@gmail.com atau support-herbit@gmail.com.",
    "Jika topik tidak terkait keberlanjutan, arahkan kembali ke tema hijau atau Herbit.",
  ].join("\n"),
};

export async function chatWithAi(req, res) {
  if (!OPENAI_API_KEY) {
    return fail(
      res,
      "OPENAI_CONFIG_MISSING",
      "Kunci API OpenAI belum dikonfigurasi",
      500
    );
  }

  const userId = req.user?.id;
  if (!userId) {
    return fail(res, "UNAUTHORIZED", "User harus login", 401);
  }

  const dayBucket = todayBucketWIB();

  const usage = await AiUsage.findOne({ userId, dayBucket }).lean();
  if (usage?.count >= DAILY_LIMIT) {
    return fail(
      res,
      "AI_DAILY_LIMIT_REACHED",
      "Batas pertanyaan harian tercapai. Coba lagi besok",
      429
    );
  }

  const messages = Array.isArray(req.body?.messages) ? req.body.messages : null;

  if (!messages || messages.length === 0) {
    return fail(
      res,
      "VALIDATION_ERROR",
      "Field messages wajib berupa array berisi percakapan",
      422
    );
  }

  const trimmedMessages = messages
    .map((message) => {
      if (!message || typeof message !== "object") return null;
      const content = String(message.content ?? "").slice(
        0,
        MAX_MESSAGE_LENGTH
      );
      const role = typeof message.role === "string" ? message.role : "user";
      return { role, content };
    })
    .filter((message) => message && message.content.length > 0);

  if (!trimmedMessages.length) {
    return fail(
      res,
      "VALIDATION_ERROR",
      "Konten percakapan tidak boleh kosong",
      422
    );
  }

  const history = trimmedMessages.slice(-MAX_MESSAGES);
  const payloadMessages = [SYSTEM_MESSAGE, ...history];

  try {
    const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: payloadMessages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorPayload = await response
        .json()
        .catch(() => ({ message: response.statusText }));
      return fail(
        res,
        "OPENAI_ERROR",
        errorPayload?.error?.message ||
          errorPayload?.message ||
          "AI request failed",
        response.status
      );
    }

    const data = await response.json();
    const aiMessage = data?.choices?.[0]?.message;

    await AiUsage.findOneAndUpdate(
      { userId, dayBucket },
      { $inc: { count: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return ok(res, { message: aiMessage, usage: data?.usage ?? null });
  } catch (error) {
    return fail(
      res,
      "AI_CHAT_ERROR",
      error?.message || "Gagal memproses permintaan AI",
      500
    );
  }
}
