import {
  Application,
  Container,
  Graphics,
  Text,
  Sprite,
  Assets,
  Rectangle,
} from "pixi.js";

let app;
let _layerHUD;
let _layerGrowth;
let _layerModal;

export async function initPixi() {
  app = new Application();
  await app.init({
    backgroundAlpha: 0,
    resizeTo: window,
    resolution: 1.5,
    autoDensity: true,
  });
  const cv = app.canvas;
  cv.style.cssText = "position:fixed;inset:0;z-index:20;pointer-events:auto;";
  document.body.appendChild(cv);

  _layerHUD = new Container();
  _layerGrowth = new Container();
  _layerModal = new Container();
  app.stage.addChild(_layerHUD, _layerGrowth, _layerModal);

  app.canvas.addEventListener("pointerdown", (e) => {
    if (!isAnyModalOpen()) {
    }
  });
}

export function getCanvas() {
  return app.canvas;
}

let _moneyRoot, _moneyBg, _moneyLabel;

export async function createMoneyHUD() {
  _moneyRoot = new Container();
  _layerHUD.addChild(_moneyRoot);

  _moneyBg = new Graphics();
  _moneyRoot.addChild(_moneyBg);

  let icon;
  try {
    const tex = await Assets.load("/assets/images/money.png");
    icon = new Sprite(tex);
    icon.width = icon.height = 32;
    icon.x = 12;
    icon.y = 10;
    _moneyRoot.addChild(icon);
  } catch {
    const fallback = new Text({
      text: "🪙",
      style: { fontSize: 26, fontFamily: "'Segoe UI', sans-serif" },
    });
    fallback.x = 10;
    fallback.y = 8;
    _moneyRoot.addChild(fallback);
  }

  _moneyLabel = new Text({
    text: "0",
    style: {
      fill: "#ffd700",
      fontSize: 24,
      fontWeight: "700",
      fontFamily: "'Segoe UI', sans-serif",
    },
  });
  _moneyLabel.x = 54;
  _moneyLabel.y = 14;
  _moneyRoot.addChild(_moneyLabel);
}

export function updateMoneyHUD(amount) {
  if (!_moneyLabel) return;
  _moneyLabel.text = String(amount);
  const w = 54 + _moneyLabel.width + 18;
  _moneyBg.clear();
  _moneyBg
    .roundRect(0, 0, w, 52, 26)
    .fill({ color: 0x0a0a1a, alpha: 0.82 })
    .stroke({ color: 0xffd700, width: 1.5, alpha: 0.5 });
  _moneyRoot.x = window.innerWidth - w - 16;
  _moneyRoot.y = 16;
}

let _storageRoot, _storageBg, _storageBody, _storagePanelH;
const _iconCache = new Map();

export async function createStoragePanel(itemIcons) {
  await Promise.all(
    Object.entries(itemIcons).map(([k, url]) =>
      Assets.load(url)
        .then((t) => _iconCache.set(k, t))
        .catch(() => {}),
    ),
  );
  try {
    _iconCache.set("_storage", await Assets.load("/assets/images/storage.png"));
  } catch {}

  _storageRoot = new Container();
  _storageRoot.x = 16;
  _layerHUD.addChild(_storageRoot);

  _storageBg = new Graphics();
  _storageRoot.addChild(_storageBg);

  const header = new Container();
  header.x = 14;
  header.y = 12;
  _storageRoot.addChild(header);

  if (_iconCache.has("_storage")) {
    const si = new Sprite(_iconCache.get("_storage"));
    si.width = si.height = 24;
    header.addChild(si);
  }

  const ht = new Text({
    text: "Storage",
    style: {
      fill: "#ffd700",
      fontSize: 20,
      fontWeight: "700",
      fontFamily: "'Segoe UI', sans-serif",
    },
  });
  ht.x = 30;
  ht.y = 2;
  header.addChild(ht);

  _storageBody = new Container();
  _storageBody.x = 14;
  _storageBody.y = 52;
  _storageRoot.addChild(_storageBody);

  updateStoragePanel({});
}

export function updateStoragePanel(storage) {
  if (!_storageBody) return;
  _storageBody.removeChildren();

  const items = Object.entries(storage).filter(([, v]) => v > 0);
  let y = 0;

  if (items.length === 0) {
    const empty = new Text({
      text: "Empty",
      style: {
        fill: "#ffd700",
        fontSize: 22,
        fontStyle: "italic",
        fontFamily: "'Segoe UI', sans-serif",
      },
    });
    _storageBody.addChild(empty);
    y = 32;
  } else {
    for (const [key, count] of items) {
      const row = new Container();
      row.y = y;
      if (_iconCache.has(key)) {
        const ic = new Sprite(_iconCache.get(key));
        ic.width = ic.height = 36;
        row.addChild(ic);
      }
      const ct = new Text({
        text: `×${count}`,
        style: {
          fill: "#ffd700",
          fontSize: 26,
          fontWeight: "700",
          fontFamily: "'Segoe UI', sans-serif",
        },
      });
      ct.x = 44;
      ct.y = 4;
      row.addChild(ct);
      _storageBody.addChild(row);
      y += 44;
    }
  }

  const panelW = 170;
  _storagePanelH = 14 + 22 + 6 + y + 12;
  _storageBg.clear();
  _storageBg
    .roundRect(0, 0, panelW, _storagePanelH, 18)
    .fill({ color: 0x0a0a1a, alpha: 0.82 })
    .stroke({ color: 0xffffff, width: 1, alpha: 0.14 });
  _storageRoot.y = window.innerHeight - _storagePanelH - 16;
}

const _labels = new Map();
let _pulseT = 0;

export function initGrowthLabels() {
  app.ticker.add((t) => {
    _pulseT += t.deltaTime / 60;
    const a = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(_pulseT * Math.PI * 2 * 0.8));
    for (const c of _labels.values()) {
      if (c._isReady && c._readyText) c._readyText.alpha = a;
    }
  });
}

