const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const db = require('./config/database'); // 数据库实例

// 初始化 Express 应用
const app = express();

// 配置 Multer 用于文件上传
const upload = multer({ dest: 'uploads/' });

// 上传 JSON 文件并导入数据库
app.post('/upload-json', upload.single('jsonFile'), async (req, res) => {
  const filePath = req.file.path;

  try {
    // 读取 JSON 文件内容
    const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // 验证 JSON 数据格式
    if (!Array.isArray(jsonData)) {
      return res.status(400).send('JSON 文件内容格式错误，必须是数组');
    }

    // 插入数据到数据库
    const insertPromises = jsonData.map((item, index) => {
      const { id, name, price, stock, image } = item;

      // 验证字段
      if (
        id === undefined ||
        id === null ||
        !name ||
        price === undefined ||
        stock === undefined ||
        !image
      ) {
        console.error(`❌ JSON 数据格式错误: 第 ${index + 1} 个对象缺少必要字段`, item);
        throw new Error(`JSON 文件中第 ${index + 1} 个对象缺少必要字段或 'id' 格式不正确`);
      }

      // 可选：验证 id 的类型，例如确保它是数字或字符串
      // if (typeof id !== 'number') {
      //   throw new Error(`JSON 文件中第 ${index + 1} 个对象的 'id' 必须是数字`);
      // }

      return db.runAsync(
        "INSERT INTO products (id, name, price, stock, image) VALUES (?, ?, ?, ?, ?)",
        [id, name, price, stock, image]
      );
    });

    await Promise.all(insertPromises);

    // 删除临时文件
    fs.unlinkSync(filePath);

    // 成功响应
    res.send('<script>alert("JSON 文件上传成功并已导入数据库！"); window.location.href="/product/all";</script>');
  } catch (err) {
    console.error("❌ JSON 文件处理失败:", err);
    // 删除临时文件以防止占用空间
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    res.status(500).send(`服务器错误：无法处理 JSON 文件 - ${err.message}`);
  }
});

// 提供上传页面
app.get('/upload-json', (req, res) => {
  res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>上传 JSON 文件</title>
        </head>
        <body>
            <h1>上传商品 JSON 文件</h1>
            <form action="/upload-json" method="POST" enctype="multipart/form-data">
                <label for="jsonFile">选择 JSON 文件:</label>
                <input type="file" id="jsonFile" name="jsonFile" accept=".json" required>
                <br>
                <button type="submit">上传文件</button>
            </form>
        </body>
        </html>
    `);
});

// 启动独立服务器
const PORT = 3001; // 独立的端口
app.listen(PORT, () => {
  console.log(`JSON 上传服务运行在：http://localhost:${PORT}/upload-json`);
});
