import { ok, fail } from "../utils/response.js";
import { todayBucketWIB } from "../utils/date.js";
import AiUsage from "../models/aiUsage.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = process.env.OPENAI_API_URL || "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT || 20);

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

  try {
    const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages,
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
        errorPayload?.error?.message || errorPayload?.message || "AI request failed",
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