export function hasGrowthLabel(key) {
  return _labels.has(key);
}

export function createGrowthLabel(key) {
  if (_labels.has(key)) removeGrowthLabel(key);
  const c = new Container();
  c._bg = new Graphics();
  c._readyText = new Text({
    text: "",
    style: {
      fill: "#44ff88",
      fontSize: 13,
      fontWeight: "700",
      fontFamily: "'Segoe UI', sans-serif",
    },
  });
  c._readyText.visible = false;
  c._barBg = new Graphics();
  c._barFill = new Graphics();
  c._isReady = false;
  c.addChild(c._bg, c._barBg, c._barFill, c._readyText);
  _layerGrowth.addChild(c);
  _labels.set(key, c);
}

export function updateGrowthLabel(key, isReady, progress, isCrop) {
  const c = _labels.get(key);
  if (!c) return;
  c._isReady = isReady;

  c._bg.clear();
  c._bg
    .roundRect(-34, -28, 68, 26, 10)
    .fill({ color: 0x000000, alpha: 0.72 })
    .stroke({ color: 0xffffff, width: 1, alpha: 0.18 });

  if (isReady) {
    c._readyText.text = isCrop ? "Harvest!" : "Collect!";
    c._readyText.visible = true;
    c._readyText.x = -c._readyText.width / 2;
    c._readyText.y = -24;
    c._barBg.visible = false;
    c._barFill.visible = false;
  } else {
    c._readyText.visible = false;
    c._barBg.clear();
    c._barBg
      .roundRect(-28, -17, 56, 6, 3)
      .fill({ color: 0xffffff, alpha: 0.15 });
    c._barBg.visible = true;
    c._barFill.clear();
    const fw = Math.max(2, progress * 56);
    c._barFill
      .roundRect(-28, -17, fw, 6, 3)
      .fill({ color: 0x56ab2f, alpha: 1 });
    c._barFill.visible = true;
  }
}

export function removeGrowthLabel(key) {
  const c = _labels.get(key);
  if (!c) return;
  _layerGrowth.removeChild(c);
  c.destroy({ children: true });
  _labels.delete(key);
}

export function positionGrowthLabel(key, sx, sy) {
  const c = _labels.get(key);
  if (c) {
    c.x = sx;
    c.y = sy;
  }
}

let _infoBtn;
let _settingsBtn;

export function createButtons(onInfo, onSettings) {
  _infoBtn = _makeIconButton("ℹ", 16, 16, onInfo);
  _layerHUD.addChild(_infoBtn);

  _settingsBtn = _makeIconButton("⚙", 16, 74, onSettings);
  _layerHUD.addChild(_settingsBtn);
}

function _makeIconButton(glyph, bx, by, onClick) {
  const SIZE = 48;
  const btn = new Container();
  btn.x = bx;
  btn.y = by;
  btn.eventMode = "static";
  btn.cursor = "pointer";
  btn.hitArea = new Rectangle(0, 0, SIZE, SIZE);

  const bg = new Graphics();
  bg.roundRect(0, 0, SIZE, SIZE, 24)
    .fill({ color: 0x000000, alpha: 0.65 })
    .stroke({ color: 0xffffff, width: 1, alpha: 0.22 });
  btn.addChild(bg);

  const label = new Text({
    text: glyph,
    style: {
      fill: "#ffd700",
      fontSize: 22,
      fontWeight: "700",
      fontFamily: "'Segoe UI', sans-serif",
    },
  });
  label.x = SIZE / 2 - label.width / 2;
  label.y = SIZE / 2 - label.height / 2;
  btn.addChild(label);

  btn.on("pointerdown", (e) => {
    e.nativeEvent.stopPropagation();
    onClick();
  });
  btn.on("pointerover", () => {
    bg.clear();
    bg.roundRect(0, 0, SIZE, SIZE, 24)
      .fill({ color: 0x1a1a1a, alpha: 0.88 })
      .stroke({ color: 0xffd700, width: 1, alpha: 0.5 });
  });
  btn.on("pointerout", () => {
    bg.clear();
    bg.roundRect(0, 0, SIZE, SIZE, 24)
      .fill({ color: 0x000000, alpha: 0.65 })
      .stroke({ color: 0xffffff, width: 1, alpha: 0.22 });
  });

  return btn;
}

let _shopModalOpen = false;
let _infoModalOpen = false;
let _settingsModalOpen = false;

export function isAnyModalOpen() {
  return _shopModalOpen || _infoModalOpen || _settingsModalOpen;
}

let _backdrop;

function _ensureBackdrop(onClose) {
  if (_backdrop) {
    _layerModal.removeChild(_backdrop);
    _backdrop.destroy({ children: true });
    _backdrop = null;
  }
  _backdrop = new Graphics();
  _backdrop
    .rect(0, 0, window.innerWidth, window.innerHeight)
    .fill({ color: 0x000000, alpha: 0.6 });
  _backdrop.eventMode = "static";
  _backdrop.cursor = "default";
  _backdrop.hitArea = new Rectangle(
    0,
    0,
    window.innerWidth,
    window.innerHeight,
  );
  _backdrop.on("pointerdown", (e) => {
    e.nativeEvent.stopPropagation();
    onClose();
  });
  _layerModal.addChild(_backdrop);
}

function _removeBackdrop() {
  if (_backdrop) {
    _layerModal.removeChild(_backdrop);
    _backdrop.destroy({ children: true });
    _backdrop = null;
  }
}

let _shopModal;
let _shopCards = [];
let _shopClearBtn, _shopClearBtnBg;
let _shopCallbacks = {};
let _shopItemDefs = [];
let _shopCropDefs = {};
let _shopAnimalDefs = {};

