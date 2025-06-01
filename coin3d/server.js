import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// 获取当前目录
const __dirname = dirname(fileURLToPath(import.meta.url));

// MIME类型映射
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// 创建服务器
const server = createServer((req, res) => {
  try {
    // 获取请求路径
    let filePath = '.' + req.url;
    if (filePath === './') {
      filePath = './index.html';
    }
    
    // 确定文件扩展名
    const extname = String(filePath.split('.').pop()).toLowerCase();
    const contentType = mimeTypes[`.${extname}`] || 'application/octet-stream';
    
    // 读取文件
    const content = readFileSync(join(__dirname, filePath));
    
    // 发送响应
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content, 'utf-8');
    
  } catch (error) {
    // 处理错误
    if (error.code === 'ENOENT') {
      res.writeHead(404);
      res.end('File not found');
    } else {
      res.writeHead(500);
      res.end(`Server Error: ${error.code}`);
    }
  }
});

// 监听端口
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
