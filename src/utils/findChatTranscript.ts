import fs from "fs";
import path from "path";

export function findChatTranscript(outputFolder: string): string | null {
  const files = fs.readdirSync(outputFolder);
  const chatFile = files.find((file) => file.endsWith(".txt"));
  return chatFile ? path.join(outputFolder, chatFile) : null;
}
