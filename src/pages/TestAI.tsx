import { useState } from "react";
import { chatWithAI } from "../utils/ai";

export default function TestAI() {
  const [result, setResult] = useState("");

  async function handleTest() {
    const response = await chatWithAI("Hello");
    setResult(JSON.stringify(response, null, 2));
  }

  return (
    <div>
      <h1>DeepSeek Test</h1>
      <button onClick={handleTest}>Test DeepSeek</button>
      <pre>{result}</pre>
    </div>
  );
}
