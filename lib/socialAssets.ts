import { createCanvas, loadImage, GlobalFonts, Path2D } from "@napi-rs/canvas";
import { BRANDS, Brand } from "./brandIcons";
import { markRuns, stripMarks } from "./textStyle";
import path from "path";
import fs from "fs";

// Real brand colors, sampled directly from the Profit Streams logo/cover art
const NAVY = "#014784";
const BRIGHT_BLUE = "#00A1EA";
const WHITE = "#FFFFFF";
const GRAY_SOFT = "#C8D7E1";

const W = 1080;
const H = 1080;

// Register real Inter font files so rendering matches the actual brand,
// not a system-font substitute. .woff works directly with @napi-rs/canvas.
const FONT_PATH_BOLD = path.join(process.cwd(), "public", "fonts", "Inter-Bold.woff");
const FONT_PATH_REG = path.join(process.cwd(), "public", "fonts", "Inter-Regular.woff");
let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  if (fs.existsSync(FONT_PATH_BOLD)) GlobalFonts.registerFromPath(FONT_PATH_BOLD, "InterBold");
  if (fs.existsSync(FONT_PATH_REG)) GlobalFonts.registerFromPath(FONT_PATH_REG, "InterReg");
  fontsRegistered = true;
}

function wrapText(ctx: any, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function gradientBg(ctx: any) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, BRIGHT_BLUE);
  grad.addColorStop(1, NAVY);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

async function newCanvas() {
  ensureFonts();
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  gradientBg(ctx);
  return { canvas, ctx };
}

async function drawIcon(ctx: any) {
  const iconPath = path.join(process.cwd(), "public", "af-swoosh-icon.png");
  if (fs.existsSync(iconPath)) {
    const icon = await loadImage(iconPath);
    ctx.drawImage(icon, 70, 60, 64, 64);
    return 70 + 64 + 16;
  }
  return 70;
}

/** Official platform logo (Simple Icons path, 24x24) drawn in white. */
function drawBrand(ctx: any, brand: Brand, x: number, y: number, size: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.fillStyle = WHITE;
  ctx.fill(new Path2D(BRANDS[brand].path));
  ctx.restore();
}

/** "Listen on" mark, top right of every card: Spotify + Apple Podcasts logos (decision 0017). */
function platformBadges(ctx: any) {
  const size = 40;
  drawBrand(ctx, "applePodcasts", W - 70 - size, 72, size);
  drawBrand(ctx, "spotify", W - 70 - size * 2 - 18, 72, size);
}

/**
 * Text with **key phrases**: normal words in regular weight, marked words in bold with a soft highlight.
 * Returns the y after the last line.
 */
function drawRich(ctx: any, text: string, x: number, y: number, maxW: number, size: number, lineH: number): number {
  // Tokens keep punctuation glued to its word ("projects," not "projects ,")
  const tokens: { w: string; bold: boolean; spaceBefore: boolean }[] = [];
  let pendingSpace = false;
  for (const r of markRuns(text)) {
    for (const part of r.text.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) { pendingSpace = true; continue; }
      tokens.push({ w: part, bold: r.bold, spaceBefore: pendingSpace && tokens.length > 0 });
      pendingSpace = false;
    }
  }
  const font = (b: boolean) => `${size}px ${b ? "InterBold" : "InterReg"}`;
  ctx.font = font(false);
  const space = ctx.measureText(" ").width;
  type Placed = { w: string; bold: boolean; x: number; width: number };
  const lines: Placed[][] = [[]];
  let cx = 0;
  for (const t of tokens) {
    ctx.font = font(t.bold);
    const width = ctx.measureText(t.w).width;
    const gap = t.spaceBefore && lines[lines.length - 1].length ? space : 0;
    if (cx + gap + width > maxW && lines[lines.length - 1].length && t.spaceBefore) {
      lines.push([]);
      cx = 0;
      lines[lines.length - 1].push({ w: t.w, bold: t.bold, x: 0, width });
      cx = width;
    } else {
      lines[lines.length - 1].push({ w: t.w, bold: t.bold, x: cx + gap, width });
      cx += gap + width;
    }
  }
  for (const line of lines) {
    // one highlight per continuous bold span
    let i = 0;
    while (i < line.length) {
      if (!line[i].bold) { i++; continue; }
      let j = i;
      while (j + 1 < line.length && line[j + 1].bold) j++;
      const left = x + line[i].x - 6;
      const right = x + line[j].x + line[j].width + 6;
      ctx.fillStyle = "rgba(255,255,255,0.16)";
      ctx.fillRect(left, y - size * 0.9, right - left, size * 1.2);
      i = j + 1;
    }
    for (const t of line) {
      ctx.font = font(t.bold);
      ctx.fillStyle = WHITE;
      ctx.fillText(t.w, x + t.x, y);
    }
    y += lineH;
  }
  return y;
}