export async function buildShopModal(
  itemDefs,
  cropDefs,
  animalDefs,
  callbacks,
) {
  _shopCallbacks = callbacks;
  _shopItemDefs = itemDefs;
  _shopCropDefs = cropDefs;
  _shopAnimalDefs = animalDefs;

  _shopModal = new Container();
  _shopModal.visible = false;
  _layerModal.addChild(_shopModal);

  const MODAL_W = 520;
  const MODAL_H = 460;
  const COLS = 3;
  const CARD_W = 155;
  const CARD_H = 148;
  const GAP = 10;
  const PAD = 16;

  const mx = Math.floor((window.innerWidth - MODAL_W) / 2);
  const my = Math.floor((window.innerHeight - MODAL_H) / 2);
  _shopModal.x = mx;
  _shopModal.y = my;

  const bg = new Graphics();
  bg.roundRect(0, 0, MODAL_W, MODAL_H, 20)
    .fill({ color: 0x1a1a2e, alpha: 1 })
    .stroke({ color: 0xffffff, width: 1, alpha: 0.1 });
  _shopModal.addChild(bg);

  const headerBg = new Graphics();
  headerBg.rect(0, 0, MODAL_W, 56).fill({ color: 0x1a1a2e, alpha: 1 });
  headerBg
    .moveTo(0, 56)
    .lineTo(MODAL_W, 56)
    .stroke({ color: 0xffffff, width: 1, alpha: 0.08 });
  _shopModal.addChild(headerBg);

  const title = new Text({
    text: "🌾 Farm Shop",
    style: {
      fill: "#ffd700",
      fontSize: 18,
      fontWeight: "700",
      fontFamily: "'Segoe UI', sans-serif",
    },
  });
  title.x = 20;
  title.y = 16;
  _shopModal.addChild(title);

  const closeBtn = _makeCloseButton(() => {
    hideShopModal();
    if (_shopCallbacks.onClose) _shopCallbacks.onClose();
  });
  closeBtn.x = MODAL_W - 46;
  closeBtn.y = 13;
  _shopModal.addChild(closeBtn);

  _shopCards = [];
  const gridContainer = new Container();
  gridContainer.x = PAD;
  gridContainer.y = 66;
  _shopModal.addChild(gridContainer);

  for (let i = 0; i < itemDefs.length; i++) {
    const def = itemDefs[i];
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const cx = col * (CARD_W + GAP);
    const cy = row * (CARD_H + GAP);

    const cardRoot = new Container();
    cardRoot.x = cx;
    cardRoot.y = cy;
    cardRoot.eventMode = "static";
    cardRoot.cursor = "pointer";
    cardRoot.hitArea = new Rectangle(0, 0, CARD_W, CARD_H);

    const cardBg = new Graphics();
    cardBg
      .roundRect(0, 0, CARD_W, CARD_H, 14)
      .fill({ color: 0xffffff, alpha: 0.05 })
      .stroke({ color: 0xffffff, width: 1.5, alpha: 0.1 });
    cardRoot.addChild(cardBg);

    const iconY = 16;
    if (_iconCache.has(def.key)) {
      const ic = new Sprite(_iconCache.get(def.key));
      ic.width = ic.height = 52;
      ic.x = (CARD_W - 52) / 2;
      ic.y = iconY;
      cardRoot.addChild(ic);
    }

    const nameLabel = new Text({
      text: def.label,
      style: {
        fill: "#ffffff",
        fontSize: 14,
        fontWeight: "700",
        fontFamily: "'Segoe UI', sans-serif",
      },
    });
    nameLabel.x = CARD_W / 2 - nameLabel.width / 2;
    nameLabel.y = 76;
    cardRoot.addChild(nameLabel);

    const priceBg = new Graphics();
    const priceText = new Text({
      text: `${def.price} 🪙`,
      style: {
        fill: "#ffd700",
        fontSize: 12,
        fontWeight: "700",
        fontFamily: "'Segoe UI', sans-serif",
      },
    });
    const pw = priceText.width + 18;
    priceBg
      .roundRect(0, 0, pw, 22, 11)
      .fill({ color: 0xffd700, alpha: 0.12 })
      .stroke({ color: 0xffd700, width: 1, alpha: 0.35 });
    priceBg.x = (CARD_W - pw) / 2;
    priceBg.y = 98;
    priceText.x = (CARD_W - priceText.width) / 2;
    priceText.y = 99;
    cardRoot.addChild(priceBg, priceText);

    const detail = _cardDetail(def, cropDefs, animalDefs);
    const detailLabel = new Text({
      text: detail,
      style: {
        fill: "rgba(255,255,255,0.4)",
        fontSize: 11,
        fontFamily: "'Segoe UI', sans-serif",
      },
    });
    detailLabel.x = CARD_W / 2 - detailLabel.width / 2;
    detailLabel.y = 126;
    cardRoot.addChild(detailLabel);

    const checkmark = new Text({
      text: "✓",
      style: {
        fill: "#ffd700",
        fontSize: 14,
        fontWeight: "900",
        fontFamily: "'Segoe UI', sans-serif",
      },
    });
    checkmark.x = CARD_W - 22;
    checkmark.y = 8;
    checkmark.visible = false;
    cardRoot.addChild(checkmark);

    const key = def.key;
    cardRoot.on("pointerdown", (e) => {
      e.nativeEvent.stopPropagation();
      if (_shopCallbacks.onSelect) _shopCallbacks.onSelect(key);
    });
    cardRoot.on("pointerover", () => {
      if (cardRoot._cantAfford || cardRoot._isActive) return;
      cardBg.clear();
      cardBg
        .roundRect(0, 0, CARD_W, CARD_H, 14)
        .fill({ color: 0xffffff, alpha: 0.09 })
        .stroke({ color: 0xffd700, width: 1.5, alpha: 0.45 });
    });
    cardRoot.on("pointerout", () => {
      if (cardRoot._isActive) return;
      cardBg.clear();
      cardBg
        .roundRect(0, 0, CARD_W, CARD_H, 14)
        .fill({ color: 0xffffff, alpha: cardRoot._cantAfford ? 0.02 : 0.05 })
        .stroke({ color: 0xffffff, width: 1.5, alpha: 0.1 });
    });

    cardRoot._isActive = false;
    cardRoot._cantAfford = false;
    gridContainer.addChild(cardRoot);
    _shopCards.push({ key, cardRoot, cardBg, checkmark, nameLabel });
  }

  const clearBtnH = 42;
  const clearBtnY = MODAL_H - clearBtnH - 14;
  _shopClearBtn = new Container();
  _shopClearBtn.x = PAD;
  _shopClearBtn.y = clearBtnY;
  _shopClearBtn.eventMode = "static";
  _shopClearBtn.cursor = "pointer";
  _shopClearBtn.hitArea = new Rectangle(0, 0, MODAL_W - PAD * 2, clearBtnH);
  _shopModal.addChild(_shopClearBtn);

  _shopClearBtnBg = new Graphics();
  _shopClearBtnBg
    .roundRect(0, 0, MODAL_W - PAD * 2, clearBtnH, 12)
    .fill({ color: 0xf44336, alpha: 0.12 })
    .stroke({ color: 0xf44336, width: 1, alpha: 0.35 });
  _shopClearBtn.addChild(_shopClearBtnBg);

  const clearLabel = new Text({
    text: "🗑 Clear Cell",
    style: {
      fill: "#ff7070",
      fontSize: 13,
      fontWeight: "600",
      fontFamily: "'Segoe UI', sans-serif",
    },
  });
  clearLabel.x = (MODAL_W - PAD * 2) / 2 - clearLabel.width / 2;
  clearLabel.y = (clearBtnH - clearLabel.height) / 2;
  _shopClearBtn.addChild(clearLabel);

  _shopClearBtn.on("pointerdown", (e) => {
    e.nativeEvent.stopPropagation();
    if (_shopCallbacks.onClear) _shopCallbacks.onClear();
  });
  _shopClearBtn.on("pointerover", () => {
    _shopClearBtnBg.clear();
    _shopClearBtnBg
      .roundRect(0, 0, MODAL_W - PAD * 2, clearBtnH, 12)
      .fill({ color: 0xf44336, alpha: 0.28 })
      .stroke({ color: 0xf44336, width: 1, alpha: 0.5 });
  });
  _shopClearBtn.on("pointerout", () => {
    _shopClearBtnBg.clear();
    _shopClearBtnBg
      .roundRect(0, 0, MODAL_W - PAD * 2, clearBtnH, 12)
      .fill({ color: 0xf44336, alpha: 0.12 })
      .stroke({ color: 0xf44336, width: 1, alpha: 0.35 });
  });

  _repositionShopModal();
  window.addEventListener("resize", _repositionShopModal);
}

