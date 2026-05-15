import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const port = Number(process.env.PORT || 5401);
const host = process.env.HOST || '0.0.0.0';
const root = resolve(process.cwd(), 'dist');

loadEnvFile();

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

function loadEnvFile() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, '');

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function getCorsHeaders(req) {
  const origin = req.headers.origin;
  const allowed = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const allowOrigin = allowed.length === 0 || allowed.includes(origin) ? origin || '*' : allowed[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(body));
}

function jsonWithCors(req, res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    ...getCorsHeaders(req),
  });
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 800_000) {
      throw new Error('request_too_large');
    }
  }

  return JSON.parse(body || '{}');
}

function cleanText(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function pickMeta(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    'i'
  );
  return cleanText(html.match(pattern)?.[1] || '');
}

function extractNoteText(html) {
  const article = html.match(/<article[\s\S]*?<\/article>/i)?.[0];
  if (article) {
    const text = cleanText(article);
    if (text.length > 120) return text;
  }

  const jsonLdBlocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const block of jsonLdBlocks) {
    try {
      const data = JSON.parse(block[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const body = item.articleBody || item.description;
        if (typeof body === 'string' && cleanText(body).length > 120) {
          return cleanText(body);
        }
      }
    } catch {
      // Ignore malformed embedded JSON.
    }
  }

  const description = pickMeta(html, 'description') || pickMeta(html, 'og:description');
  if (description.length > 40) return description;

  return '';
}

async function handleNoteRequest(req, res) {
  try {
    const { url } = await readJsonBody(req);
    if (!url || !/^https?:\/\//i.test(url)) {
      jsonWithCors(req, res, 400, { error: 'noteの公開URLを入力してください。' });
      return;
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TsubuyakiChan/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      jsonWithCors(req, res, 502, { error: 'noteページを取得できませんでした。本文をコピーして貼ってください。' });
      return;
    }

    const html = await response.text();
    const text = extractNoteText(html);

    if (!text) {
      jsonWithCors(req, res, 422, { error: '本文を自動取得できませんでした。本文をコピーして貼ってください。' });
      return;
    }

    jsonWithCors(req, res, 200, { text });
  } catch {
    jsonWithCors(req, res, 500, { error: '本文を自動取得できませんでした。本文をコピーして貼ってください。' });
  }
}

function buildPrompt(mode, text, options = {}) {
  const postMode = options.postMode || 'empathy';
  const salaStyle = options.salaStyle || 'natural';
  const modeLabel = {
    empathy: '共感重視',
    save: '保存重視',
    note: 'note誘導重視',
  }[postMode] || '共感重視';
  const styleLabel = {
    natural: 'ナチュラル',
    heat: '熱量強め',
    learning: '学び重視',
  }[salaStyle] || 'ナチュラル';

  if (mode === 'daily') {
    return `あなたは「つぶやきちゃん」、salaブランド専属のThreads編集AIです。

入力された「今日のつぶやきメモ」を主役にして、朝・昼・夜のThreads投稿を各1案作ってください。

編集モード: ${modeLabel}
salaらしさ強度: ${styleLabel}

絶対ルール:
- 入力メモの主題を必ず入れる
- 入力にない話題を勝手に足さない
- ChatGPT、知らない言葉、洗い物などを入力にないのに足さない
- テンプレートにしない
- 生活者感、途中感、少し疲れている感じを残す
- 成功者っぽくしない
- ただの日記で終わらせず、共感・気づき・小さな行動提案のどれかを入れる
- コメントしたくなる問いを入れる

出力はJSONだけ:
{
  "posts": [
    {"id":"morning","title":"① 朝の投稿","text":"...","shortText":"...","postTitle":"...","hook":"...","commentPrompt":"...","noteLead":"...","hashtags":["#..."],"qualityCheck":"..."},
    {"id":"noon","title":"② 昼の投稿","text":"...","shortText":"...","postTitle":"...","hook":"...","commentPrompt":"...","noteLead":"...","hashtags":["#..."],"qualityCheck":"..."},
    {"id":"night","title":"③ 夜の投稿","text":"...","shortText":"...","postTitle":"...","hook":"...","commentPrompt":"...","noteLead":"...","hashtags":["#..."],"qualityCheck":"..."}
  ]
}

今日のつぶやきメモ:
${text}`;
  }

  return `あなたは「つぶやきちゃん」、salaブランド専属のThreads編集AIです。

note本文から情報要約ではなく、「読者が知りたかった」と思うThreads投稿に編集してください。

編集モード: ${modeLabel}
salaらしさ強度: ${styleLabel}

ブランド:
- salaは40代から学び直しをしている女性起業家
- 将来的にKindle出版へつながる発信を育てる
- テーマはAI初心者、AI社員育成、学び直し、ノマドワーク、地方企業支援、DX、食品品質管理、起業、失敗談、チャレンジ過程
- salaは「未完成のまま進んでいる人」
- 読者に与える感情は勇気より安心
- 綺麗な自己啓発、宣伝、成功者感は禁止
- 生活感、夜の空気、小さな前進を残す

必須構成:
1. 共感フック
2. リアル体験
3. 気づき
4. 学び
5. 行動提案
6. コメント誘導

投稿には必ず以下のどれかを入れる:
- 読者が共感できる悩み
- 初心者でもできそう感
- 気づき
- 学び
- 行動提案
- コメントしたくなる問いかけ

note導線:
- 「詳しくはnoteへ」「読んでください」は禁止
- “続きを読みたくなる余白”を残す
- 例: この格闘記録はnoteにまとめます / 初心者でもできた手順をnoteに残します

出力:
- ${modeLabel}としてThreads投稿を3案
- 3案目はnote誘導を強める
- note紹介投稿も「note更新しました」は禁止

出力はJSONだけ:
{
  "posts": [
    {"id":"singleA","title":"① 共感重視投稿","text":"...","postTitle":"...","hook":"...","commentPrompt":"...","noteLead":"...","hashtags":["#..."],"qualityCheck":"..."},
    {"id":"singleB","title":"② 学び・保存投稿","text":"...","postTitle":"...","hook":"...","commentPrompt":"...","noteLead":"...","hashtags":["#..."],"qualityCheck":"..."},
    {"id":"noteIntro","title":"③ note誘導重視投稿","text":"...","postTitle":"...","hook":"...","commentPrompt":"...","noteLead":"...","hashtags":["#..."],"qualityCheck":"..."}
  ]
}

note本文:
${text}`;
}

