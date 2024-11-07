import fs from "fs";
import { ChatLog, ChatMessage } from "./chatParser";
import path from "path";

export function saveChatLog(
  chatLog: ChatLog,
  outputPath: string,
  format: string,
  excludeMedia: boolean // Include the excludeMedia flag as a parameter
): void {
  const outputFilePath = path.join(outputPath, `chat.${format}`);

  if (format === "json") {
    fs.writeFileSync(outputFilePath, JSON.stringify(chatLog, null, 2), "utf8");
    console.log(`Chat transcript saved to ${outputFilePath} in JSON format.`);
  } else if (format === "txt") {
    const textContent = chatLog.chatLog
      .filter((msg) => !excludeMedia || !msg.attachment) // Filter out media messages if excludeMedia is true
      .map((msg) => formatMessageForTxt(msg, excludeMedia)) // Pass the excludeMedia flag
      .join("\n");
    fs.writeFileSync(outputFilePath, textContent, "utf8");
    console.log(`Chat transcript saved to ${outputFilePath} in TXT format.`);
  } else if (format === "html") {
    const htmlContent = generateHtmlContent(chatLog, excludeMedia); // Pass the excludeMedia flag
    fs.writeFileSync(outputFilePath, htmlContent, "utf8");
    console.log(`Chat transcript saved to ${outputFilePath} in HTML format.`);
  } else {
    console.error(
      `Unsupported output format: ${format}. Supported formats are json, txt, and html.`
    );
  }
}

// Helper function to format message for TXT output
export function formatMessageForTxt(
  msg: ChatMessage,
  excludeMedia: boolean
): string {
  const dateStr = new Date(msg.tstamp * 1000).toLocaleString("en-US");
  if (excludeMedia && msg.attachment) {
    return `${dateStr} - ${msg.person || ""}: [Media file not saved]`;
  }
  return msg.attachment
    ? `${dateStr} - ${msg.person || ""}: [Attachment] ${msg.attachment}`
    : `${dateStr} - ${msg.person || ""}: ${msg.message}`;
}

// Helper function to generate HTML content
export function generateHtmlContent(
  chatLog: ChatLog,
  excludeMedia: boolean
): string {
  const messages = chatLog.chatLog
    .filter((msg) => !excludeMedia || !msg.attachment) // Filter out media messages if excludeMedia is true
    .map((msg) => {
      const dateStr = new Date(msg.tstamp * 1000).toLocaleDateString("en-US", {
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      if (msg.attachment) {
        const webFriendlyAttachmentPath = msg.attachment.replace(/\\/g, "/");

        // Handle audio or image attachments
        const isAudio = webFriendlyAttachmentPath
          .toLowerCase()
          .endsWith(".mp3");
        const isImage =
          webFriendlyAttachmentPath.toLowerCase().endsWith(".jpg") ||
          webFriendlyAttachmentPath.toLowerCase().endsWith(".jpeg") ||
          webFriendlyAttachmentPath.toLowerCase().endsWith(".png");

        if (excludeMedia) {
          return `<p><i>${dateStr}</i> - <b>${
            msg.person || ""
          }</b>: [Media file not saved]</p>`;
        } else if (isAudio) {
          return `
            <figure>
              <figcaption><i>${dateStr}</i> - <b>${
            msg.person || ""
          }</b></figcaption>
              <audio controls><source src="${webFriendlyAttachmentPath}" type="audio/mpeg"></audio>
            </figure>`;
        } else if (isImage) {
          return `
            <figure>
              <figcaption><i>${dateStr}</i> - <b>${
            msg.person || ""
          }</b></figcaption>
              <img src="${webFriendlyAttachmentPath}" alt="${webFriendlyAttachmentPath}">
            </figure>`;
        } else {
          // Generic attachment message if the media type is unknown
          return `<p><i>${dateStr}</i> - <b>${
            msg.person || ""
          }</b>: [Attachment] ${webFriendlyAttachmentPath}</p>`;
        }
      } else {
        // Regular message
        return `<p><i>${dateStr}</i> - <b>${msg.person || ""}</b>: ${
          msg.message
        }</p>`;
      }
    })
    .join("\n");

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <title>WhatsApp Chat Transcript</title>
  </head>
  <body>
    <div>
      ${messages}
    </div>
  </body>
  </html>
    `;
}
