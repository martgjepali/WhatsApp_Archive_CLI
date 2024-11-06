import { Command } from "commander";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { parseChatFile } from "../utils/chatParser";
import { ChatLog, ChatMessage } from "../utils/chatParser";

export function registerParseCommand(program: Command): void {
  program
    .command("parse")
    .description("Extract chat transcript and media files from a ZIP archive")
    .requiredOption(
      "--input <path>",
      "Path to the ZIP archive containing chat transcript and media files"
    )
    .requiredOption(
      "--output <path>",
      "Path to the output folder where the results will be saved"
    )
    .option("-m, --me <hash>", "Specify your unique hash identifier")
    .option("-g, --group", "Indicate if the chat is a group chat", false)
    .option("--convert-opus", "Convert OPUS files to MP3", false)
    .option(
      "--convert-to <format>",
      "Output format: json, txt, or html",
      "json"
    ) // Add convert-to option
    .addHelpText(
      "after",
      `
Examples:
  $ cli-tool parse --input ./chat.zip --output ./output --me <hash> --group --convert-opus --convert-to html
  $ cli-tool parse --input /path/to/chat.zip --output /path/to/output --convert-to txt
    `
    )
    .action(async (options) => {
      try {
        const inputPath = path.resolve(options.input);
        const outputPath = path.resolve(options.output);

        if (!fs.existsSync(inputPath)) {
          console.error(
            `Error: The input file at "${inputPath}" does not exist.`
          );
          process.exit(1);
        }

        if (!fs.existsSync(outputPath)) {
          fs.mkdirSync(outputPath, { recursive: true });
        }

        extractZipArchive(inputPath, outputPath);

        const chatFile = findChatTranscript(outputPath);
        if (!chatFile) {
          console.error("Error: No chat transcript found in the ZIP archive.");
          process.exit(1);
        }

        console.log(`Found chat transcript: ${chatFile}`);

        if (options.me && !validateMd5(options.me)) {
          console.error("Error: The provided meHash is not a valid MD5 hash.");
          process.exit(1);
        }

        // Parse the chat file with the selected options
        const chatLog = await parseChatFile(
          chatFile,
          options.me,
          options.group,
          outputPath,
          options.convertOpus
        );

        // Save the parsed output in the specified format
        saveChatLog(chatLog, outputPath, options.convertTo);
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error("Error processing the chat file:", error.message);
        } else {
          console.error(
            "An unknown error occurred while processing the chat file."
          );
        }
        process.exit(1);
      }
    });
}

// Function to save chat log in specified format
function saveChatLog(
  chatLog: ChatLog,
  outputPath: string,
  format: string
): void {
  const outputFilePath = path.join(outputPath, `chat.${format}`);

  if (format === "json") {
    fs.writeFileSync(outputFilePath, JSON.stringify(chatLog, null, 2), "utf8");
    console.log(`Chat transcript saved to ${outputFilePath} in JSON format.`);
  } else if (format === "txt") {
    const textContent = chatLog.chatLog
      .map((msg) => formatMessageForTxt(msg))
      .join("\n");
    fs.writeFileSync(outputFilePath, textContent, "utf8");
    console.log(`Chat transcript saved to ${outputFilePath} in TXT format.`);
  } else if (format === "html") {
    const htmlContent = generateHtmlContent(chatLog);
    fs.writeFileSync(outputFilePath, htmlContent, "utf8");
    console.log(`Chat transcript saved to ${outputFilePath} in HTML format.`);
  } else {
    console.error(
      `Unsupported output format: ${format}. Supported formats are json, txt, and html.`
    );
  }
}

// Helper function to format message for TXT output
function formatMessageForTxt(msg: ChatMessage): string {
  const dateStr = new Date(msg.tstamp * 1000).toLocaleString("en-US");

  // Show only the file path for media attachments
  let formattedMessage = msg.attachment
    ? `${dateStr} - ${msg.person || ""}: ${msg.attachment}`
    : `${dateStr} - ${msg.person || ""}: ${msg.message}`;

  return formattedMessage;
}

// Helper function to generate HTML content
function generateHtmlContent(chatLog: ChatLog): string {
  const messages = chatLog.chatLog
    .map((msg) => {
      const dateStr = new Date(msg.tstamp * 1000).toLocaleString("en-US");

      if (msg.attachment) {
        // Show only the file path as the message content for attachments
        return `<p><i>${dateStr}</i> - <b>${msg.person || ""}</b>: ${
          msg.attachment
        }</p>`;
      }

      return `<p><i>${dateStr}</i> - <b>${msg.person || ""}</b>: ${
        msg.message
      }</p>`;
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

// Function to extract ZIP archive
export function extractZipArchive(inputPath: string, outputPath: string): void {
  try {
    const zip = new AdmZip(inputPath);
    zip.extractAllTo(outputPath, true);
    console.log(`Successfully extracted ZIP contents to: ${outputPath}`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error extracting ZIP archive:", error.message);
    } else {
      console.error("An unknown error occurred during ZIP extraction.");
    }
    process.exit(1);
  }
}

// Function to find chat transcript in the output folder
export function findChatTranscript(outputFolder: string): string | null {
  const files = fs.readdirSync(outputFolder);
  const chatFile = files.find((file) => file.endsWith(".txt"));
  return chatFile ? path.join(outputFolder, chatFile) : null;
}

// Function to validate MD5 hash
export function validateMd5(hash: string): boolean {
  return /^[a-f0-9]{32}$/i.test(hash);
}
