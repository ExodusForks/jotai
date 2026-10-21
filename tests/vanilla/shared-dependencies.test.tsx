import { expect, it, vi } from 'vitest'
import { atom, createStore } from 'jotai/vanilla'
import type { Atom } from 'jotai/vanilla'
import { INTERNAL_getBuildingBlocksRev1 as INTERNAL_getBuildingBlocks } from 'jotai/vanilla/internals'

it('bounds traversal work when updating deeply shared dependencies', () => {
  const store = createStore()
  const base = atom(0)
  const depth = 12
  let result: Atom<number> = base

  for (let i = 0; i < depth; i++) {
    const previous = result
    const left = atom((get) => get(previous))
    const right = atom((get) => get(previous))
    result = atom((get) => get(left) + get(right))
  }

  const observed: number[] = []
  const unsubscribe = store.sub(result, () => {
    observed.push(store.get(result))
  })
  const atomStateMap = INTERNAL_getBuildingBlocks(store)[0]
  const getAtomState = vi.spyOn(atomStateMap, 'get')

  try {
    for (const value of [1, 2, 0]) {
      getAtomState.mockClear()
      store.set(base, value)

      expect(store.get(result)).toBe(value * 2 ** depth)
      // Allow ample linear bookkeeping, but not a walk of every shared path.
      // Count state lookups instead of relying on machine-dependent timings.
      const atomCount = 1 + depth * 3
      expect(getAtomState.mock.calls.length).toBeLessThan(atomCount * 100)
    }
    expect(observed).toEqual([2 ** depth, 2 * 2 ** depth, 0])
  } finally {
    getAtomState.mockRestore()
    unsubscribe()
  }
})
