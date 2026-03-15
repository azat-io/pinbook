import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isCancel, text } from '@clack/prompts'

import { requestProjectDirectory } from '../../cli/request-project-directory'

vi.mock('@clack/prompts', () => ({
  isCancel: vi.fn((value: unknown) => value === Symbol.for('clack-cancel')),
  text: vi.fn(),
}))

describe('requestProjectDirectory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('prompts for a directory name and returns the trimmed value', async () => {
    vi.mocked(text).mockResolvedValueOnce('  maps/tokyo  ')

    await expect(requestProjectDirectory()).resolves.toBe('maps/tokyo')

    expect(text).toHaveBeenCalledOnce()
    let [textCall] = vi.mocked(text).mock.calls
    let [textOptions] = textCall!

    expect(textOptions.message).toBe(
      'Enter a directory name for the new map project:',
    )
    expect(textOptions.validate?.('')).toBe('Directory name is required.')
    expect(textOptions.validate?.('maps/tokyo')).toBeUndefined()
  })

  it('returns null when the directory prompt is canceled', async () => {
    vi.mocked(text).mockResolvedValueOnce(Symbol.for('clack-cancel'))

    await expect(requestProjectDirectory()).resolves.toBeNull()

    expect(isCancel).toHaveBeenCalledWith(Symbol.for('clack-cancel'))
  })
})
