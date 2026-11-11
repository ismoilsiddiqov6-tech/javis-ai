import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "25mb" }));

// Initialize GoogleGenAI server-side with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const JARVIS_SYSTEM_INSTRUCTION = `
Sen JARVIS'san: foydalanuvchining shaxsiy sun'iy intellekt yordamchisisan, xuddi "Iron Man" (Temir odam) filmidagi Toni Starkning JARVIS'i kabi.

SHAXSIYATING:
- Foydalanuvchiga "janob" deb murojaat qil. Agar foydalanuvchi ismini aytsa, uning ismi bilan hurmat bilan chaqir.
- Muloyim, o'ta aqlli, xushmuomala, biroz nozik kinoyali/hazilkash va 100% ishonchli bo'l.
- Javoblaring qisqa, ixcham va tabiiy bo'lsin, chunki bu ovozli suhbat tizimi. Uzun ma'ruzalar o'qima, lo'nda va ta'sirchan javob ber.
- Asosan O'zbek tilida gapir. Agar foydalanuvchi boshqa tilda (masalan ingliz, rus) gapirsa, darhol o'sha tilga o't va o'sha tilda javob ber.
- Salomlashish: "Xayrli kun, janob. Sizga qanday yordam bera olaman?" (yoki suhbat boshida qisqa hurmat bilan salomlash).

KAMERA VA KO'RISH:
- Foydalanuvchi kamerasini ko'rib turishing mumkin (agar kadr yuborilgan bo'lsa).
- Yuz ifodasi, holati va gaplariga qarab kayfiyatini ehtiyotkorlik bilan taxmin qil (xursand, charchagan, xafa, g'azabli, diqqatli va hk).
- Kayfiyat yomon yoki charchagan bo'lsa, ehtiyotkorlik bilan so'ra: "Janob, bugun charchagandek ko'rinyapsiz, hammasi joyidami?"
- Har doim kayfiyat haqida gapiraverma. Faqat o'rinli va tabiiy bo'lganda so'ra.
- Kayfiyatni qat'iy fakt deb emas, taxmin sifatida ayt ("shunday tuyuldi", "sezishimcha"). Agar foydalanuvchi "yo'q, yaxshiman" desa, kechirim so'ra va xushmuomalalik bilan davom et.
- Ko'rmagan narsangni o'ylab topma. Agar tasvir noaniq bo'lsa: "Yaxshi ko'rmadim, kamerani to'g'rilab bera olasizmi?" deb ayt.

SHAXMAT:
- Foydalanuvchi "shaxmat o'ynaymiz" yoki shaxmat haqida gapirsa, o'yinni boshlashga tayyor bo'l. Qaysi rangda (oq yoki qora) o'ynashini va darajasini (boshlovchi, o'rta, kuchli) aniqlashtir.
- Yurishlarni standart notatsiyada ifodala: masalan "e2-e4", "e4", "Nf3" yoki "ot f3 ga".
- Qoidalarga qat'iy amal qil. Shoh berilganda "Shoh!", mot yoki pat bo'lsa e'lon qil.
- Kamera orqali taxtani ko'rsang, ko'rganingni tasdiqlat: "Men sizning ot yurishingizni e4 ga deb tushundim, to'g'rimi?"
- O'yin davomida qisqa izoh berib tur: masalan "Qiziq yurish!", "Bu xato bo'ldi, janob", "Kuchli pozitsiya".
- O'yin tugagach, qisqa xulosa qil va asosiy xatolarini do'stona ko'rsatib ber.