async function kickerLabel(ctx: any, label: string) {
  platformBadges(ctx);
  const xStart = await drawIcon(ctx);
  ctx.font = "24px InterBold";
  ctx.fillStyle = WHITE;
  ctx.fillText(label, xStart, 60 + 18 + 24);
}

function footer(ctx: any, episodeTitle: string) {
  ctx.font = "22px InterReg";
  ctx.fillStyle = GRAY_SOFT;
  const wrapped = wrapText(ctx, episodeTitle, 940);
  let y = H - 90 - (wrapped.length - 1) * 28;
  for (const line of wrapped) {
    ctx.fillText(line, 70, y);
    y += 28;
  }
  ctx.fillStyle = WHITE;
  ctx.fillText("profit-streams.com", 70, H - 50);
}

export async function makeTitleCard(
  episodeTitle: string, guestName: string, hostName: string, epNumber: string
): Promise<Buffer> {
  const { canvas, ctx } = await newCanvas();
  await kickerLabel(ctx, `EP-${epNumber} · PROFIT STREAMS® PODCAST`);

  ctx.font = "62px InterBold";
  ctx.fillStyle = WHITE;
  const wrapped = wrapText(ctx, episodeTitle, 940);
  let y = 300;
  for (const line of wrapped) {
    ctx.fillText(line, 70, y);
    y += 74;
  }

  y += 20;
  ctx.strokeStyle = WHITE;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(70, y);
  ctx.lineTo(270, y);
  ctx.stroke();
  y += 45;

  ctx.font = "34px InterReg";
  ctx.fillStyle = WHITE;
  ctx.fillText(`with ${guestName}`, 70, y);
  y += 48;
  ctx.fillStyle = GRAY_SOFT;
  ctx.fillText(`Hosted by ${hostName}`, 70, y);

  footer(ctx, episodeTitle);
  return canvas.toBuffer("image/png");
}

export async function makeSummaryCard(hookLine: string, episodeTitle: string, epNumber: string): Promise<Buffer> {
  const { canvas, ctx } = await newCanvas();
  await kickerLabel(ctx, `EP-${epNumber} · PROFIT STREAMS® PODCAST`);

  ctx.font = "46px InterBold";
  ctx.fillStyle = WHITE;
  const wrapped = wrapText(ctx, hookLine, 940);
  let y = 340;
  for (const line of wrapped) {
    ctx.fillText(line, 70, y);
    y += 60;
  }

  footer(ctx, episodeTitle);
  return canvas.toBuffer("image/png");
}

/** Lines that fit `maxW` at the largest size that keeps the block under `maxH`. */
function fitText(ctx: any, text: string, font: string, maxW: number, maxH: number, start: number, min: number, lineGap = 1.25) {
  for (let size = start; size >= min; size -= 2) {
    ctx.font = `${size}px ${font}`;
    const lines = wrapText(ctx, text, maxW);
    if (lines.length * size * lineGap <= maxH) return { size, lines, lineH: size * lineGap };
  }
  ctx.font = `${min}px ${font}`;
  return { size: min, lines: wrapText(ctx, text, maxW), lineH: min * lineGap };
}

/** Calm, minimal background for quote + explainer cards (decision 0020). */
async function minimalCanvas() {
  ensureFonts();
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#013A6B");
  g.addColorStop(1, "#012447");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  return { canvas, ctx };
}

function smallBrand(ctx: any, epNumber: string) {
  ctx.font = "22px InterBold";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText(`EP-${epNumber}  ·  PROFIT STREAMS® PODCAST`, 90, 110);
}