function _repositionShopModal() {
  if (!_shopModal) return;
  const MODAL_W = 520;
  const MODAL_H = 460;
  const scale = Math.min(1, (window.innerWidth - 16) / MODAL_W);
  _shopModal.scale.set(scale);
  _shopModal.x = Math.floor((window.innerWidth - MODAL_W * scale) / 2);
  _shopModal.y = Math.floor((window.innerHeight - MODAL_H * scale) / 2);
  if (_backdrop) {
    _backdrop.clear();
    _backdrop
      .rect(0, 0, window.innerWidth, window.innerHeight)
      .fill({ color: 0x000000, alpha: 0.6 });
    _backdrop.hitArea = new Rectangle(
      0,
      0,
      window.innerWidth,
      window.innerHeight,
    );
  }
}

export function showShopModal(currentKey, money) {
  if (!_shopModal) return;

  for (const card of _shopCards) {
    const def = _shopItemDefs.find((d) => d.key === card.key);
    if (!def) continue;

    const refund = _shopItemDefs.find((d) => d.key === currentKey)?.price ?? 0;
    const cost = Math.max(0, def.price - refund);
    const isActive = card.key === currentKey;
    const cantAfford = !isActive && money < cost;

    card.cardRoot._isActive = isActive;
    card.cardRoot._cantAfford = cantAfford;
    card.cardRoot.alpha = cantAfford ? 0.45 : 1.0;
    card.checkmark.visible = isActive;

    card.cardBg.clear();
    if (isActive) {
      card.cardBg
        .roundRect(0, 0, 155, 148, 14)
        .fill({ color: 0xffd700, alpha: 0.1 })
        .stroke({ color: 0xffd700, width: 2, alpha: 1 });
      card.nameLabel.style.fill = "#ffd700";
    } else {
      card.cardBg
        .roundRect(0, 0, 155, 148, 14)
        .fill({ color: 0xffffff, alpha: cantAfford ? 0.02 : 0.05 })
        .stroke({ color: 0xffffff, width: 1.5, alpha: 0.1 });
      card.nameLabel.style.fill = "#ffffff";
    }
  }

  _shopClearBtn.visible = currentKey !== null;

  _shopModalOpen = true;
  _shopModal.visible = true;
  _ensureBackdrop(() => {
    hideShopModal();
    if (_shopCallbacks.onClose) _shopCallbacks.onClose();
  });
  _layerModal.addChild(_shopModal);
}

export function hideShopModal() {
  if (!_shopModal) return;
  _shopModal.visible = false;
  _shopModalOpen = false;
  if (!_infoModalOpen) _removeBackdrop();
}

let _infoModal;

