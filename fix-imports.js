import fs from "fs";
import path from "path";

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(file => {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      walk(filepath, callback);
    } else if (filepath.endsWith(".ts") || filepath.endsWith(".tsx") || filepath.endsWith(".js") || filepath.endsWith(".jsx")) {
      callback(filepath);
    }
  });
}

function fixFile(file) {
  let content = fs.readFileSync(file, "utf8");
  // Regex: remove @version numbers in imports
  const fixed = content.replace(/from\s+"([^"]+)@\d+\.\d+\.\d+"/g, 'from "$1"');
  if (fixed !== content) {
    fs.writeFileSync(file, fixed, "utf8");
    console.log("Fixed:", file);
  }
}

walk("./src/components", fixFile);
