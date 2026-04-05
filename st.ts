import { readdir } from "node:fs/promises"; // Это встроенный модуль Bun
import { join } from "node:path";           // Это тоже встроено в Bun

const outputFile = "structure.txt";

const IGNORE = new Set([
  "node_modules", ".git", ".next", ".nuxt", "dist", "build", "out", 
  "coverage", ".vscode", ".idea", ".DS_Store", "bun.lockb", 
  "package-lock.json", "yarn.lock", outputFile
]);

/**
 * Формирует структуру папок по типу
 * .
  ├── bun.lockb
  ├── hello.ts
  ├── src
  │   ├── components
  │   │   ├── Button.tsx
  │   │   └── Header.tsx
  │   └── utils.ts
  ├── to-markdown.ts
  └── tree.ts
 * @param {string} path - Текущая директория
 * @param {string} prefix - Уровень вложенности (отрисовка, не трогать)
 * @returns {string} Структура папок
 */
async function buildTree(path: string, prefix: string = ""): Promise<string> {
  let output = "";
  try {
    const entries = await readdir(path, { withFileTypes: true });

    const sorted = entries
      .filter(e => !IGNORE.has(e.name))
      .sort((a, b) => {
        if (a.isDirectory() === b.isDirectory()) return a.name.localeCompare(b.name);
        return a.isDirectory() ? -1 : 1;
      });

    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i];
      const isLast = i === sorted.length - 1;
      const connector = isLast ? "└── " : "├── ";
      
      output += `${prefix}${connector}${entry.name}${entry.isDirectory() ? "/" : ""}\n`;

      if (entry.isDirectory()) {
        const childPrefix = prefix + (isLast ? "    " : "│   ");
        output += await buildTree(join(path, entry.name), childPrefix);
      }
    }
  } catch {};
  return output;
};

const tree = await buildTree(".");
await Bun.write(outputFile, tree);
console.log(`Структура: ${outputFile}`);
