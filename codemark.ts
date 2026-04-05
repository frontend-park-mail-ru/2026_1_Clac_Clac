import { Glob } from "bun";

const outputFile = "ai_context.md";

const ignoreDirs = [
  "node_modules",
  ".git",
  ".next",
  ".nuxt",
  "dist",
  "build",
  "out",
  ".vscode",
  ".idea",
  "coverage",
  "migrations",
  "generated"
];

const ignoreFiles = [
  outputFile,
  "bun.lock",
  "bun.lockb",
  "package-lock.json",
  "yarn.lock",
  ".DS_Store",
  ".env",
  "README.md",
  "codemark.ts",
  "st.ts"
];

const binaryExtensions = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg",
  ".woff", ".woff2", ".ttf", ".eot",
  ".zip", ".tar", ".gz", ".7z", ".rar",
  ".pdf", ".exe", ".dll", ".so", ".dylib", ".bin",
  ".mp3", ".mp4", ".mov", ".avi"
]);

const extensionsMap: Record<string, string> = {
  "ts": "typescript",
  "tsx": "tsx",
  "js": "javascript",
  "jsx": "jsx",
  "json": "json",
  "css": "css",
  "scss": "scss",
  "html": "html",
  "md": "markdown",
  "py": "python",
  "rs": "rust",
  "go": "go",
  "java": "java",
  "c": "c",
  "cpp": "cpp",
  "h": "c",
  "sh": "bash",
  "yaml": "yaml",
  "yml": "yaml",
  "sql": "sql",
  "dockerfile": "dockerfile"
};

/**
 * Определение языка подсветки синтаксиса.
 * @param {string} filename - Имя файла.
 * @returns {string} Язык подсветки синтаксиса.
 */
function getSyntaxLanguage(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase() || "";
  return extensionsMap[extension] || "";
};

/**
 * Проверка, является ли файл бинарником
 * @param {string} filename - Имя файла
 * @returns {boolean} Является ли файл бинарником
 */
function isLikelyBinary(filename: string): boolean {
  const extension = "." + filename.split('.').pop()?.toLowerCase();
  return binaryExtensions.has(extension);
};

async function main() {
  console.log("Сканирование файлов...");
  const glob = new Glob("**/*");
  let output = "";
  let count = 0;

  for await (const file of glob.scan(".")) {
    if (
      ignoreDirs.some(dir => file.includes(dir + "/") || file === dir) ||
      ignoreFiles.includes(file) ||
      isLikelyBinary(file)
    ) {
      continue;
    };
    try {
      const fileRef = Bun.file(file);
      if (fileRef.size > 2**20) { // файл > 1MB
        console.warn(`Пропущен большой файл: ${file}`);
        continue;
      };
      const arrayBuffer = await fileRef.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      const isBinary = buffer.subarray(0, Math.min(buffer.length, 1024)).includes(0);
      if (isBinary) {
        continue;
      };
      const content = await fileRef.text();
      const language = getSyntaxLanguage(file);
      output += `${file}:\n`;
      output += "```" + language + "\n";
      output += content;
      if (!content.endsWith('\n')) {
        output += "\n"
      };
      output += "```\n\n";
      count++;
    } catch (error) {
      console.error(`Ошибка чтения ${file}: ${error}`);
    };
  };
  
  await Bun.write(outputFile, output);
  console.log(`Готово. Обработано файлов: ${count}`);
  console.log(`Результат сохранён в ${outputFile}`);
};

main();
