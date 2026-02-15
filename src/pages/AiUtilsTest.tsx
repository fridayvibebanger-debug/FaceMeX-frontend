import { useState } from "react";
import { api } from "@/lib/api";

export default function AiUtilsTest() {
  const [emotionText, setEmotionText] = useState("I feel worried about the deadline");
  const [emotionResult, setEmotionResult] = useState<string>("");

  const [transText, setTransText] = useState("hola");
  const [targetLang, setTargetLang] = useState("en");
  const [transResult, setTransResult] = useState<string>("");

  async function callEmotion() {
    setEmotionResult("...");
    try {
      const data = await api.post("/api/ai/emotion", { text: emotionText });
      setEmotionResult(JSON.stringify(data, null, 2));
    } catch (e: any) {
      setEmotionResult(`Error: ${e?.message || e}`);
    }
  }

  async function callTranslate() {
    setTransResult("...");
    try {
      const data = await api.post("/api/ai/translate", { text: transText, targetLang });
      setTransResult(JSON.stringify(data, null, 2));
    } catch (e: any) {
      setTransResult(`Error: ${e?.message || e}`);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>AI Utils Test</h1>

      <section style={{ marginTop: 16 }}>
        <h2>Emotion</h2>
        <textarea
          value={emotionText}
          onChange={(e) => setEmotionText(e.target.value)}
          rows={4}
          style={{ width: "100%", maxWidth: 640 }}
        />
        <div style={{ marginTop: 8 }}>
          <button onClick={callEmotion}>Analyze Emotion</button>
        </div>
        <pre style={{ whiteSpace: "pre-wrap", background: "#111", color: "#ddd", padding: 12, marginTop: 8 }}>{emotionResult}</pre>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Translate</h2>
        <input
          type="text"
          value={transText}
          onChange={(e) => setTransText(e.target.value)}
          style={{ width: "100%", maxWidth: 640 }}
        />
        <div style={{ marginTop: 8 }}>
          <label>
            Target Lang:
            <input
              type="text"
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              style={{ marginLeft: 8, width: 120 }}
            />
          </label>
          <button onClick={callTranslate} style={{ marginLeft: 12 }}>Translate</button>
        </div>
        <pre style={{ whiteSpace: "pre-wrap", background: "#111", color: "#ddd", padding: 12, marginTop: 8 }}>{transResult}</pre>
      </section>
    </div>
  );
}
