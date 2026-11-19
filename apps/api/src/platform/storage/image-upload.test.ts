import { describe, expect, it } from 'vitest'
import { sniffImageType } from './image-upload.service'

const pad = (bytes: number[]): Buffer => Buffer.concat([Buffer.from(bytes), Buffer.alloc(20)])

describe('sniffImageType', () => {
  it('recognises the formats the allow-list accepts', () => {
    expect(sniffImageType(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png')
    expect(sniffImageType(pad([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg')
    expect(sniffImageType(pad([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))).toBe('image/gif')
    expect(sniffImageType(pad([0x00, 0x00, 0x01, 0x00]))).toBe('image/x-icon')
  })

  it('needs the WEBP marker, not just a RIFF container', () => {
    const webp = Buffer.concat([
      Buffer.from('RIFF'),
      Buffer.from([0, 0, 0, 0]),
      Buffer.from('WEBP'),
      Buffer.alloc(8),
    ])
    expect(sniffImageType(webp)).toBe('image/webp')

    // A WAV file is also RIFF, and must not pass as an image.
    const wav = Buffer.concat([
      Buffer.from('RIFF'),
      Buffer.from([0, 0, 0, 0]),
      Buffer.from('WAVE'),
      Buffer.alloc(8),
    ])
    expect(sniffImageType(wav)).toBeNull()
  })

  it('rejects anything that is not an image, however it was named', () => {
    expect(sniffImageType(Buffer.from('this is a plain text file, honest'))).toBeNull()
    expect(sniffImageType(Buffer.from('<!doctype html><script>alert(1)</script>'))).toBeNull()
  })

  it('rejects a payload too short to identify', () => {
    expect(sniffImageType(Buffer.from([0x89, 0x50]))).toBeNull()
    expect(sniffImageType(Buffer.alloc(0))).toBeNull()
  })
})