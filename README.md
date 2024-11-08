# WhatsApp Archive CLI

WhatsApp Archive CLI is a command-line tool designed to extract WhatsApp chat transcripts from a ZIP archive, convert `.opus` audio files to `.mp3`, and generate a structured JSON representation of the chat.

## Features

- **Extract Chat Transcripts**: Convert WhatsApp chat archives into readable formats (JSON, HTML, TXT).
- **Media File Conversion**: Convert `.opus` files to `.mp3` for broader compatibility.
- **Exclude Media**: Optionally exclude media files from output.
- **Customizable Output**: Configure output directories for extracted and converted files.
- **User-friendly Hash Generation**: Generate MD5 hash identifiers for user messages automatically.

## Getting Started

These instructions will guide you on how to set up and use the WhatsApp Archive CLI on your local machine for development and testing purposes.

### Prerequisites

Make sure you have Node.js installed on your system. You can download it from [nodejs.org](https://nodejs.org/).

### Installing

Follow these steps to get your development environment running:

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/whatsapp_archive_cli.git
   cd whatsapp_archive_cli
   ```

2. **Copying zip folder to tests folder**

   When you open the project in the root folder, you need to create a directory called `./files` in which you must paste your test files and ZIP files.

3. **Building the Project**

   Before running the CLI, you need to compile the TypeScript files into JavaScript. Execute the following command to build the project:

   ```bash
   npm run build
   ```

   This step compiles the TypeScript code into executable JavaScript code in the dist directory.

### Usage

To use the WhatsApp Archive CLI, run the `parse` command with appropriate options:

```bash
npm run dev -- parse --input <path_to_zip> --output <output_directory> [options]
```

### Command Options

- `--input <path>` (required): Path to the ZIP archive containing the chat transcript and media files.
- `--output <path>` (required): Path to the output folder where the results will be saved.
- `-m, --me <name>`: Specify your unique name. An MD5 hash will be automatically generated for identification purposes.
- `-g, --group`: Indicate if the chat is a group chat (default: `false`).
- `--convert-to <format>`: Output format (`json`, `txt`, or `html`). Default is `json`.
- `--convert-opus`: Convert OPUS files to MP3 (default: `false`).
- `--exclude-media`: Exclude media files from the saved output (default: `false`).
- `--test-flag`: Test if this flag works correctly (default: `false`).
- `--verbose`: Enable verbose logging for debugging (default: `false`).

### Examples

1. **Basic Extraction**

   ```bash
   npm run dev -- parse --input ./files/test_file.zip --output ./output --me JohnDoe --group
   ```

   This command will extract the chat data from the specified ZIP archive and output it along with any media conversions into the `./output` directory. The `--me` flag accepts a name, and the application will generate an MD5 hash for it.

2. **Conversion to HTML**

   ```bash
   npm run dev -- parse --input ./files/test_file.zip --output ./output --convert-to html
   ```

   This command will extract the chat transcript and output it in HTML format.

3. **Exclude Media Files**

   ```bash
   npm run dev -- parse --input ./files/test_file.zip --output ./output --exclude-media
   ```

   This command will exclude any media files from the output.

### Output Directory

The output directory should be a directory that you create in the root folder of your project, usually called `./output`.

### Building and Running

- **Build**: Compile TypeScript to JavaScript using:

  ```bash
  npm run build
  ```

- **Run**: Execute the compiled JavaScript code:

  ```bash
  npm run start -- parse --input ./files/test_file.zip --output ./output
  ```

- **Development Mode**: Run the tool with TypeScript directly (without compiling first):

  ```bash
  npm run dev -- parse --input ./files/test_file.zip --output ./output
  ```

### Testing

Run unit tests using Jest:

```bash
npm run test
```

### Notes

- If no `--me` option is provided, a default identifier will be used to generate a hash.
- Media file validation uses `exiftool` to ensure all media files are readable and supported.
- The `--convert-opus` option will convert `.opus` files to `.mp3` for easier playback.

### License

This project is licensed under the MIT License - see the LICENSE file for details.
