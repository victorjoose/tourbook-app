import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isStaleChunkError, markBuildFresh, reloadOnceForStaleBuild, withStaleChunkReload } from './staleBuild'

describe('isStaleChunkError', () => {
  it('recognizes the browsers\' messages for a chunk that no longer exists', () => {
    expect(
      isStaleChunkError(
        new TypeError('Failed to fetch dynamically imported module: https://x/assets/MapPage-BIW9P_Qm.js'),
      ),
    ).toBe(true)
    expect(isStaleChunkError(new TypeError('Importing a module script failed.'))).toBe(true)
    expect(isStaleChunkError(new TypeError('error loading dynamically imported module'))).toBe(true)
    expect(isStaleChunkError(new Error('Unable to preload CSS for /assets/a.css'))).toBe(true)
  })

  it('ignores other errors', () => {
    expect(isStaleChunkError(new Error('permission-denied'))).toBe(false)
    expect(isStaleChunkError(undefined)).toBe(false)
  })
})

describe('reloadOnceForStaleBuild', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('reloads once and then lets the error through', () => {
    const reload = vi.fn()
    expect(reloadOnceForStaleBuild(reload)).toBe(true)
    expect(reload).toHaveBeenCalledTimes(1)

    expect(reloadOnceForStaleBuild(reload)).toBe(false)
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('can reload again after a chunk loaded fine (next deploy)', () => {
    const reload = vi.fn()
    reloadOnceForStaleBuild(reload)
    markBuildFresh()
    expect(reloadOnceForStaleBuild(reload)).toBe(true)
    expect(reload).toHaveBeenCalledTimes(2)
  })
})

describe('withStaleChunkReload', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('passes the module through and clears the reload guard', async () => {
    sessionStorage.setItem('tour-app:reloaded-for-stale-build', '1')
    const load = withStaleChunkReload(async () => ({ default: 'Page' }))
    await expect(load()).resolves.toEqual({ default: 'Page' })
    expect(reloadOnceForStaleBuild(vi.fn())).toBe(true)
  })

  it('rethrows errors that are not a missing chunk', async () => {
    const load = withStaleChunkReload(async () => {
      throw new Error('permission-denied')
    })
    await expect(load()).rejects.toThrow('permission-denied')
  })

  it('rethrows a missing chunk when this session already reloaded once', async () => {
    sessionStorage.setItem('tour-app:reloaded-for-stale-build', '1')
    const load = withStaleChunkReload(async () => {
      throw new TypeError('Failed to fetch dynamically imported module: /assets/MapPage-x.js')
    })
    await expect(load()).rejects.toThrow(/dynamically imported module/)
  })
})
