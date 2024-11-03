import fs from "fs";
import AdmZip from "adm-zip";
import { extractZipArchive } from "../src/commands/parseCommand";

// Mock AdmZip and fs modules
jest.mock("adm-zip");
jest.mock("fs");

describe("extractZipArchive", () => {
  const mockExtractAllTo = jest.fn();

  beforeEach(() => {
    // Reset mocks before each test
    (AdmZip as jest.Mock).mockImplementation(() => ({
      extractAllTo: mockExtractAllTo,
    }));
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit(1) called");
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should extract ZIP contents to specified directory", () => {
    const inputPath = "/path/to/chat.zip";
    const outputPath = "/path/to/output";

    extractZipArchive(inputPath, outputPath);
    expect(mockExtractAllTo).toHaveBeenCalledWith(outputPath, true);
    expect(mockExtractAllTo).toHaveBeenCalledTimes(1);
  });

  it("should throw an error if extraction fails", () => {
    // Simulate extraction failure
    mockExtractAllTo.mockImplementationOnce(() => {
      throw new Error("Extraction failed");
    });

    expect(() => extractZipArchive("/path/to/chat.zip", "/path/to/output")).toThrow(
      "process.exit(1) called"
    );
    expect(console.error).toHaveBeenCalledWith(
      "Error extracting ZIP archive:",
      "Extraction failed"
    );
  });
});
