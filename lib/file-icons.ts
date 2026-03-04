import {
  File,
  FileJson,
  FileText,
  FileCode,
  FileImage,
  Folder,
  FolderOpen,
  FileType,
  Hash,
  Settings,
  Lock,
  Database,
  type LucideIcon,
} from "lucide-react";

const extensionIcons: Record<string, LucideIcon> = {
  // Text/docs
  txt: FileText,
  md: FileText,
  markdown: FileText,
  log: FileText,
  csv: FileText,

  // Config
  json: FileJson,
  jsonc: FileJson,
  yaml: Settings,
  yml: Settings,
  toml: Settings,
  ini: Settings,
  cfg: Settings,
  conf: Settings,
  env: Lock,

  // Code
  js: FileCode,
  jsx: FileCode,
  ts: FileCode,
  tsx: FileCode,
  py: FileCode,
  rs: FileCode,
  go: FileCode,
  rb: FileCode,
  java: FileCode,
  c: FileCode,
  cpp: FileCode,
  h: FileCode,
  cs: FileCode,
  swift: FileCode,
  php: FileCode,
  html: FileCode,
  css: FileCode,
  scss: FileCode,
  vue: FileCode,
  svelte: FileCode,

  // Images
  png: FileImage,
  jpg: FileImage,
  jpeg: FileImage,
  gif: FileImage,
  svg: FileImage,
  webp: FileImage,
  ico: FileImage,
  bmp: FileImage,

  // Data
  sql: Database,
  db: Database,
  sqlite: Database,

  // Fonts
  ttf: FileType,
  otf: FileType,
  woff: FileType,
  woff2: FileType,

  // Binary/misc
  bin: Hash,
  dat: Hash,
  exe: Hash,
  dll: Hash,
};

export function getFileIcon(name: string, isDirectory: boolean, isOpen?: boolean): LucideIcon {
  if (isDirectory) {
    return isOpen ? FolderOpen : Folder;
  }

  const ext = name.split(".").pop()?.toLowerCase() || "";
  return extensionIcons[ext] || File;
}

export function getLanguageFromExtension(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const langMap: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    ts: "typescript",
    tsx: "typescript",
    json: "json",
    jsonc: "json",
    md: "markdown",
    markdown: "markdown",
    py: "python",
    rs: "rust",
    go: "go",
    rb: "ruby",
    java: "java",
    c: "c",
    cpp: "cpp",
    cc: "cpp",
    h: "c",
    hpp: "cpp",
    cs: "csharp",
    swift: "swift",
    php: "php",
    html: "html",
    htm: "html",
    css: "css",
    scss: "scss",
    sass: "scss",
    less: "less",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    sql: "sql",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    ps1: "powershell",
    bat: "bat",
    dockerfile: "dockerfile",
    graphql: "graphql",
    gql: "graphql",
    lua: "lua",
    r: "r",
    kt: "kotlin",
    kts: "kotlin",
    ex: "elixir",
    exs: "elixir",
    erl: "erlang",
    hs: "haskell",
    clj: "clojure",
    vue: "vue",
    svelte: "svelte",
    prisma: "prisma",
    tf: "hcl",
    ini: "ini",
    cfg: "ini",
    conf: "ini",
    env: "dotenv",
    txt: "plaintext",
    log: "log",
    csv: "csv",
    diff: "diff",
    patch: "diff",
  };

  return langMap[ext] || "plaintext";
}

export function isImageFile(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return ["png", "jpg", "jpeg", "gif", "svg", "webp", "ico", "bmp", "tiff", "tif", "avif"].includes(ext);
}

export function isTextFile(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const textExts = new Set([
    "txt", "md", "markdown", "json", "jsonc", "yaml", "yml", "toml", "xml",
    "html", "htm", "css", "scss", "sass", "less", "js", "jsx", "ts", "tsx",
    "mjs", "cjs", "vue", "svelte", "py", "rb", "rs", "go", "java", "kt",
    "kts", "c", "cpp", "cc", "h", "hpp", "cs", "swift", "php", "sh", "bash",
    "zsh", "fish", "ps1", "bat", "cmd", "sql", "graphql", "gql", "r", "lua",
    "pl", "pm", "ex", "exs", "erl", "hrl", "hs", "lhs", "ml", "mli", "elm",
    "clj", "cljs", "cljc", "lisp", "el", "scm", "rkt", "tf", "hcl", "ini",
    "cfg", "conf", "env", "properties", "gitignore", "gitattributes",
    "dockerignore", "editorconfig", "log", "csv", "tsv", "diff", "patch",
    "makefile", "cmake", "gradle", "pom", "lock", "prisma",
  ]);
  return textExts.has(ext);
}
