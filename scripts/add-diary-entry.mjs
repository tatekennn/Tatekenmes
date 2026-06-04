#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const force = args.includes('--force');
const positional = args.filter((arg) => arg !== '--force');
const inputPath = positional[0];
const rootDir = process.cwd();
const outputDir = path.join(rootDir, 'content', 'diary');

if (!fs.existsSync(path.join(rootDir, 'package.json')) || !fs.existsSync(path.join(rootDir, 'content'))) {
  console.error('Error: run this script from the repository root');
  process.exit(1);
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.trim().length > 0);
}

function isRealDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateEntry(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    fail('payload must be a JSON object');
  }

  const requiredKeys = ['slug', 'date', 'title', 'excerpt', 'tags', 'mood', 'body'];
  for (const key of requiredKeys) {
    if (!(key in entry)) {
      fail(`missing required key: ${key}`);
    }
  }

  if (typeof entry.slug !== 'string' || !isRealDateString(entry.slug)) {
    fail('slug must be a YYYY-MM-DD string');
  }
  if (typeof entry.date !== 'string' || !isRealDateString(entry.date)) {
    fail('date must be a YYYY-MM-DD string');
  }
  if (entry.slug !== entry.date) {
    fail('slug must match date exactly');
  }
  if (typeof entry.title !== 'string' || !entry.title.trim()) {
    fail('title must be a non-empty string');
  }
  if (typeof entry.excerpt !== 'string' || !entry.excerpt.trim()) {
    fail('excerpt must be a non-empty string');
  }
  if (!isStringArray(entry.tags)) {
    fail('tags must be a non-empty array of strings');
  }
  if (typeof entry.mood !== 'string' || !entry.mood.trim()) {
    fail('mood must be a non-empty string');
  }
  if (!Array.isArray(entry.body) || entry.body.length !== 3 || !entry.body.every((item) => typeof item === 'string' && item.trim())) {
    fail('body must be an array of exactly 3 non-empty strings');
  }

  return {
    slug: entry.slug,
    date: entry.date,
    title: entry.title.trim(),
    excerpt: entry.excerpt.trim(),
    tags: entry.tags.map((tag) => tag.trim()),
    mood: entry.mood.trim(),
    body: entry.body.map((paragraph) => paragraph.trim()),
  };
}

async function loadPayload() {
  if (inputPath) {
    const absolutePath = path.resolve(rootDir, inputPath);
    return fs.readFileSync(absolutePath, 'utf8');
  }

  if (process.stdin.isTTY) {
    fail('provide a JSON file path or pipe a JSON payload on stdin');
  }

  return readStdin();
}

async function main() {
  const payloadText = await loadPayload();
  let parsed;

  try {
    parsed = JSON.parse(payloadText);
  } catch (error) {
    fail(`invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  const entry = validateEntry(parsed);
  const outputPath = path.join(outputDir, `${entry.slug}.json`);

  fs.mkdirSync(outputDir, { recursive: true });

  if (fs.existsSync(outputPath) && !force) {
    fail(`refusing to overwrite existing file: ${path.relative(rootDir, outputPath)} (use --force to replace it)`);
  }

  fs.writeFileSync(outputPath, `${JSON.stringify(entry, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${path.relative(rootDir, outputPath)}`);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
