export const GRID = 8;
export const CELL = 1.0;
export const GAP = 0.1;
export const PITCH = CELL + GAP;
export const ORIGIN = -(GRID * PITCH) / 2 + PITCH / 2;

export const SKY_COLOR = 0x87ceeb;
export const FOG_DENSITY = 0.006;

export const CAMERA_FOV = 41;
export const CAMERA_NEAR = 0.1;
export const CAMERA_FAR = 400;
export const CAMERA_POS = { x: -11.345, y: 19.351, z: 21.843 };

export const CTRL_DAMPING = 0.07;
export const CTRL_MIN_DIST = 8;
export const CTRL_MAX_DIST = 55;
export const CTRL_MIN_POLAR = 0.2;
export const CTRL_MAX_POLAR = Math.PI * 0.48;
export const CTRL_ENABLE_PAN = false;
export const CTRL_ENABLE_ROTATE = true;
export const CTRL_ENABLE_ZOOM = true;
export const CTRL_PAN_MIN = { x: -20, z: -15 };
export const CTRL_PAN_MAX = { x: 20, z: 20 };

export const AMBIENT_COLOR = 0xfff4e0;
export const AMBIENT_INTENSITY = 1.0;
export const SUN_COLOR = 0xfff8e7;
export const SUN_INTENSITY = 2.5;
export const SUN_POS = { x: 20, y: 40, z: 15 };
export const SUN_SHADOW_SIZE = 2048;
export const SUN_SHADOW_NEAR = 1;
export const SUN_SHADOW_FAR = 120;
export const SUN_SHADOW_EXTENT = 40;
export const SUN_SHADOW_BIAS = -0.001;
export const TONE_EXPOSURE = 1.2;

export const GROUND_COLOR = 0x4a7a2a;
export const GROUND_SIZE = 200;
export const GROUND_Y = -0.07;

export const TILE_HEIGHT = 0.12;
export const TILE_COLOR_DEFAULT = 0x8b5e3c;
export const TILE_COLOR_HOVER = 0xb8825a;
export const TILE_COLOR_SELECTED = 0xffe066;
export const TILE_COLOR_OCCUPIED = 0x6a4a28;
export const TILE_COLOR_READY = 0x44cc44;

export const STARTING_MONEY = 100;

export const ANIMAL_DEFS = {
  chicken: { product: "egg", productionTime: 15 },
  cow: { product: "milk", productionTime: 30 },
};

export const ITEM_ICONS = {
  chicken: "/assets/images/chicken.png",
  cow: "/assets/images/cow.png",
  corn: "/assets/images/corn.png",
  tomato: "/assets/images/pomidor.png",
  strawberry: "/assets/images/strawberry.png",
  egg: "/assets/images/egg.png",
  milk: "/assets/images/milk.png",
};

export const ITEM_DEFS = [
  {
    key: "chicken",
    label: "Chicken",
    node: "chicken_1",
    scale: 0.7,
    offset: { x: 0, y: -0.051, z: 0 },
    price: 40,
  },
  {
    key: "cow",
    label: "Cow",
    node: "cow_1",
    scale: 1.5,
    offset: { x: 0, y: 0, z: 0 },
    price: 80,
  },
  {
    key: "corn",
    label: "Corn",
    node: "corn_1",
    scale: 1.0,
    offset: { x: 0, y: 0, z: 0 },
    price: 10,
  },
  {
    key: "tomato",
    label: "Tomato",
    node: "tomato_1",
    scale: 1.0,
    offset: { x: 0, y: 0, z: 0 },
    price: 15,
  },
  {
    key: "strawberry",
    label: "Strawberry",
    node: "strawberry_1",
    scale: 1.0,
    offset: { x: 0, y: 0, z: 0 },
    price: 20,
  },
];

export const CROP_DEFS = {
  corn: { stages: ["corn_1", "corn_2", "corn_3"], productionTime: 8 },
  tomato: { stages: ["tomato_1", "tomato_2", "tomato_3"], productionTime: 15 },
  strawberry: {
    stages: ["strawberry_1", "strawberry_2", "strawberry_3"],
    productionTime: 25,
  },
};

export const GARDEN_SCALE = 0.6;
export const GARDEN_POS = { x: 1, y: -2.55, z: -1 };

export const FOREST_SCALE = 0.6;
export const FOREST_POSITIONS = [
  { x: -12, y: -2.65, z: -7 },
  { x: -16, y: -2.65, z: 6 },
  { x: 20, y: -2.65, z: -5 },
  { x: 22, y: -2.65, z: 7 },
  { x: 4, y: -2.65, z: -13 },
  { x: 20, y: -2.65, z: 28 },
  { x: -13, y: -2.65, z: 28 },
  { x: 4, y: -2.65, z: 28 },
  { x: 25, y: -2.65, z: 46 },
  { x: -19, y: -2.65, z: 45 },
  { x: 4, y: -2.65, z: 45 },
  { x: 24, y: -2.65, z: -20 },
  { x: -18, y: -2.65, z: -20 },
  { x: 4, y: -2.65, z: -28 },
];

//Road
export const ROAD_Z = 8;
export const ROAD_WIDTH = 3.2;
export const ROAD_LENGTH = 200;

//Car queue
export const CAR_ENTER_X = -44;
export const CAR_EXIT_X = 44;
export const SERVICE_X = -6;
export const QUEUE_GAP = 6;
export const MAX_QUEUE = 4;
export const CAR_SPEED = 7;
export const SPAWN_MIN = 15;
export const SPAWN_MAX = 35;
export const CAR_Y = 0.83;
export const CAR_ROTATION_Y = Math.PI / 2;
export const CAR_SCALE = 2;
export const CAR_LABEL_Y = 0.4;
export const CAR_WISH_MIN_TYPES = 1;
export const CAR_WISH_MAX_TYPES = 3;
export const CAR_WISH_MIN_QTY = 1;
export const CAR_WISH_MAX_QTY = 2;

export const SELL_PRICES = {
  corn: 8,
  tomato: 12,
  strawberry: 18,
  egg: 15,
  milk: 20,
};

export const CAR_COLORS = [
  0x162d88, 0x166630, 0x8b3d00, 0x561566, 0x155c66, 0x8b1f55,
];
