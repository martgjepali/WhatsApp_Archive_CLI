import { Command } from "commander";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { parseChatFile } from "../utils/chatParser";
import { ChatLog, ChatMessage } from "../utils/chatParser";
import crypto from "crypto";

export function createMd5Hash(value: string): string {
  return crypto.createHash("md5").update(value).digest("hex");
}

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
    .option("-n, --name <name>", "Specify your name to generate the hash")
    .option("-g, --group", "Indicate if the chat is a group chat", false)
    .option(
      "--convert-to <format>",
      "Output format: json, txt, or html",
      "json"
    )
    .option("--convert-opus", "Convert OPUS files to MP3", false)
    .option(
      "--exclude-media",
      "Exclude media files from the saved output",
      false
    ) // Renamed Option
    .option("--test-flag", "Test if this flag works correctly", false)
    .addHelpText(
      "after",
      `
Examples:
  $ cli-tool parse --input ./chat.zip --output ./output --me <hash> --group --convert-opus --convert-to html --exclude-media
  $ cli-tool parse --input /path/to/chat.zip --output /path/to/output --convert-to txt
  $ cli-tool parse --input ./chat.zip --output ./output --test-flag // NEW EXAMPLE FOR TEST FLAG
    `
    )
    .action(async (options) => {
      try {
        if (options.name) {
          console.log(`Generating hash for name: ${options.name}`);
          options.me = createMd5Hash(options.name);
        } else if (!options.me) {
          // If no hash or name is provided, use a default
          console.warn("No name or hash provided, using a default identifier.");
          options.me = createMd5Hash("default_user");
        }

        console.log("Received options:", options);

        const inputPath = path.resolve(options.input);
        const outputPath = path.resolve(options.output);

        // Debugging: Log paths to verify they are correct
        console.log("Resolved input path:", inputPath);
        console.log("Resolved output path:", outputPath);

        // Debugging: Log the new flag to see if it is interpreted correctly
        console.log("Resolved testFlag:", options.testFlag);
        console.log("Resolved excludeMedia:", options.excludeMedia); // NEW DEBUGGING LINE

        if (!fs.existsSync(inputPath)) {
          console.error(
            `Error: The input file at "${inputPath}" does not exist.`
          );
          process.exit(1);
        }

        if (!fs.existsSync(outputPath)) {
          console.log(`Output path does not exist. Creating: ${outputPath}`);
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

        // Debugging: Log values before calling parseChatFile
        console.log("Calling parseChatFile with the following parameters:");
        console.log("chatFile:", chatFile);
        console.log("meHash:", options.me);
        console.log("isGroupChat:", options.group);
        console.log("outputPath:", outputPath);
        console.log("convertOpus:", options.convertOpus);
        console.log("excludeMedia:", options.excludeMedia); // Updated Debugging Line

        // Parse the chat file with the selected options
        const chatLog = await parseChatFile(
          chatFile,
          options.me,
          options.group,
          outputPath,
          options.convertOpus,
          options.excludeMedia
        );

        // Debugging: Log the parsed chatLog before saving
        console.log("Parsed chatLog:", JSON.stringify(chatLog, null, 2));

        // Save the parsed output in the specified format
        saveChatLog(
          chatLog,
          outputPath,
          options.convertTo,
          options.excludeMedia
        );
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
function formatMessageForTxt(msg: ChatMessage, excludeMedia: boolean): string {
  const dateStr = new Date(msg.tstamp * 1000).toLocaleString("en-US");
  if (excludeMedia && msg.attachment) {
    return `${dateStr} - ${msg.person || ""}: [Media file not saved]`;
  }
  return msg.attachment
    ? `${dateStr} - ${msg.person || ""}: [Attachment] ${msg.attachment}`
    : `${dateStr} - ${msg.person || ""}: ${msg.message}`;
}

// Helper function to generate HTML content
function generateHtmlContent(chatLog: ChatLog, excludeMedia: boolean): string {
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

export function findChatTranscript(outputFolder: string): string | null {
  const files = fs.readdirSync(outputFolder);
  const chatFile = files.find((file) => file.endsWith(".txt"));
  return chatFile ? path.join(outputFolder, chatFile) : null;
}

// Function to validate MD5 hash
export function validateMd5(hash: string): boolean {
  return /^[a-f0-9]{32}$/i.test(hash);
}
