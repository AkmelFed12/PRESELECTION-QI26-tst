import fs from "node:fs";

const requiredFiles = ["server.js", "package.json", "public/index.html"];

const missingFiles = requiredFiles.filter((file) => !fs.existsSync(file));

if (missingFiles.length > 0) {
  console.error("Smoke check failed. Missing files:", missingFiles.join(", "));
  process.exit(1);
}

console.log("Smoke check passed.");
