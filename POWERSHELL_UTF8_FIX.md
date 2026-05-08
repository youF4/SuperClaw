# PowerShell 中文编码问题彻底解决方案

## 问题根源

PowerShell 默认使用的编码不是 UTF-8，导致：
1. 控制台输出乱码
2. HTTP 请求发送中文时乱码
3. 文件读写编码不一致

---

## 解决方案

### 方案 1：PowerShell Profile 配置（推荐）

**创建或编辑 PowerShell Profile：**

```powershell
# 打开 Profile 文件
notepad $PROFILE

# 如果文件不存在，创建它
if (!(Test-Path -Path $PROFILE)) {
    New-Item -ItemType File -Path $PROFILE -Force
}
```

**添加以下内容到 Profile：**

```powershell
# ===== PowerShell UTF-8 编码配置 =====

# 1. 设置控制台编码为 UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# 2. 设置控制台代码页为 UTF-8
chcp 65001 | Out-Null

# 3. 设置默认编码变量
$PSDefaultParameterValues['*:Encoding'] = 'utf8'

# 4. 辅助函数：以 UTF-8 编码发送 HTTP 请求
function Invoke-WebRequestUTF8 {
    param(
        [string]$Uri,
        [string]$Method = 'Get',
        [object]$Body,
        [hashtable]$Headers = @{}
    )

    $Headers['Content-Type'] = 'application/json; charset=utf-8'

    if ($Body) {
        $json = if ($Body -is [string]) { $Body } else { $Body | ConvertTo-Json -Depth 10 }
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
        Invoke-RestMethod -Uri $Uri -Method $Method -Headers $Headers -Body $bytes -ContentType 'application/json; charset=utf-8'
    } else {
        Invoke-RestMethod -Uri $Uri -Method $Method -Headers $Headers
    }
}

# 5. 辅助函数：以 UTF-8 编码读取文件
function Get-ContentUTF8 {
    param([string]$Path)
    Get-Content -Path $Path -Encoding UTF8
}

# 6. 辅助函数：以 UTF-8 编码写入文件
function Set-ContentUTF8 {
    param(
        [string]$Path,
        [string]$Content
    )
    Set-Content -Path $Path -Value $Content -Encoding UTF8 -NoNewline
}

Write-Host "✅ PowerShell UTF-8 编码已配置" -ForegroundColor Green
```

**重启 PowerShell 即可生效。**

---

### 方案 2：每个脚本开头配置

**在脚本开头添加：**

```powershell
# 设置 UTF-8 编码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null
```

---

### 方案 3：使用 Node.js 替代 PowerShell（最可靠）

**创建 Node.js 脚本：**

```javascript
// send-request.mjs
import https from 'https';

const data = JSON.stringify({
  message: '这是中文消息',
  data: '更多中文内容'
});

const options = {
  hostname: 'api.example.com',
  path: '/endpoint',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data, 'utf8')
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log('响应:', body);
  });
});

req.write(data);
req.end();
```

**运行：**
```bash
node send-request.mjs
```

---

## 具体场景解决方案

### 场景 1：发送 HTTP 请求（GitHub API 等）

**PowerShell（配置后）：**

```powershell
# 使用辅助函数
$body = @{
    tag_name = "v1.0.0"
    name = "发布 v1.0.0"
    body = "这是中文说明"
}

Invoke-WebRequestUTF8 -Uri "https://api.github.com/repos/user/repo/releases" -Method Post -Body $body -Headers @{
    Authorization = "token YOUR_TOKEN"
}
```

**Node.js（推荐）：**

```javascript
import https from 'https';

const data = JSON.stringify({
  tag_name: 'v1.0.0',
  name: '发布 v1.0.0',
  body: '这是中文说明'
});

// ... 发送请求
```

---

### 场景 2：读取/写入文件

**PowerShell：**

```powershell
# 读取 UTF-8 文件
$content = Get-Content -Path "file.json" -Encoding UTF8

# 写入 UTF-8 文件
Set-Content -Path "output.json" -Value $json -Encoding UTF8
```

---

### 场景 3：控制台输出

**PowerShell：**

```powershell
# 设置编码后直接输出
Write-Host "这是中文消息" -ForegroundColor Green
```

---

## 项目中的最佳实践

### SuperClaw 项目的解决方案

**创建 `scripts/github-release.mjs`：**

```javascript
#!/usr/bin/env node
import https from 'https';
import { readFileSync } from 'fs';

const token = process.env.GITHUB_TOKEN;
const version = JSON.parse(readFileSync('package.json', 'utf8')).version;

const data = JSON.stringify({
  tag_name: `v${version}`,
  name: `SuperClaw v${version}`,
  body: readFileSync('RELEASE_NOTES.md', 'utf8'),
  draft: false,
  prerelease: false
});

const options = {
  hostname: 'api.github.com',
  path: '/repos/youF4/SuperClaw/releases',
  method: 'POST',
  headers: {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json; charset=utf-8',
    'User-Agent': 'SuperClaw-Release-Script',
    'Content-Length': Buffer.byteLength(data, 'utf8')
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    const result = JSON.parse(body);
    console.log('✅ Release 创建成功！');
    console.log('URL:', result.html_url);
  });
});

req.on('error', (e) => {
  console.error('❌ 错误:', e.message);
  process.exit(1);
});

req.write(data);
req.end();
```

**添加到 package.json：**

```json
{
  "scripts": {
    "release": "node scripts/github-release.mjs"
  }
}
```

**运行：**

```bash
GITHUB_TOKEN=ghp_xxx npm run release
```

---

## 总结

### ✅ 推荐方案

| 场景 | 推荐方案 | 原因 |
|------|---------|------|
| 发送 HTTP 请求 | Node.js | 完美支持 UTF-8 |
| 读写文件 | PowerShell + UTF8 参数 | 简单直接 |
| 控制台输出 | PowerShell Profile | 一次配置永久生效 |
| 项目脚本 | Node.js | 可靠性最高 |

### 🎯 最佳实践

1. **PowerShell Profile** 配置 UTF-8（一次性）
2. **重要脚本用 Node.js**（最可靠）
3. **文件操作指定 Encoding UTF8**
4. **HTTP 请求用 Node.js 或辅助函数**

---

## 参考资料

- [PowerShell Encoding](https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_character_encoding)
- [Node.js HTTP](https://nodejs.org/api/http.html)
- [UTF-8 RFC 3629](https://tools.ietf.org/html/rfc3629)