function pill(ctx: any, text: string, x: number, y: number, bg: string, fg: string, size = 26) {
  ctx.font = `${size}px InterBold`;
  const w = ctx.measureText(text).width + size * 1.4;
  const h = size * 1.9;
  ctx.fillStyle = bg;
  ctx.beginPath();
  (ctx as any).roundRect(x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.fillText(text, x + size * 0.7, y + h * 0.66);
  return w;
}

/**
 * Minimal quote card: the guest's REAL words, their name, and the moment it was said (decision 0020).
 * `swipeTerm` adds "Swipe: what is MQ?" when an explainer slide follows.
 */
export async function makeQuoteCard(
  quote: string, guestName: string, guestTitle: string, episodeTitle: string, epNumber: string,
  headshotBuffer: Buffer | null = null, time: string | null = null, swipe: string | null = null
): Promise<Buffer> {
  const { canvas, ctx } = await minimalCanvas();
  smallBrand(ctx, epNumber);
  // big quote mark
  ctx.font = "200px InterBold";
  ctx.fillStyle = BRIGHT_BLUE;
  ctx.fillText("\u201C", 78, 330);
  const fit = fitText(ctx, quote, "InterBold", 900, 470, 64, 36, 1.22);
  let y = 330 + fit.size * 0.2;
  ctx.fillStyle = WHITE;
  ctx.font = `${fit.size}px InterBold`;
  for (const line of fit.lines) { ctx.fillText(line, 90, y); y += fit.lineH; }
  // who + when
  const baseY = H - 170;
  if (headshotBuffer) await drawHeadshot(ctx, headshotBuffer, 90, baseY - 12, 92);
  const tx = headshotBuffer ? 210 : 90;
  ctx.font = "34px InterBold"; ctx.fillStyle = WHITE; ctx.fillText(guestName, tx, baseY + 22);
  if (guestTitle) { ctx.font = "24px InterReg"; ctx.fillStyle = GRAY_SOFT; ctx.fillText(guestTitle.slice(0, 60), tx, baseY + 60); }
  if (time) pill(ctx, `\u25B6  ${time}`, W - 90 - 160, baseY - 6, "rgba(0,161,234,0.22)", "#9ED9F7", 26);
  if (swipe) {
    ctx.font = "24px InterBold"; ctx.fillStyle = "#9ED9F7";
    const t = `${swipe}  \u2192`; ctx.fillText(t, W - 90 - ctx.measureText(t).width, H - 60);
  }
  return canvas.toBuffer("image/png");
}

/** Slide 2 after the quote: what the jargon or technology means, with an example (decision 0020). */
export async function makeExplainerCard(
  term: string, kind: "abbr" | "tech", meaning: string, example: string, guestName: string, epNumber: string, time: string | null
): Promise<Buffer> {
  const { canvas, ctx } = await minimalCanvas();
  smallBrand(ctx, epNumber);
  ctx.font = "26px InterBold"; ctx.fillStyle = "#9ED9F7";
  ctx.fillText(kind === "tech" ? "NEW TECH, EXPLAINED" : "JARGON, EXPLAINED", 90, 230);
  const head = kind === "tech" ? term : `What is ${term}?`;
  const hf = fitText(ctx, head, "InterBold", 900, 200, 96, 52, 1.1);
  let y = 230 + hf.size * 1.15;
  ctx.fillStyle = WHITE; ctx.font = `${hf.size}px InterBold`;
  for (const l of hf.lines) { ctx.fillText(l, 90, y); y += hf.lineH; }
  y += 20;
  const mf = fitText(ctx, meaning, "InterReg", 900, 220, 40, 28, 1.3);
  ctx.fillStyle = WHITE; ctx.font = `${mf.size}px InterReg`;
  for (const l of mf.lines) { ctx.fillText(l, 90, y); y += mf.lineH; }
  if (example) {
    y += 30;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    const ef = fitText(ctx, example, "InterReg", 840, 200, 30, 24, 1.35);
    const boxH = ef.lines.length * ef.lineH + 84;
    ctx.beginPath(); (ctx as any).roundRect(90, y, 900, boxH, 22); ctx.fill();
    ctx.font = "22px InterBold"; ctx.fillStyle = "#9ED9F7"; ctx.fillText("EXAMPLE", 120, y + 44);
    ctx.fillStyle = GRAY_SOFT; ctx.font = `${ef.size}px InterReg`;
    let ey = y + 44 + ef.size * 1.4;
    for (const l of ef.lines) { ctx.fillText(l, 120, ey); ey += ef.lineH; }
  }
  ctx.font = "24px InterReg"; ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText(`${kind === "tech" ? "See what" : "As used by"} ${guestName}${time ? ` at ${time}` : ""}${kind === "tech" ? " has to say about it in the episode" : " in the episode"}`.slice(0, 80), 90, H - 60);
  return canvas.toBuffer("image/png");
}

export async function makeTakeawaysCarousel(
  takeaways: string[], episodeTitle: string, epNumber: string
): Promise<Buffer[]> {
  const buffers: Buffer[] = [];
  const total = takeaways.length;
  for (let i = 0; i < total; i++) {
    const { canvas, ctx } = await newCanvas();
    await kickerLabel(ctx, `EP-${epNumber} · KEY TAKEAWAYS`);

    ctx.font = "90px InterBold";
    ctx.fillStyle = WHITE;
    ctx.fillText(`${i + 1}`, 70, 250);
    ctx.font = "28px InterReg";
    ctx.fillStyle = GRAY_SOFT;
    ctx.fillText(`of ${total}`, 70, 285);

    drawRich(ctx, takeaways[i], 70, 390, 920, 42, 56);

    footer(ctx, episodeTitle);
    buffers.push(canvas.toBuffer("image/png"));
  }
  return buffers;
}

export async function makeChaptersCards(
  chapters: { time: string; title: string }[], episodeTitle: string, epNumber: string, maxPerSlide = 8
): Promise<Buffer[]> {
  const buffers: Buffer[] = [];
  const chunks: typeof chapters[] = [];
  for (let i = 0; i < chapters.length; i += maxPerSlide) {
    chunks.push(chapters.slice(i, i + maxPerSlide));
  }

  for (let idx = 0; idx < chunks.length; idx++) {
    const { canvas, ctx } = await newCanvas();
    const label = `EP-${epNumber} · CHAPTERS` + (chunks.length > 1 ? ` (${idx + 1}/${chunks.length})` : "");
    await kickerLabel(ctx, label);

    let y = 180;
    for (const { time, title } of chunks[idx]) {
      ctx.font = "28px InterBold";
      ctx.fillStyle = WHITE;
      ctx.fillText(time, 70, y);

      ctx.font = "26px InterReg";
      ctx.fillStyle = GRAY_SOFT;
      const wrapped = wrapText(ctx, title, 800);
      ctx.fillText(wrapped[0], 190, y);
      y += 40;
      for (const extra of wrapped.slice(1)) {
        ctx.fillText(extra, 190, y);
        y += 40;
      }
      y += 18;
    }

    footer(ctx, episodeTitle);
    buffers.push(canvas.toBuffer("image/png"));
  }
  return buffers;
}

async function drawHeadshot(ctx: any, imageBuffer: Buffer | null, x: number, y: number, size: number) {
  if (!imageBuffer) return;
  try {
    const img = await loadImage(imageBuffer);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, x, y, size, size);
    ctx.restore();
  } catch (e) {
    console.error("Could not draw headshot:", e);
  }
}