export function buildInfoModal(
  itemDefs,
  itemIcons,
  cropDefs,
  animalDefs,
  sellPrices,
) {
  const MODAL_W = 660;
  const MODAL_H = 560;
  const PAD = 20;

  _infoModal = new Container();
  _infoModal.visible = false;
  _layerModal.addChild(_infoModal);

  const mx = Math.floor((window.innerWidth - MODAL_W) / 2);
  const my = Math.floor((window.innerHeight - MODAL_H) / 2);
  _infoModal.x = mx;
  _infoModal.y = my;

  const bg = new Graphics();
  bg.roundRect(0, 0, MODAL_W, MODAL_H, 20)
    .fill({ color: 0x1a1a2e, alpha: 1 })
    .stroke({ color: 0xffffff, width: 1, alpha: 0.1 });
  _infoModal.addChild(bg);

  bg.eventMode = "static";
  bg.hitArea = new Rectangle(0, 0, MODAL_W, MODAL_H);
  bg.on("pointerdown", (e) => e.nativeEvent.stopPropagation());

  const headerBg = new Graphics();
  headerBg.rect(0, 0, MODAL_W, 56).fill({ color: 0x1a1a2e, alpha: 1 });
  headerBg
    .moveTo(0, 56)
    .lineTo(MODAL_W, 56)
    .stroke({ color: 0xffffff, width: 1, alpha: 0.08 });
  _infoModal.addChild(headerBg);

  const title = new Text({
    text: "📖 How to Play",
    style: {
      fill: "#ffd700",
      fontSize: 18,
      fontWeight: "700",
      fontFamily: "'Segoe UI', sans-serif",
    },
  });
  title.x = PAD;
  title.y = 16;
  _infoModal.addChild(title);

  const closeBtn = _makeCloseButton(() => hideInfoModal());
  closeBtn.x = MODAL_W - 46;
  closeBtn.y = 13;
  _infoModal.addChild(closeBtn);

  let curY = 66;

  curY = _addSectionTitle(_infoModal, "🎮 How to Play", PAD, curY);

  const steps = [
    "Click any cell on the grid to open the Farm Shop",
    "Buy crops (corn, tomato, strawberry) or animals (chicken, cow)",
    "Wait for crops to grow or animals to produce items",
    "Click glowing green cells to harvest or collect products",
    "Cars arrive and request items — sell from storage to earn coins",
  ];

  for (let i = 0; i < steps.length; i++) {
    const row = new Container();
    row.x = PAD;
    row.y = curY;

    const circle = new Graphics();
    circle
      .roundRect(0, 0, 22, 22, 11)
      .fill({ color: 0xffd700, alpha: 0.18 })
      .stroke({ color: 0xffd700, width: 1, alpha: 0.4 });
    row.addChild(circle);

    const num = new Text({
      text: String(i + 1),
      style: {
        fill: "#ffd700",
        fontSize: 11,
        fontWeight: "700",
        fontFamily: "'Segoe UI', sans-serif",
      },
    });
    num.x = 11 - num.width / 2;
    num.y = 11 - num.height / 2;
    row.addChild(num);

    const stepText = new Text({
      text: steps[i],
      style: {
        fill: "rgba(255,255,255,0.85)",
        fontSize: 13,
        fontFamily: "'Segoe UI', sans-serif",
        wordWrap: true,
        wordWrapWidth: MODAL_W - PAD * 2 - 34,
      },
    });
    stepText.x = 32;
    stepText.y = 3;
    row.addChild(stepText);

    _infoModal.addChild(row);
    curY += 28;
  }

  curY += 10;

  const colW = (MODAL_W - PAD * 2 - 12) / 2;

  const buyCard = _makeInfoCard(PAD, curY, colW, "🛒 Buy prices");
  _infoModal.addChild(buyCard.container);
  let cardY = buyCard.contentY;
  for (const def of itemDefs) {
    cardY = _addInfoRow(
      buyCard.container,
      def.key,
      def.label,
      `${def.price} 🪙`,
      colW,
      cardY,
    );
  }
  _resizeCard(buyCard, cardY + 10);

  const sellCard = _makeInfoCard(PAD + colW + 12, curY, colW, "🚗 Sell prices");
  _infoModal.addChild(sellCard.container);
  cardY = sellCard.contentY;
  for (const [key, price] of Object.entries(sellPrices)) {
    const label = key[0].toUpperCase() + key.slice(1);
    cardY = _addInfoRow(
      sellCard.container,
      key,
      label,
      `${price} 🪙`,
      colW,
      cardY,
    );
  }
  _resizeCard(sellCard, cardY + 10);

  const rowH1 = Math.max(buyCard.container.height, sellCard.container.height);
  curY += rowH1 + 12;

  const timesCard = _makeInfoCard(PAD, curY, colW, "⏱ Grow / Produce Times");
  _infoModal.addChild(timesCard.container);
  cardY = timesCard.contentY;
  for (const def of itemDefs) {
    if (def.key in cropDefs) {
      cardY = _addInfoRow(
        timesCard.container,
        def.key,
        def.label,
        `${cropDefs[def.key].productionTime}s`,
        colW,
        cardY,
      );
    } else if (def.key in animalDefs) {
      const prod = animalDefs[def.key].product;
      cardY = _addInfoRow(
        timesCard.container,
        def.key,
        `${def.label} → ${prod}`,
        `${animalDefs[def.key].productionTime}s`,
        colW,
        cardY,
      );
    }
  }
  _resizeCard(timesCard, cardY + 10);

  const ctrlCard = _makeInfoCard(PAD + colW + 12, curY, colW, "🖱 Controls");
  _infoModal.addChild(ctrlCard.container);
  cardY = ctrlCard.contentY;
  const ctrlList = [
    ["Scroll", "Zoom in / out"],
    ["Right-drag", "Rotate camera"],
    ["Click cell", "Open Farm Shop"],
    ["Green cell", "Harvest / collect"],
    ["Backdrop", "Close any panel"],
  ];
  for (const [k, v] of ctrlList) {
    cardY = _addCtrlRow(ctrlCard.container, k, v, colW, cardY);
  }
  _resizeCard(ctrlCard, cardY + 10);

  const rowH2 = Math.max(timesCard.container.height, ctrlCard.container.height);
  curY += rowH2 + 12;

  const tipBg = new Graphics();
  const tipW = MODAL_W - PAD * 2;
  const tipText = new Text({
    text: "💡 Tip: Keep a mix of fast crops (corn 8s) and high-value items (strawberry 18🪙, milk 20🪙). Cars want random combinations — more variety = more deals closed!",
    style: {
      fill: "rgba(255,255,255,0.72)",
      fontSize: 12,
      fontFamily: "'Segoe UI', sans-serif",
      wordWrap: true,
      wordWrapWidth: tipW - 24,
    },
  });
  tipBg
    .roundRect(0, 0, tipW, tipText.height + 22, 12)
    .fill({ color: 0xffd700, alpha: 0.06 })
    .stroke({ color: 0xffd700, width: 1, alpha: 0.2 });
  tipBg.x = PAD;
  tipBg.y = curY;
  tipText.x = PAD + 12;
  tipText.y = curY + 11;
  _infoModal.addChild(tipBg, tipText);

  _repositionInfoModal();
  window.addEventListener("resize", _repositionInfoModal);
}