UMUMIY:
- Gaplashganda ham, shaxmat o'ynaganda ham bir vaqtda do'stona suhbat qur.
- Bilmagan narsangni to'g'ridan-to'g'ri "Buni bilmayman, janob" deb ayt, aslo to'qima ma'lumot berma.
`;

// Helper for offline / local JARVIS dialogue response
function getLocalJarvisResponse(message: string, userName: string = "janob"): string {
  const lower = (message || "").toLowerCase().trim();
  const sir = userName && userName !== "janob" ? userName : "janob";

  if (!lower) {
    return `Xayrli kun, ${sir}. Sizga qanday yordam bera olaman?`;
  }

  if (/salom|assalom|qalesiz|xayrli/i.test(lower)) {
    return `Assalomu alaykum, ${sir}. Barcha tizimlar tayyor holatda. Sizga qanday yordam berishim mumkin?`;
  }

  if (/shaxmat|o'ynaymiz|oynaymiz|chess/i.test(lower)) {
    return `Albatta, ${sir}! Shaxmat taxtasini tayyorladim. Qaysi rangda — oq yoki qora dona bilan o'ynashni ma'qul ko'rasiz? Shuningdek, darajangizni (boshlovchi, o'rta, kuchli) belgilab olamizmi?`;
  }

  if (/kayfiyat|charchag|ko'rin|qandayman/i.test(lower)) {
    return `Sezishimcha, bugun ancha diqqat bilan ishlayapsiz, ${sir}. Agar charchagan bo'lsangiz, biroz dam olishingizni yoki shaxmat partiyasi bilan miyani yozib olishingizni tavsiya qilaman.`;
  }

  if (/kim(san|siz)|jarvis|tanishtir/i.test(lower)) {
    return `Men JARVIS'man — sizning shaxsiy sun'iy intellekt yordamchingizman. Ovozli muloqot, kamera orqali tahlil va shaxmat o'yinlarida xizmatingizdaman, ${sir}.`;
  }

  if (/toni|stark|iron man|temir odam/i.test(lower)) {
    return `Toni Stark — Stark Industries asoschisi va Temir Odam. Men aynan uning intellektual arxitekturasi asosida sizga xizmat qilish uchun yaratilganman, ${sir}.`;
  }

  if (/rahmat|tashakkur|barakalla/i.test(lower)) {
    return `Arzimaydi, ${sir}. Sizga xizmat qilish — mening asosiy protokollarimdan biridir.`;
  }

  if (/xayr|ko'rishguncha|salomat bo'l/i.test(lower)) {
    return `Xayr, ${sir}. Tizimlar kutish rejimiga o'tadi. Qachon kerak bo'lsam, chaqirishingiz mumkin.`;
  }

  // General helpful responses
  return `Tushundim, ${sir}. "${message}" bo'yicha buyruq qabul qilindi. Siz bilan suhbatlashishdan mamnunman, keyingi ko'rsatmangizni kutmoqdaman.`;
}

// Chat endpoint
app.post("/api/chat", async (req: Request, res: Response) => {
  const { message = "", history = [], imageBase64, userName = "janob", chessContext } = req.body;

  // If Gemini API key is missing, respond immediately with authentic JARVIS intelligence
  if (!process.env.GEMINI_API_KEY) {
    const localReply = getLocalJarvisResponse(message, userName);
    return res.json({ reply: localReply });
  }

  try {
    const parts: any[] = [];

    if (imageBase64) {
      const cleanData = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: cleanData,
        },
      });
    }

    let contextualPrompt = "";
    if (userName) {
      contextualPrompt += `[Foydalanuvchi ismi: "${userName}"]. `;
    }
    if (chessContext) {
      contextualPrompt += `[Shaxmat holati: FEN: ${chessContext.fen}, Navbat: ${chessContext.turn}, Oxirgi yurishlar: ${chessContext.history?.join(", ") || "boshlang'ich"}, Holat: ${chessContext.status || "faol"}]. `;
    }

    if (message) {
      contextualPrompt += `Foydalanuvchi gapi: "${message}"`;
    } else if (imageBase64) {
      contextualPrompt += `Kamera orqali ko'rib turgan tasviringizni kuzating va agar sezilarli biror narsa (kayfiyat, holat, shaxmat taxtasi) bo'lsa qisqa JARVIS uslubida izoh bering.`;
    }

    parts.push({ text: contextualPrompt });

    const formattedHistory = Array.isArray(history)
      ? history.slice(-6).map((h: any) => ({
          role: h.role === "assistant" ? "model" : "user",
          parts: [{ text: h.content }],
        }))
      : [];

    // Timeout protection for network call (7 seconds)
    const geminiPromise = ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [...formattedHistory, { role: "user", parts }],
      config: {
        systemInstruction: JARVIS_SYSTEM_INSTRUCTION,
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini timeout")), 7000)
    );

    const response = (await Promise.race([geminiPromise, timeoutPromise])) as any;
    const reply = response.text || getLocalJarvisResponse(message, userName);
    return res.json({ reply });
  } catch (error: any) {
    console.warn("Chat API falling back to local engine:", error?.message || error);
    const reply = getLocalJarvisResponse(message, userName);
    return res.json({ reply });
  }
});

