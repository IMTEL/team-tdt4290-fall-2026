import { expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import LogInPage from '../login/page'

test('LogInPage', () => {
    render(<LogInPage />)
    expect(screen.getByRole('heading', { level: 1, name: 'Home' })).toBeDefined()
})