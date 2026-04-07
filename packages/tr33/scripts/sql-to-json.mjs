#!/usr/bin/env node
import { writeFileSync } from "fs";

// Read from stdin
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", () => {
  // Write JSON with raw field
  writeFileSync("src/sqlite/schema.json", JSON.stringify({ raw: input }));
});
