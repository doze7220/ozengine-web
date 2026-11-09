/**
 * @fileoverview 責務: oz/FINGERPRINTS.txt（oz/ の指紋一覧）が oz/ の中身と一致していることの自動テスト。
 * oz/ のファイルはデータとして読むだけで、import しない。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** oz/ フォルダの絶対パス（末尾に区切りを含む）。 */
const OZ_DIR = fileURLToPath(new URL('../oz/', import.meta.url));

/** 一覧ファイルの名前（oz/ の最上位）。 */
const LIST_NAME = 'FINGERPRINTS.txt';

/** 失敗時に添えるメッセージ。 */
const HINT = 'oz/ を変えたら一覧を作り直す（開発資料4章の作り直しのコマンド）';

/**
 * oz/ 以下の通常のファイルを再帰的に列挙する（最上位の一覧ファイルは除く）。
 * @param {string} [rel=''] oz/ からの相対ディレクトリ（区切りは /、空なら最上位）
 * @returns {string[]} oz/ からの相対パス（区切りは /）の配列
 */
function listFiles(rel = '') {
  const result = [];
  const entries = readdirSync(join(OZ_DIR, rel), { withFileTypes: true });
  for (const entry of entries) {
    const path = rel === '' ? entry.name : `${rel}/${entry.name}`;
    if (entry.isDirectory()) {
      result.push(...listFiles(path));
    } else if (entry.isFile() && path !== LIST_NAME) {
      result.push(path);
    }
  }
  return result;
}

/**
 * 2つのパスを UTF-8 のバイト列で比べる（LC_ALL=C sort の順）。
 * @param {string} a パス
 * @param {string} b パス
 * @returns {number} 負・0・正
 */
function compareBytes(a, b) {
  return Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

/**
 * ファイルの中身から 0x0D を取り除いて SHA-256 の16進（小文字）を返す。
 * @param {string} rel oz/ からの相対パス
 * @returns {string} 64文字の16進
 */
function fingerprint(rel) {
  const bytes = readFileSync(join(OZ_DIR, rel));
  const stripped = Buffer.from(bytes.filter((b) => b !== 0x0d));
  return createHash('sha256').update(stripped).digest('hex');
}

/**
 * 期待される一覧の全文を作る（各行は LF で終わる）。
 * @returns {string} 一覧の全文
 */
function buildExpected() {
  return listFiles()
    .sort(compareBytes)
    .map((rel) => `${fingerprint(rel)}  ${rel}\n`)
    .join('');
}

/**
 * 一覧ファイルを読み、CR を取り除いた全文を返す。
 * @returns {string} 一覧の全文
 */
function readList() {
  return readFileSync(join(OZ_DIR, LIST_NAME), 'utf8').replace(/\r/g, '');
}

/**
 * 一覧を行ごとに「指紋とパス」へ分解する。
 * @returns {{hash: string, path: string}[]} 行ごとの組
 */
function parseList() {
  return readList()
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => ({ hash: line.slice(0, 64), path: line.slice(66) }));
}

test('指紋一覧の各行が「64文字の小文字の16進＋空白2つ＋パス」の形である', () => {
  const lines = readList().split('\n').filter((line) => line !== '');
  assert.ok(lines.length > 0, `一覧が空である。${HINT}`);
  for (const line of lines) {
    assert.match(line, /^[0-9a-f]{64} {2}\S.*$/, `形式が違う行: ${line}。${HINT}`);
  }
});

test('指紋一覧のパスの集合が oz/ の実際のファイルの集合と一致する', () => {
  const listed = parseList().map((e) => e.path).sort(compareBytes);
  const actual = listFiles().sort(compareBytes);
  assert.deepEqual(listed, actual, HINT);
});

test('指紋一覧の各ファイルの指紋が実際のファイルの指紋と一致する', () => {
  for (const { hash, path } of parseList()) {
    assert.equal(hash, fingerprint(path), `${path} の指紋が違う。${HINT}`);
  }
});

test('指紋一覧の全文が作り直しの出力（並び順・空白2つ・末尾の改行）と同じである', () => {
  assert.equal(readList(), buildExpected(), HINT);
});