function normalizePosts(value, mode) {
  if (!value || !Array.isArray(value.posts)) return null;
  const expectedIds = mode === 'daily' ? ['morning', 'noon', 'night'] : ['singleA', 'singleB', 'noteIntro'];
  const posts = value.posts.slice(0, 3).map((post, index) => ({
    id: post.id || expectedIds[index],
    title: post.title || (mode === 'daily' ? ['① 朝の投稿', '② 昼の投稿', '③ 夜の投稿'][index] : ['① Threads単体投稿', '② Threads単体投稿', '③ note紹介投稿'][index]),
    text: String(post.text || '').trim(),
    shortText: post.shortText ? String(post.shortText).trim() : undefined,
    postTitle: post.postTitle ? String(post.postTitle).trim() : undefined,
    hook: post.hook ? String(post.hook).trim() : undefined,
    commentPrompt: post.commentPrompt ? String(post.commentPrompt).trim() : undefined,
    noteLead: post.noteLead ? String(post.noteLead).trim() : undefined,
    hashtags: Array.isArray(post.hashtags) ? post.hashtags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 6) : undefined,
    qualityCheck: post.qualityCheck ? String(post.qualityCheck).trim() : undefined,
  }));

  if (posts.length !== 3 || posts.some((post) => !post.text)) return null;
  return posts;
}

async function handleGenerateRequest(req, res) {
  try {
    const { mode = 'note', text = '', options = {} } = await readJsonBody(req);
    const cleanInput = String(text).trim();

    if (!cleanInput) {
      jsonWithCors(req, res, 400, { error: '本文またはメモを入力してください。' });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      jsonWithCors(req, res, 503, { error: 'OPENAI_API_KEYが未設定です。.envまたはデプロイ先の環境変数に設定してください。' });
      return;
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
        input: buildPrompt(mode, cleanInput.slice(0, 24000), options),
        text: { format: { type: 'json_object' } },
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      jsonWithCors(req, res, response.status, { error: result.error?.message || '投稿生成に失敗しました。' });
      return;
    }

    const outputText = result.output_text || result.output?.flatMap((item) => item.content || []).map((item) => item.text || '').join('');
    const parsed = JSON.parse(outputText || '{}');
    const posts = normalizePosts(parsed, mode);

    if (!posts) {
      jsonWithCors(req, res, 502, { error: '生成結果を読み取れませんでした。もう一度お試しください。' });
      return;
    }

    jsonWithCors(req, res, 200, { posts });
  } catch (error) {
    const message = error.message === 'request_too_large'
      ? '入力が長すぎます。本文を少し短くしてください。'
      : '投稿生成に失敗しました。';
    jsonWithCors(req, res, 500, { error: message });
  }
}

async function serveStatic(req, res) {
  const pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host || `127.0.0.1:${port}`}`).pathname);
  const requestedPath = pathname === '/' ? 'index.html' : pathname.slice(1);
  const filePath = normalize(join(root, requestedPath));

  if (!filePath.startsWith(root)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  try {
    const data = await readFile(filePath);
    const type = mimeTypes[extname(filePath)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  } catch {
    const index = await readFile(join(root, 'index.html'));
    res.writeHead(200, { 'Content-Type': mimeTypes['.html'] });
    res.end(index);
  }
}

async function requestListener(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      ...getCorsHeaders(req),
    });
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/note') {
    await handleNoteRequest(req, res);
    return;
  }

  if (req.method === 'POST' && req.url === '/api/generate') {
    await handleGenerateRequest(req, res);
    return;
  }

  await serveStatic(req, res);
}

export default requestListener;

if (!process.env.VERCEL) {
  createServer(requestListener).listen(port, host, () => {
    console.log(`つぶやきちゃん API: http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${port}`);
  });
}
