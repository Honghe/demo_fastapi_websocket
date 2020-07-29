/**
 * 将无符号Float32Array数组转化成有符号的Int16Array数组
 * @param {Float32Array} input unsinged Float32Array
 * @return {Int16Array} singed int16
 */
function floatTo16BitPCM(input) {
  let i      = input.length;
  let output = new Int16Array(i);
  while (i--) {
    let s     = Math.max(-1, Math.min(1, input[i]));
    output[i] = (s < 0 ? s * 0x8000 : s * 0x7FFF);
  }
  return output;
}

/**
 * 将有符号的Int16Array数组转化成无符号Float32Array数组
 * @param {Int16Array} input singed int16
 * @return {Float32Array}  // unsinged float32
 */
function int16ToFloat32BitPCM(input) {
  let i      = input.length;
  let output = new Float32Array(i);
  while (i--) {
    let int   = input[i];
    output[i] = (int >= 0x8000) ? -(0x10000 - int) / 0x8000 : int / 0x7FFF;
  }
  return output;
}