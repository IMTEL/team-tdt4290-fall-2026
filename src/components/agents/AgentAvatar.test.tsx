import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AgentAvatar } from './AgentAvatar';

const image = (container: HTMLElement) => container.querySelector('img');

describe('AgentAvatar', () => {
  it('shows the agent’s avatar', () => {
    const { container } = render(<AgentAvatar avatar="ugle" />);

    expect(image(container)).toHaveAttribute('src', '/avatars/ugle.svg');
  });

  it.each([
    ['there is no avatar', null],
    ['there is no avatar field', undefined],
    ['the avatar is one we no longer have', 'fjernet-avatar'],
  ])('shows the default image when %s', (_, avatar) => {
    const { container } = render(<AgentAvatar avatar={avatar} />);

    expect(image(container)).toHaveAttribute('src', '/avatars/default.svg');
  });

  it('is decorative: the agent’s name is next to it, so it has no alt text', () => {
    const { container } = render(<AgentAvatar avatar="robot" />);

    expect(image(container)).toHaveAttribute('alt', '');
  });
});
