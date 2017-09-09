/* eslint no-param-reassign: 0 */
export function fastfloor(x) {
  return x << 0; // x > 0 ? x : x - 1;
}

export function fade(t) {
  // This eases coordinate values
  // so that they will ease towards integral values.
  // This ends up smoothing the final output.
  // 6t^5 - 15t^4 + 10t^3
  return t * t * t * (t * (t * 6 - 15) + 10);
}

// Linear interpolation - lerp(transform, vector0/start, vector1/amt)
export function lerp(t, a, b) {
  // Imprecise method which does not guarantee v = v1 when t = 1, due to floating-point arithmetic error.
  // return a + t * (b - a);
  // Precise method which guarantees v = v1 when t = 1
  return (1 - t) * a + t * b;
}

export function grad(hash, x, y, z) {
  switch (hash & 0xF) {
    case 0x0: return x + y;
    case 0x1: return -x + y;
    case 0x2: return x - y;
    case 0x3: return -x - y;
    case 0x4: return x + z;
    case 0x5: return -x + z;
    case 0x6: return x - z;
    case 0x7: return -x - z;
    case 0x8: return y + z;
    case 0x9: return -y + z;
    case 0xA: return y - z;
    case 0xB: return -y - z;
    case 0xC: return y + x;
    case 0xD: return -y + z;
    case 0xE: return y - x;
    case 0xF: return -y - z;
    default: return 0; // never happens
  }
}

export function scale(n) {
  return (1 + n) / 2;
}

export function dist(a, b, c, d) {
  return Math.sqrt(((a - c) * (a - c) + (b - d) * (b - d)));
}

export default function simplexNoise(x, y, z) {
  const perm = new Array(512);
  const permutation = [151, 160, 137, 91, 90, 15,
    131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23,
    190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33,
    88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166,
    77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244,
    102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196,
    135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123,
    5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42,
    223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
    129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228,
    251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107,
    49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254,
    138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180,
  ];
  for (let i = 0; i < 512; i++) {
    perm[i] = permutation[i % 256];
  }

  // put a |0 at the end of a number to force it to be 32 bit
  const ix = x | 0; x -= ix;
  const iy = y | 0; y -= iy;
  const iz = z | 0; z -= iz;

  // Anding an integer with 0xFF leaves only the least significant byte. For example, to get
  // the first byte in a short s, you can write s & 0xFF. This is typically referred to as "masking".
  // If byte1 is either a single byte type (like uint8_t) or is already less than 256
  // (and as a result is all zeroes except for the least significant byte) there is no need to mask
  // out the higher bits, as they are already zero.

  const gx = ix & 0xFF;
  const gy = iy & 0xFF;
  const gz = iz & 0xFF;

  const a0 = gy + perm[gx];
  const b0 = gy + perm[gx + 1];
  const aa = gz + perm[a0];
  const ab = gz + perm[a0 + 1];
  const ba = gz + perm[b0];
  const bb = gz + perm[b0 + 1];

  const aa0 = perm[aa];
  const aa1 = perm[aa + 1];
  const ab0 = perm[ab];
  const ab1 = perm[ab + 1];
  const ba0 = perm[ba];
  const ba1 = perm[ba + 1];
  const bb0 = perm[bb];
  const bb1 = perm[bb + 1];

  const a1 = grad(bb1, x - 1, y - 1, z - 1);
  const a2 = grad(ab1, x, y - 1, z - 1);
  const a3 = grad(ba1, x - 1, y, z - 1);
  const a4 = grad(aa1, x, y, z - 1);
  const a5 = grad(bb0, x - 1, y - 1, z);
  const a6 = grad(ab0, x, y - 1, z);
  const a7 = grad(ba0, x - 1, y, z);
  const a8 = grad(aa0, x, y, z);

  const u = fade(x);
  const v = fade(y);
  const w = fade(z);

  const vector0 = lerp(v, lerp(u, a8, a7), lerp(u, a6, a5));
  const vector1 = lerp(v, lerp(u, a4, a3), lerp(u, a2, a1));
  return lerp(w, vector0, vector1);
}
