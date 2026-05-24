// Sleep Countdown Widget for Scriptable
// Shows time remaining until wake-up with color-coded sleep quality
// Set wake time via widget parameter, e.g. "7:00" or "06:30"
// Defaults to 6:30 AM if no parameter is set

// Parse wake time from widget parameter
let TARGET_HOUR = 6;
let TARGET_MIN = 30;
const param = args.widgetParameter;
if (param) {
  const parts = param.trim().split(':').map(Number);
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    TARGET_HOUR = parts[0];
    TARGET_MIN = parts[1];
  }
}

const ACTIVE_HOUR = 21;
const ACTIVE_MIN = 30;

function formatWakeLabel() {
  let h = TARGET_HOUR;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(TARGET_MIN).padStart(2, '0')} ${ampm}`;
}

function getMinutesUntilTarget() {
  const now = new Date();
  const target = new Date(now);
  target.setHours(TARGET_HOUR, TARGET_MIN, 0, 0);
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }
  return (target - now) / 60000;
}

function isActive() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  const afterStart = h > ACTIVE_HOUR || (h === ACTIVE_HOUR && m >= ACTIVE_MIN);
  const beforeTarget = h < TARGET_HOUR || (h === TARGET_HOUR && m < TARGET_MIN);
  return afterStart || beforeTarget;
}

function getQuality(hours) {
  if (hours >= 8 && hours <= 10) return { label: "Optimal", color: new Color("#4ade80"), bg: new Color("#0f3d0f") };
  if (hours >= 7 && hours < 8)  return { label: "Acceptable", color: new Color("#facc15"), bg: new Color("#3d3d0f") };
  if (hours >= 5 && hours < 7)  return { label: "Insufficient", color: new Color("#f87171"), bg: new Color("#3d0f0f") };
  if (hours >= 3 && hours < 5)  return { label: "Critical", color: new Color("#666666"), bg: new Color("#1a1a1a") };
  if (hours > 10) return { label: "Optimal", color: new Color("#4ade80"), bg: new Color("#0f3d0f") };
  return { label: "Dangerous", color: new Color("#666666"), bg: new Color("#1a1a1a") };
}

function drawRing(ctx, center, radius, lineWidth, fraction, color) {
  // Background ring
  ctx.setStrokeColor(new Color("#1a1a2e"));
  ctx.setLineWidth(lineWidth);
  for (let a = 0; a < 360; a += 1) {
    const rad = (a - 90) * Math.PI / 180;
    const rad2 = (a - 89) * Math.PI / 180;
    const p1 = new Point(center.x + radius * Math.cos(rad), center.y + radius * Math.sin(rad));
    const p2 = new Point(center.x + radius * Math.cos(rad2), center.y + radius * Math.sin(rad2));
    const path = new Path();
    path.move(p1);
    path.addLine(p2);
    ctx.addPath(path);
    ctx.strokePath();
  }

  // Progress ring
  ctx.setStrokeColor(color);
  ctx.setLineWidth(lineWidth);
  const degrees = fraction * 360;
  for (let a = 0; a < degrees; a += 1) {
    const rad = (a - 90) * Math.PI / 180;
    const rad2 = (a - 89) * Math.PI / 180;
    const p1 = new Point(center.x + radius * Math.cos(rad), center.y + radius * Math.sin(rad));
    const p2 = new Point(center.x + radius * Math.cos(rad2), center.y + radius * Math.sin(rad2));
    const path = new Path();
    path.move(p1);
    path.addLine(p2);
    ctx.addPath(path);
    ctx.strokePath();
  }
}

const wakeLabel = formatWakeLabel();
const widgetFamily = config.widgetFamily || "medium";

if (!isActive()) {
  const w = new ListWidget();
  w.backgroundColor = new Color("#0a0a1a");
  const title = w.addText("Not Bedtime Yet");
  title.font = Font.semiboldSystemFont(14);
  title.textColor = Color.gray();
  w.addSpacer(4);
  const sub = w.addText("Come back after 9:30 PM");
  sub.font = Font.systemFont(12);
  sub.textColor = new Color("#555555");
  w.addSpacer(4);
  const wt = w.addText(`Wake target: ${wakeLabel}`);
  wt.font = Font.systemFont(10);
  wt.textColor = new Color("#444444");
  w.presentMedium();
  Script.setWidget(w);
  Script.complete();
} else {
  const totalMin = getMinutesUntilTarget();
  const hours = Math.floor(totalMin / 60);
  const minutes = Math.floor(totalMin % 60);
  const totalHours = totalMin / 60;
  const quality = getQuality(totalHours);
  const fraction = Math.min(totalHours / 9, 1);

  if (widgetFamily === "small") {
    const w = new ListWidget();
    w.backgroundColor = new Color("#0a0a1a");
    w.setPadding(12, 12, 12, 12);

    const badge = w.addText(quality.label.toUpperCase());
    badge.font = Font.boldSystemFont(9);
    badge.textColor = quality.color;

    w.addSpacer(4);

    const timeText = w.addText(`${hours}h ${minutes}m`);
    timeText.font = Font.boldMonospacedSystemFont(28);
    timeText.textColor = Color.white();

    w.addSpacer(2);

    const label = w.addText(`until ${wakeLabel}`);
    label.font = Font.systemFont(11);
    label.textColor = new Color("#888888");

    w.addSpacer();

    const legend = w.addText("8-10 optimal | 7-8 ok | <7 low");
    legend.font = Font.systemFont(8);
    legend.textColor = new Color("#555555");

    Script.setWidget(w);
    w.presentSmall();
  } else {
    const w = new ListWidget();
    w.backgroundColor = new Color("#0a0a1a");
    w.setPadding(0, 0, 0, 0);

    const size = widgetFamily === "large" ? 320 : 155;
    const ringSize = widgetFamily === "large" ? 120 : 55;
    const lineW = widgetFamily === "large" ? 12 : 7;

    const ctx = new DrawContext();
    ctx.size = new Size(340, size);
    ctx.opaque = false;
    ctx.respectScreenScale = true;

    const centerX = 85;
    const centerY = size / 2;
    const center = new Point(centerX, centerY);

    drawRing(ctx, center, ringSize, lineW, fraction, quality.color);

    // Center text in ring
    ctx.setTextColor(Color.white());
    ctx.setFont(Font.boldMonospacedSystemFont(ringSize > 55 ? 28 : 20));
    const timeStr = `${hours}h${minutes}m`;
    ctx.drawTextInRect(timeStr, new Rect(centerX - ringSize + 5, centerY - 12, (ringSize - 5) * 2, 30));

    // Right side text
    const rightX = centerX + ringSize + 25;
    ctx.setFont(Font.boldSystemFont(11));
    ctx.setTextColor(quality.color);
    ctx.drawText(quality.label.toUpperCase(), new Point(rightX, centerY - 35));

    ctx.setFont(Font.boldMonospacedSystemFont(26));
    ctx.setTextColor(Color.white());
    ctx.drawText(`${hours}h ${minutes}m`, new Point(rightX, centerY - 15));

    ctx.setFont(Font.systemFont(11));
    ctx.setTextColor(new Color("#888888"));
    ctx.drawText(`until ${wakeLabel}`, new Point(rightX, centerY + 15));

    ctx.setFont(Font.systemFont(9));
    ctx.setTextColor(new Color("#555555"));
    ctx.drawText("8-10h optimal | 7-8h ok | <7h low", new Point(rightX, centerY + 35));

    const img = w.addImage(ctx.getImage());
    img.centerAlignImage();

    Script.setWidget(w);
    w.presentMedium();
  }

  Script.complete();
}