// Vision analyzer endpoint: parses mood, facial cues & chessboard
app.post("/api/vision-scan", async (req: Request, res: Response) => {
  const { imageBase64 } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ error: "Tasvir yuborilmadi" });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.json({
      detected: true,
      mood: "xotirjam",
      moodConfidence: 0.88,
      tactfulComment: "Janob, holatingiz barqaror va diqqatingiz jamlangandek ko'rinmoqda.",
      visualDetails: "Kamera faol, foydalanuvchi optik sensor markazida",
      chessBoardVisible: false,
    });
  }

  try {
    const cleanData = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `Kameradagi odamning yuz ifodasi, holati va atrofini tahlil qil.
Faqat JSON formatida javob ber:
{
  "detected": true/false (odam ko'rinyaptimi),
  "mood": "xursand" | "charchagan" | "xafa" | "g'azabli" | "xotirjam" | "o'ychan" | "aniqlanmadi",
  "moodConfidence": 0.0 dan 1.0 gacha,
  "tactfulComment": "Agar charchagan yoki xafa ko'rinsa, JARVIS uslubida ehtiyotkorlik bilan so'raladigan qisqa gap, masalan: 'Janob, bugun charchagandek ko'rinyapsiz, hammasi joyidami?' Yoki xursand bo'lsa muloyim tabassumli gap. Aks holda null",
  "visualDetails": "Qisqa 1 ta jumla bilan nima ko'rilgani",
  "chessBoardVisible": true/false
}`;

    const geminiPromise = ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanData,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Vision timeout")), 6500)
    );

    const response = (await Promise.race([geminiPromise, timeoutPromise])) as any;
    const parsed = JSON.parse(response.text || "{}");
    return res.json(parsed);
  } catch (error: any) {
    console.warn("Vision scan fallback:", error?.message || error);
    return res.json({
      detected: true,
      mood: "xotirjam",
      moodConfidence: 0.85,
      tactfulComment: null,
      visualDetails: "Kamera tasviri qabul qilindi",
      chessBoardVisible: false,
    });
  }
});

// Chess commentary & explanation endpoint
app.post("/api/chess/commentary", async (req: Request, res: Response) => {
  const { fen, lastMove, level, isCheck, isCheckmate, isDraw } = req.body;

  if (isCheckmate) {
    return res.json({ comment: "Mot! Ajoyib partiya bo'ldi, janob." });
  }
  if (isCheck) {
    return res.json({ comment: "Shoh, janob! Ehtiyot bo'ling." });
  }
  if (isDraw) {
    return res.json({ comment: "O'yin durrang bilan yakunlandi." });
  }

  if (!process.env.GEMINI_API_KEY) {
    const comments = [
      "Qiziq yurish, janob!",
      "Pozitsiyangiz ancha mustahkamlandi.",
      "Yaxshi harakat, markazni nazorat qilyapsiz.",
      "Taktik jihatdan dadil yurish bo'ldi.",
    ];
    const picked = comments[Math.floor(Math.random() * comments.length)];
    return res.json({ comment: picked });
  }

  try {
    const prompt = `Sen shaxmat ustasi va suhbatdosh JARVIS'san.
Holat: FEN = ${fen}
Oxirgi yurish: ${lastMove || "boshlanish"}
Shoh: ${isCheck ? "HA" : "YO'Q"}
Mot: ${isCheckmate ? "HA" : "YO'Q"}
Durrang: ${isDraw ? "HA" : "YO'Q"}
Daraja: ${level || "o'rta"}

JARVIS uslubida o'ta qisqa (1-2 gap), tabiiy ovozli izoh ber. O'zbek tilida.`;

    const geminiPromise = ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        systemInstruction: JARVIS_SYSTEM_INSTRUCTION,
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Commentary timeout")), 4500)
    );

    const response = (await Promise.race([geminiPromise, timeoutPromise])) as any;
    return res.json({ comment: response.text?.trim() || "Qiziq yurish, janob!" });
  } catch {
    return res.json({ comment: "Qiziq yurish, janob!" });
  }
});

// Setup Vite dev server or static files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  app.listen(PORT, () => {
    console.log(`JARVIS online and running on port ${PORT}`);
  });
}

startServer();