function _repositionInfoModal() {
  if (!_infoModal) return;
  const MODAL_W = 660;
  const MODAL_H = 560;
  const scale = Math.min(1, (window.innerWidth - 16) / MODAL_W);
  _infoModal.scale.set(scale);
  _infoModal.x = Math.floor((window.innerWidth - MODAL_W * scale) / 2);
  _infoModal.y = Math.floor((window.innerHeight - MODAL_H * scale) / 2);
  if (_backdrop) {
    _backdrop.clear();
    _backdrop
      .rect(0, 0, window.innerWidth, window.innerHeight)
      .fill({ color: 0x000000, alpha: 0.6 });
    _backdrop.hitArea = new Rectangle(
      0,
      0,
      window.innerWidth,
      window.innerHeight,
    );
  }
}

let _settingsModal;
let _settingsConfirmMode = false;
let _settingsResetBtnBg;
let _settingsResetLabel;

export function buildSettingsModal(onReset, onMute, initialMuted = false) {
  const MODAL_W = 320;
  const MODAL_H = 248;

  _settingsModal = new Container();
  _settingsModal.visible = false;
  _layerModal.addChild(_settingsModal);

  const bg = new Graphics();
  bg.roundRect(0, 0, MODAL_W, MODAL_H, 20)
    .fill({ color: 0x1a1a2e, alpha: 1 })
    .stroke({ color: 0xffffff, width: 1, alpha: 0.1 });
  _settingsModal.addChild(bg);

  const headerBg = new Graphics();
  headerBg.rect(0, 0, MODAL_W, 56).fill({ color: 0x1a1a2e, alpha: 1 });
  headerBg
    .moveTo(0, 56)
    .lineTo(MODAL_W, 56)
    .stroke({ color: 0xffffff, width: 1, alpha: 0.08 });
  _settingsModal.addChild(headerBg);

  const title = new Text({
    text: "⚙ Settings",
    style: {
      fill: "#ffd700",
      fontSize: 18,
      fontWeight: "700",
      fontFamily: "'Segoe UI', sans-serif",
    },
  });
  title.x = 20;
  title.y = 16;
  _settingsModal.addChild(title);

  const closeBtn = _makeCloseButton(() => hideSettingsModal());
  closeBtn.x = MODAL_W - 46;
  closeBtn.y = 13;
  _settingsModal.addChild(closeBtn);

  // Mute toggle row
  const BTN_W = MODAL_W - 40;
  const ROW_H = 44;

  let _mutedState = initialMuted;
  const muteRow = new Container();
  muteRow.x = 20;
  muteRow.y = 68;
  muteRow.eventMode = "static";
  muteRow.cursor = "pointer";
  muteRow.hitArea = new Rectangle(0, 0, BTN_W, ROW_H);
  _settingsModal.addChild(muteRow);

  const muteRowBg = new Graphics();
  muteRowBg
    .roundRect(0, 0, BTN_W, ROW_H, 12)
    .fill({ color: 0xffffff, alpha: 0.04 })
    .stroke({ color: 0xffffff, width: 1, alpha: 0.08 });
  muteRow.addChild(muteRowBg);

  const muteIconLabel = new Text({
    text: "🎵 Music",
    style: {
      fill: "#ffffff",
      fontSize: 13,
      fontFamily: "'Segoe UI', sans-serif",
    },
  });
  muteIconLabel.x = 14;
  muteIconLabel.y = ROW_H / 2 - muteIconLabel.height / 2;
  muteRow.addChild(muteIconLabel);

  const muteToggleBg = new Graphics();
  const muteToggleLabel = new Text({
    text: _mutedState ? "🔇 Off" : "🔊 On",
    style: {
      fill: _mutedState ? "#ff8888" : "#88ff88",
      fontSize: 12,
      fontWeight: "700",
      fontFamily: "'Segoe UI', sans-serif",
    },
  });

  function _drawMuteToggle() {
    const tw = muteToggleLabel.width + 20;
    muteToggleBg.clear();
    muteToggleBg
      .roundRect(0, 0, tw, 26, 8)
      .fill({ color: _mutedState ? 0xf44336 : 0x44cc66, alpha: 0.18 })
      .stroke({
        color: _mutedState ? 0xf44336 : 0x44cc66,
        width: 1,
        alpha: 0.5,
      });
    muteToggleBg.x = BTN_W - tw - 10;
    muteToggleBg.y = ROW_H / 2 - 13;
    muteToggleLabel.x = BTN_W - muteToggleLabel.width - 20;
    muteToggleLabel.y = ROW_H / 2 - muteToggleLabel.height / 2;
    muteToggleLabel.style.fill = _mutedState ? "#ff8888" : "#88ff88";
  }

  muteRow.addChild(muteToggleBg);
  muteRow.addChild(muteToggleLabel);
  _drawMuteToggle();

  muteRow.on("pointerdown", (e) => {
    e.nativeEvent.stopPropagation();
    _mutedState = onMute();
    muteToggleLabel.text = _mutedState ? "🔇 Off" : "🔊 On";
    _drawMuteToggle();
  });
  muteRow.on("pointerover", () => {
    muteRowBg.clear();
    muteRowBg
      .roundRect(0, 0, BTN_W, ROW_H, 12)
      .fill({ color: 0xffffff, alpha: 0.09 })
      .stroke({ color: 0xffd700, width: 1, alpha: 0.3 });
  });
  muteRow.on("pointerout", () => {
    muteRowBg.clear();
    muteRowBg
      .roundRect(0, 0, BTN_W, ROW_H, 12)
      .fill({ color: 0xffffff, alpha: 0.04 })
      .stroke({ color: 0xffffff, width: 1, alpha: 0.08 });
  });

  // Reset button
  const BTN_H = 44;
  const resetBtn = new Container();
  resetBtn.x = 20;
  resetBtn.y = 126;
  resetBtn.eventMode = "static";
  resetBtn.cursor = "pointer";
  resetBtn.hitArea = new Rectangle(0, 0, BTN_W, BTN_H);
  _settingsModal.addChild(resetBtn);

  _settingsResetBtnBg = new Graphics();
  _settingsResetBtnBg
    .roundRect(0, 0, BTN_W, BTN_H, 12)
    .fill({ color: 0xf44336, alpha: 0.15 })
    .stroke({ color: 0xf44336, width: 1, alpha: 0.4 });
  resetBtn.addChild(_settingsResetBtnBg);

  _settingsResetLabel = new Text({
    text: "🗑 Reset Farm",
    style: {
      fill: "#ff7070",
      fontSize: 14,
      fontWeight: "700",
      fontFamily: "'Segoe UI', sans-serif",
    },
  });
  _settingsResetLabel.x = BTN_W / 2 - _settingsResetLabel.width / 2;
  _settingsResetLabel.y = BTN_H / 2 - _settingsResetLabel.height / 2;
  resetBtn.addChild(_settingsResetLabel);

  const warnText = new Text({
    text: "All progress will be lost.",
    style: {
      fill: "rgba(255,255,255,0.35)",
      fontSize: 11,
      fontFamily: "'Segoe UI', sans-serif",
    },
  });
  warnText.x = MODAL_W / 2 - warnText.width / 2;
  warnText.y = 196;
  _settingsModal.addChild(warnText);

  resetBtn.on("pointerdown", (e) => {
    e.nativeEvent.stopPropagation();
    if (!_settingsConfirmMode) {
      _settingsConfirmMode = true;
      _settingsResetLabel.text = "⚠ Confirm Reset?";
      _settingsResetLabel.x = BTN_W / 2 - _settingsResetLabel.width / 2;
      _settingsResetBtnBg.clear();
      _settingsResetBtnBg
        .roundRect(0, 0, BTN_W, BTN_H, 12)
        .fill({ color: 0xf44336, alpha: 0.45 })
        .stroke({ color: 0xf44336, width: 2, alpha: 0.9 });
    } else {
      onReset();
    }
  });
  resetBtn.on("pointerover", () => {
    if (_settingsConfirmMode) return;
    _settingsResetBtnBg.clear();
    _settingsResetBtnBg
      .roundRect(0, 0, BTN_W, BTN_H, 12)
      .fill({ color: 0xf44336, alpha: 0.28 })
      .stroke({ color: 0xf44336, width: 1, alpha: 0.5 });
  });
  resetBtn.on("pointerout", () => {
    if (_settingsConfirmMode) return;
    _settingsResetBtnBg.clear();
    _settingsResetBtnBg
      .roundRect(0, 0, BTN_W, BTN_H, 12)
      .fill({ color: 0xf44336, alpha: 0.15 })
      .stroke({ color: 0xf44336, width: 1, alpha: 0.4 });
  });

  _repositionSettingsModal();
  window.addEventListener("resize", _repositionSettingsModal);
}

