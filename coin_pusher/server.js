import { join, dirname } from "path";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { createServer } from "http";

// Get the directory name using fileURLToPath
const __dirname = dirname(fileURLToPath(import.meta.url));

// Content types for different file extensions
const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
};

// Get content type based on file extension
function getContentType(path) {
  const ext = path.match(/\.[^.]*$/)?.[0] || "";
  return MIME_TYPES[ext.toLowerCase()] || "text/plain";
}

// Serve static files from a directory
function serveStatic(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let filePath = url.pathname;
    
    // Default to index.html for the root path
    if (filePath === "/") {
      filePath = "/index.html";
    }
    
    // Try to read the file
    const file = readFileSync(join(__dirname, filePath));
    
    res.writeHead(200, {
      "Content-Type": getContentType(filePath)
    });
    res.end(file);
  } catch (error) {
    console.error("Error serving file:", error);
    
    // If file not found, return 404
    if (error.code === "ENOENT") {
      res.writeHead(404);
      res.end("File not found");
    } else {
      // For other errors, return 500
      res.writeHead(500);
      res.end("Server error");
    }
  }
}

// Start the server
const PORT = process.env.PORT || 3001;
const server = createServer((req, res) => {
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
