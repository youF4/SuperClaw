// Prune unnecessary packages from openclaw-dist/node_modules
// These packages are used by OpenClaw CLI/TUI but NOT by the Gateway server.
import { rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const nm = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "openclaw-dist",
  "node_modules"
);

const prune = [
  // Document processing (not needed by gateway)
  "pdfjs-dist",

  // Code parsing (used by CLI for syntax highlighting)
  "tree-sitter-bash",
  "web-tree-sitter",
  "web-tree-sitter",

  // Browser automation (used for testing only)
  "playwright-core",

  // CLI-only: terminal UI components
  "@clack/core",
  "@clack/prompts",
  "highlight.js",

  // Terminal PTY (not needed by gateway)
  "@lydell/node-pty",
];

let total = 0;
for (const pkg of prune) {
  const dir = join(nm, pkg);
  if (existsSync(dir)) {
    // Get size before removing
    const { readdirSync, statSync } = await import("node:fs");
    let size = 0;
    try {
      const walk = (d) => {
        for (const entry of readdirSync(d, { withFileTypes: true })) {
          const full = join(d, entry.name);
          if (entry.isDirectory()) walk(full);
          else size += statSync(full).size;
        }
      };
      walk(dir);
    } catch {}
    rmSync(dir, { recursive: true, force: true });
    const mb = (size / 1024 / 1024).toFixed(1);
    console.log(`  pruned ${pkg} (-${mb} MB)`);
    total += size;
  }
}
console.log(`Total saved: ${(total / 1024 / 1024).toFixed(1)} MB`);