export async function makeThumbnail(
  episodeTitle: string, guestName: string, epNumber: string, headshotBuffer: Buffer | null = null
): Promise<Buffer> {
  // Standard podcast thumbnail: 3000x3000, same brand system
  ensureFonts();
  const size = 3000;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, BRIGHT_BLUE);
  grad.addColorStop(1, NAVY);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  if (headshotBuffer) {
    // If we have a real guest photo, feature it instead of just the logo
    await drawHeadshot(ctx, headshotBuffer, 180, 180, 320);
  } else {
    const iconPath = path.join(process.cwd(), "public", "af-swoosh-icon.png");
    if (fs.existsSync(iconPath)) {
      const icon = await loadImage(iconPath);
      ctx.drawImage(icon, 180, 180, 220, 220);
    }
  }

  ctx.font = "700 130px InterBold";
  ctx.fillStyle = WHITE;
  const wrapped = wrapText(ctx, episodeTitle, 2600);
  let y = 700;
  for (const line of wrapped.slice(0, 3)) {
    ctx.fillText(line, 180, y);
    y += 155;
  }

  ctx.font = "80px InterReg";
  ctx.fillStyle = "#DDEBF5";
  ctx.fillText(`with ${guestName}`, 180, y + 60);

  ctx.font = "60px InterBold";
  ctx.fillStyle = WHITE;
  ctx.fillText(`EP-${epNumber}`, 180, size - 180);
  ctx.fillText("PROFIT STREAMS® PODCAST", 180, size - 100);

  return canvas.toBuffer("image/png");
}
