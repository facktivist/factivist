import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * app.json contract — Expo plugin block must declare camera + photo library
 * permissions so iOS device builds inject `NSCameraUsageDescription` +
 * `NSPhotoLibraryUsageDescription`, and Android builds inject `CAMERA` +
 * `READ_MEDIA_IMAGES` / `READ_EXTERNAL_STORAGE`.
 *
 * Without this block, `expo prebuild` / `eas build` silently ship a binary
 * that App Store / Play Store reject at runtime when the user taps the
 * camera attach button on the compose screen.
 *
 * Wave 1 added `expo-camera` + `expo-image-picker` to package.json but
 * NOT the plugin entries. Wave 3A added them — this test locks the
 * contract so a future cleanup PR cannot quietly drop them.
 */

type PluginEntry = string | [string, Record<string, unknown>]

interface ExpoAppConfig {
  expo: {
    plugins?: PluginEntry[]
    android?: {
      permissions?: string[]
    }
  }
}

const appConfigPath = join(__dirname, '..', '..', 'app.json')
const appConfig = JSON.parse(readFileSync(appConfigPath, 'utf8')) as ExpoAppConfig

function findPlugin(name: string): PluginEntry | undefined {
  return (appConfig.expo.plugins ?? []).find((entry) => {
    if (typeof entry === 'string') return entry === name
    return Array.isArray(entry) && entry[0] === name
  })
}

describe('apps/mobile app.json — plugin permissions', () => {
  it('declares a plugins array', () => {
    expect(appConfig.expo.plugins).toBeDefined()
    expect(Array.isArray(appConfig.expo.plugins)).toBe(true)
  })

  it('preserves expo-router in the plugins block', () => {
    expect(findPlugin('expo-router')).toBeDefined()
  })

  it('preserves expo-splash-screen in the plugins block', () => {
    expect(findPlugin('expo-splash-screen')).toBeDefined()
  })

  it('preserves @config-plugins/detox in the plugins block', () => {
    expect(findPlugin('@config-plugins/detox')).toBeDefined()
  })

  it('registers expo-camera with a non-empty cameraPermission string', () => {
    const entry = findPlugin('expo-camera')
    expect(entry).toBeDefined()
    expect(Array.isArray(entry)).toBe(true)
    const [, config] = entry as [string, Record<string, unknown>]
    expect(typeof config.cameraPermission).toBe('string')
    expect((config.cameraPermission as string).length).toBeGreaterThan(0)
  })

  it('registers expo-image-picker with a non-empty photosPermission string', () => {
    const entry = findPlugin('expo-image-picker')
    expect(entry).toBeDefined()
    expect(Array.isArray(entry)).toBe(true)
    const [, config] = entry as [string, Record<string, unknown>]
    expect(typeof config.photosPermission).toBe('string')
    expect((config.photosPermission as string).length).toBeGreaterThan(0)
  })

  it('does not override android.permissions in a way that drops CAMERA', () => {
    // If android.permissions is set, it MUST include what the plugins want.
    // If unset, Expo auto-injects from the plugins — that's the desired path.
    const perms = appConfig.expo.android?.permissions
    if (perms !== undefined) {
      expect(perms).toContain('android.permission.CAMERA')
    } else {
      expect(perms).toBeUndefined()
    }
  })
})
