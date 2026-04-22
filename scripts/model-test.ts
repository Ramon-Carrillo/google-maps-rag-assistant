import "./load-env";
import { generateText } from "ai";
import { anthropic, CHAT_MODEL } from "../src/lib/anthropic";

async function main() {
  const { text } = await generateText({
    model: anthropic(CHAT_MODEL),
    prompt: "Say 'hello' in one word.",
    maxOutputTokens: 20,
  });
  console.log("OK:", text);
}
main().catch((e) => {
  console.error("ERR:", e);
  process.exit(1);
});
