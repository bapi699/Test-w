# OTT Kab Aayegi? 🎬

India mein latest movies ki **OTT release date** aur **platform** (Netflix, Prime Video, JioHotstar, ZEE5, SonyLIV...) dikhane wali mobile-friendly web app. Poora UI Hinglish mein hai.

- **Frontend:** React + Vite + Tailwind CSS (`client/`)
- **Backend:** Node.js + Express (`server/`). Saari API calls backend se hoti hain, isliye API keys browser tak kabhi nahi pahunchti.
- **Data:** TMDB (movie list, poster, cast, language, theatre date) + Gemini with Google Search grounding (OTT date aur platform)
- **Cache:** SQLite (`server/data/ott-cache.sqlite`)

---

## 1. Zaroori cheezein

- **Node.js 20 ya usse naya** (`node -v` se check karo)
- Do API keys: TMDB aur Gemini (neeche dekho kahan se milengi)

## 2. API keys kahan se milengi

### TMDB_API_KEY (free)
1. https://www.themoviedb.org/signup par account banao aur email verify karo.
2. Login karke **Settings → API** par jao: https://www.themoviedb.org/settings/api
3. "Create" / "Request an API key" dabao, type **Developer** chuno, form bharo.
4. Wahan do cheezein milengi: **API Key** (chhoti) aur **API Read Access Token** (lambi, `eyJ...` se shuru). **Dono mein se koi bhi** chalegi.

### GEMINI_API_KEY (free tier available)
1. https://aistudio.google.com/apikey kholo aur Google account se login karo.
2. **Create API key** dabao aur key copy karo.
3. Google Search grounding ke liye alag se kuch on nahi karna padta, par free tier mein daily limit hoti hai. Zyada use ke liye billing on karni pad sakti hai (Google AI Studio mein dekho).

## 3. Setup

```bash
cd ott-app
cp .env.example .env        # phir .env kholo aur dono keys daalo
npm run setup               # root + server + client ke packages install
```

`.env` aisi dikhegi:

```env
TMDB_API_KEY=yahan_tmdb_ki_key
GEMINI_API_KEY=yahan_gemini_ki_key
# GEMINI_MODEL=gemini-3.8-flash   (optional)
```

> `.env` `.gitignore` mein hai, isliye galti se bhi GitHub par nahi jayegi. Key kabhi code mein mat likhna.

## 4. App chalao

**Development (auto reload):**
```bash
npm run dev
```
Browser mein kholo: **http://localhost:5173**. Phone par dekhna ho to same WiFi par `http://<laptop-ka-IP>:5173` kholo (`npm run dev --prefix client -- --host`).

**Production:**
```bash
npm run build     # React build banega client/dist mein
npm start         # http://localhost:5174 par poori app
```

## 5. 5 movies par OTT data check karo

```bash
npm run check        # 5 movies
npm run check -- 10  # 10 movies
```

Yeh TMDB se India ki top movies leta hai, har ek ke liye Gemini se fresh web search karta hai, aur **status, platform, date, source link aur Google search queries** print karta hai. Har source link khol kar khud mila lo ki date/platform sahi hai.

---

## App kaise kaam karti hai

| Cheez | Kaise |
|---|---|
| **Abhi Release Hui** tab | Jin movies ki OTT date aaj ya usse pehle ki hai (yaani stream ho rahi hain) |
| **Jald Aa Rahi Hai** tab | Jinki OTT date aage ki hai, ya abhi announce nahi hui |
| Sorting | Sabse nayi date wali movie sabse upar |
| Search | "Movie ka naam likho..." se TMDB par search (India region) |
| Filters | Platform aur language |
| Detail page | 2-3 line Hinglish story, cast, "Kahan Dekhein" button, source link |

**Movie list:** TMDB `discover` (region `IN`), pichhle ~5 mahine se agle ~2 mahine tak ki theatrical releases.

**OTT data (Gemini):**
- `@google/genai` SDK, model `gemini-3.8-flash` (`.env` mein `GEMINI_MODEL` se badal sakte ho), tool `googleSearch` (Grounding with Google Search).
- Gemini se JSON milta hai: `platform`, `ott_date`, `status` (`confirmed` / `expected` / `unknown`), `source_url`.
- **Koi date ya platform khud se nahi banaya jata:**
  - Agar Gemini ne Google Search kiya hi nahi, to jawab `unknown` maana jata hai.
  - Source URL ke bina koi platform/date nahi dikhti.
  - `confirmed` tabhi jab platform aur exact date dono hon, warna `expected`.
  - Date `YYYY-MM-DD` format mein na ho to hata di jati hai.
  - Kuch na mile to card par: **"OTT date abhi announce nahi hui"**.

**Cache (SQLite):**
- `confirmed` wali movie dobara search nahi hoti.
- `expected` / `unknown` wali movie 24 ghante baad dobara check hoti hai.
- Gemini fail ho jaye to app crash nahi hoti: TMDB ka data dikhta rehta hai aur us movie ko 10 minute baad dobara try kiya jata hai.

**Background loading:** List turant TMDB data ke saath khulti hai. OTT info background mein (2 movies ek saath) aati hai aur page apne aap update hota hai. Pehli baar 40 movies ki info aane mein kuch minute lag sakte hain, uske baad cache se turant aati hai.

## Problems?

| Dikkat | Kya karein |
|---|---|
| "Kuch gadbad ho gayi, dobara try karo" | TMDB key galat hai ya internet nahi hai. Server terminal ka error dekho. |
| Sab movies par "OTT date abhi announce nahi hui" | Gemini key check karo; terminal mein `[gemini] FAIL` lines dekho. Quota khatam ho to kal try karo. |
| Gemini model ka error (404 / not found) | Google ne model badla ho sakta hai. https://ai.google.dev/gemini-api/docs/models se naya naam lekar `.env` mein `GEMINI_MODEL` set karo. |
| Cache saaf karna hai | Server band karo aur `server/data/` folder delete kar do. |

> Disclaimer: OTT info web search se aati hai, galti ho sakti hai. Hamesha source link check karo.
