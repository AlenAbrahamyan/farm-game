export const state = {
  coins: 50,
  day: 1,
  inventory: {
    egg: 0,
    milk: 0,
    carrot: 0,
    corn: 0,
    strawberry: 0,
  },
  market: {
    available: {
      egg: 0,
      milk: 0,
      carrot: 0,
      corn: 0,
      strawberry: 0,
    },
  },
  plots: [],
  animals: [],
  carQueue: [],
  gridSize: 3,
  totalAnimals: 0,
};

export const PRICES = {
  chicken: 30,
  cow: 80,
  carrot: 5,
  corn: 3,
  strawberry: 8,
  expand_4: 100,
  expand_5: 250,

  egg: 6,
  milk: 10,
  carrot_sell: 8,
  corn_sell: 5,
  strawberry_sell: 15,
};

export const SELL_PRICES = {
  egg: 6,
  milk: 10,
  carrot: 8,
  corn: 5,
  strawberry: 15,
};

export const GROW_TIMES = {
  carrot: 30_000,
  corn: 20_000,
  strawberry: 60_000,
};

export const PRODUCE_INTERVALS = {
  chicken: 60_000,
  cow: 120_000,
};

export const PRODUCE_TYPE = {
  chicken: 'egg',
  cow: 'milk',
};

export const CROP_ICONS = {
  carrot: '🥕',
  corn: '🌽',
  strawberry: '🍓',
};

export const PRODUCE_ICONS = {
  egg: '🥚',
  milk: '🥛',
  carrot: '🥕',
  corn: '🌽',
  strawberry: '🍓',
};

const SAVE_KEY = 'farm_save_v1';

export function saveGame() {
  const save = {
    coins: state.coins,
    day: state.day,
    inventory: { ...state.inventory },
    market: { available: { ...state.market.available } },
    gridSize: state.gridSize,
    totalAnimals: state.totalAnimals,
    plots: state.plots.map(p => ({
      id: p.id,
      gridX: p.gridX,
      gridZ: p.gridZ,
      status: p.status,
      crop: p.crop,
      plantedAt: p.plantedAt,
      growTime: p.growTime,
    })),
    animals: state.animals.map(a => ({
      id: a.id,
      type: a.type,
      produceType: a.produceType,
      lastProducedAt: a.lastProducedAt,
      produceInterval: a.produceInterval,
      hasProduct: a.hasProduct,
      slot: a.slot,
    })),
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch {}
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