function _repositionSettingsModal() {
  if (!_settingsModal) return;
  const MODAL_W = 320;
  const MODAL_H = 248;
  const scale = Math.min(1, (window.innerWidth - 16) / MODAL_W);
  _settingsModal.scale.set(scale);
  _settingsModal.x = Math.floor((window.innerWidth - MODAL_W * scale) / 2);
  _settingsModal.y = Math.floor((window.innerHeight - MODAL_H * scale) / 2);
  if (_backdrop) {
    _backdrop.clear();
    _backdrop
      .rect(0, 0, window.innerWidth, window.innerHeight)
      .fill({ color: 0x000000, alpha: 0.6 });
    _backdrop.hitArea = new Rectangle(
      0,
      0,
      window.innerWidth,
      window.innerHeight,
    );
  }
}

export function showSettingsModal() {
  if (!_settingsModal) return;
  _settingsConfirmMode = false;
  if (_settingsResetLabel) {
    _settingsResetLabel.text = "🗑 Reset Farm";
    _settingsResetLabel.x = 280 / 2 - _settingsResetLabel.width / 2;
  }
  if (_settingsResetBtnBg) {
    _settingsResetBtnBg.clear();
    _settingsResetBtnBg
      .roundRect(0, 0, 280, 44, 12)
      .fill({ color: 0xf44336, alpha: 0.15 })
      .stroke({ color: 0xf44336, width: 1, alpha: 0.4 });
  }
  _settingsModalOpen = true;
  _settingsModal.visible = true;
  _ensureBackdrop(() => hideSettingsModal());
  _layerModal.addChild(_settingsModal);
}

export function hideSettingsModal() {
  if (!_settingsModal) return;
  _settingsModal.visible = false;
  _settingsModalOpen = false;
  if (!_shopModalOpen && !_infoModalOpen) _removeBackdrop();
}

export function showInfoModal() {
  if (!_infoModal) return;
  _infoModalOpen = true;
  _infoModal.visible = true;
  _ensureBackdrop(() => hideInfoModal());
  _layerModal.addChild(_infoModal);
}

export function hideInfoModal() {
  if (!_infoModal) return;
  _infoModal.visible = false;
  _infoModalOpen = false;
  if (!_shopModalOpen) _removeBackdrop();
}

