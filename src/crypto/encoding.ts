// Byte helpers shared by the crypto modules

export function utf8_encode(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

export function utf8_decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes)
}

export function to_base64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes)
    binary += String.fromCharCode(byte)
  return btoa(binary)
}

export function from_base64(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), character => character.charCodeAt(0))
}

// Random url-safe identifier, used for key package references
export function random_id(byte_length = 18): string {
  return to_base64(crypto.getRandomValues(new Uint8Array(byte_length)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function bytes_equal(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length)
    return false
  let difference = 0
  for (let index = 0; index < a.length; index++)
    difference |= a[index] ^ b[index]
  return difference === 0
}

// Concatenate fields, each prefixed with its length on 4 bytes, so that no two inputs give the same bytes.
// Must stay identical to encode_fields in the back-end (src/entities/devices/devices.helper.ts).
export function encode_fields(fields: Uint8Array[]): Uint8Array {
  const total = fields.reduce((sum, field) => sum + 4 + field.length, 0)
  const output = new Uint8Array(total)
  const view = new DataView(output.buffer)
  let offset = 0
  for (const field of fields) {
    view.setUint32(offset, field.length)
    output.set(field, offset + 4)
    offset += 4 + field.length
  }
  return output
}
