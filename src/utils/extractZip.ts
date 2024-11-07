import AdmZip from "adm-zip";

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