function _addSectionTitle(parent, text, x, y) {
  const t = new Text({
    text,
    style: {
      fill: "rgba(255,255,255,0.45)",
      fontSize: 10,
      fontWeight: "700",
      fontFamily: "'Segoe UI', sans-serif",
      letterSpacing: 1.4,
    },
  });
  t.x = x;
  t.y = y;
  parent.addChild(t);
  return y + t.height + 8;
}

function _makeInfoCard(x, y, w, title) {
  const container = new Container();
  container.x = x;
  container.y = y;

  const cardBg = new Graphics();
  cardBg
    .roundRect(0, 0, w, 60, 14)
    .fill({ color: 0xffffff, alpha: 0.04 })
    .stroke({ color: 0xffffff, width: 1, alpha: 0.08 });
  container.addChild(cardBg);
  container._cardBg = cardBg;
  container._cardW = w;

  const titleT = new Text({
    text: title,
    style: {
      fill: "rgba(255,255,255,0.45)",
      fontSize: 10,
      fontWeight: "700",
      fontFamily: "'Segoe UI', sans-serif",
    },
  });
  titleT.x = 12;
  titleT.y = 10;
  container.addChild(titleT);

  return { container, contentY: titleT.height + 18 };
}

function _resizeCard(cardObj, newH) {
  const { container } = cardObj;
  const w = container._cardW;
  container._cardBg.clear();
  container._cardBg
    .roundRect(0, 0, w, newH, 14)
    .fill({ color: 0xffffff, alpha: 0.04 })
    .stroke({ color: 0xffffff, width: 1, alpha: 0.08 });
}

function _addInfoRow(parent, key, label, value, cardW, y) {
  const row = new Container();
  row.y = y;

  if (_iconCache.has(key)) {
    const ic = new Sprite(_iconCache.get(key));
    ic.width = ic.height = 18;
    ic.x = 12;
    ic.y = 0;
    row.addChild(ic);
  }

  const nameT = new Text({
    text: label,
    style: {
      fill: "rgba(255,255,255,0.85)",
      fontSize: 12,
      fontFamily: "'Segoe UI', sans-serif",
    },
  });
  nameT.x = 36;
  nameT.y = 1;
  row.addChild(nameT);

  const valT = new Text({
    text: value,
    style: {
      fill: "#ffd700",
      fontSize: 12,
      fontWeight: "700",
      fontFamily: "'Segoe UI', sans-serif",
    },
  });
  valT.x = cardW - 12 - valT.width;
  valT.y = 1;
  row.addChild(valT);

  parent.addChild(row);
  return y + 22;
}

function _addCtrlRow(parent, key, desc, cardW, y) {
  const row = new Container();
  row.y = y;

  const keyBg = new Graphics();
  const keyT = new Text({
    text: key,
    style: {
      fill: "#ffd700",
      fontSize: 11,
      fontWeight: "600",
      fontFamily: "'Segoe UI', sans-serif",
    },
  });
  const kw = keyT.width + 16;
  keyBg
    .roundRect(0, 0, kw, 20, 6)
    .fill({ color: 0xffd700, alpha: 0.12 })
    .stroke({ color: 0xffd700, width: 1, alpha: 0.3 });
  keyBg.x = 12;
  keyT.x = 12 + (kw - keyT.width) / 2;
  keyT.y = 2;
  row.addChild(keyBg, keyT);

  const descT = new Text({
    text: desc,
    style: {
      fill: "rgba(255,255,255,0.75)",
      fontSize: 12,
      fontFamily: "'Segoe UI', sans-serif",
    },
  });
  descT.x = 12 + kw + 10;
  descT.y = 2;
  row.addChild(descT);

  parent.addChild(row);
  return y + 26;
}

function _makeCloseButton(onClick) {
  const btn = new Container();
  btn.eventMode = "static";
  btn.cursor = "pointer";
  btn.hitArea = new Rectangle(0, 0, 30, 30);

  const bg = new Graphics();
  bg.roundRect(0, 0, 30, 30, 15).fill({ color: 0xffffff, alpha: 0.1 });
  btn.addChild(bg);

  const x = new Text({
    text: "✕",
    style: {
      fill: "#ffffff",
      fontSize: 14,
      fontFamily: "'Segoe UI', sans-serif",
    },
  });
  x.x = 15 - x.width / 2;
  x.y = 15 - x.height / 2;
  btn.addChild(x);

  btn.on("pointerdown", (e) => {
    e.nativeEvent.stopPropagation();
    onClick();
  });
  btn.on("pointerover", () => {
    bg.clear();
    bg.roundRect(0, 0, 30, 30, 15).fill({ color: 0xffffff, alpha: 0.22 });
  });
  btn.on("pointerout", () => {
    bg.clear();
    bg.roundRect(0, 0, 30, 30, 15).fill({ color: 0xffffff, alpha: 0.1 });
  });

  return btn;
}

function _cardDetail(def, cropDefs, animalDefs) {
  if (def.key in cropDefs)
    return `Grows in ${cropDefs[def.key].productionTime}s`;
  if (def.key in animalDefs) {
    const prod = animalDefs[def.key].product;
    return `${prod[0].toUpperCase() + prod.slice(1)} every ${animalDefs[def.key].productionTime}s`;
  }
  return "";
}

window.addEventListener("resize", () => {
  if (_moneyLabel) updateMoneyHUD(parseInt(_moneyLabel.text) || 0);
  if (_storageRoot && _storagePanelH)
    _storageRoot.y = window.innerHeight - _storagePanelH - 16;
});

window.addEventListener("orientationchange", () => {
  setTimeout(() => {
    if (_moneyLabel) updateMoneyHUD(parseInt(_moneyLabel.text) || 0);
    if (_storageRoot && _storagePanelH)
      _storageRoot.y = window.innerHeight - _storagePanelH - 16;
    _repositionShopModal();
    _repositionInfoModal();
  }, 300);
});
