import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
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

async function kickerLabel(ctx: any, label: string) {
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

export async function makeQuoteCard(
  quote: string, guestName: string, guestTitle: string, episodeTitle: string, epNumber: string
): Promise<Buffer> {
  const { canvas, ctx } = await newCanvas();
  await kickerLabel(ctx, `EP-${epNumber} · PROFIT STREAMS® PODCAST`);

  ctx.font = "120px InterBold";
  ctx.fillStyle = WHITE;
  ctx.fillText("\u201C", 65, 280);

  ctx.font = "48px InterBold";
  const wrapped = wrapText(ctx, quote, 920);
  let y = 340;
  for (const line of wrapped) {
    ctx.fillText(line, 70, y);
    y += 62;
  }

  y += 20;
  ctx.strokeStyle = WHITE;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(70, y);
  ctx.lineTo(270, y);
  ctx.stroke();

  ctx.font = "32px InterBold";
  ctx.fillStyle = WHITE;
  ctx.fillText(guestName, 70, y + 45);
  ctx.font = "24px InterReg";
  ctx.fillStyle = GRAY_SOFT;
  ctx.fillText(guestTitle, 70, y + 80);

  footer(ctx, episodeTitle);
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

    ctx.font = "40px InterBold";
    ctx.fillStyle = WHITE;
    const wrapped = wrapText(ctx, takeaways[i], 920);
    let y = 390;
    for (const line of wrapped) {
      ctx.fillText(line, 70, y);
      y += 52;
    }

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

export async function makeThumbnail(
  episodeTitle: string, guestName: string, epNumber: string
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

  const iconPath = path.join(process.cwd(), "public", "af-swoosh-icon.png");
  if (fs.existsSync(iconPath)) {
    const icon = await loadImage(iconPath);
    ctx.drawImage(icon, 180, 180, 220, 220);
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
