import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { QuestionOptions as Options } from '@/domain/questionOptions';
import { QuestionOptions } from './QuestionOptions';

const choices = [
  { number: 1, label: 'HR' },
  { number: 2, label: 'Leder' },
  { number: 3, label: 'Kollega' },
];

function setup(options: Options, props: { disabled?: boolean } = {}) {
  const onAnswer = vi.fn();
  render(<QuestionOptions options={options} onAnswer={onAnswer} {...props} />);
  return { onAnswer, user: userEvent.setup() };
}

const field = () => screen.getByRole('textbox', { name: 'Annet svar' });
const sendButton = () => screen.getByRole('button', { name: 'Send svar' });

describe('QuestionOptions with one answer allowed', () => {
  const single = { multiple: false, choices, skippable: false };

  it('shows each option as a button with the number the agent gave it', () => {
    setup(single);

    expect(screen.getByRole('button', { name: '1. HR' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3. Kollega' })).toBeInTheDocument();
  });

  it('sends the option as soon as it is clicked', async () => {
    const { onAnswer, user } = setup(single);

    await user.click(screen.getByRole('button', { name: '2. Leder' }));

    expect(onAnswer).toHaveBeenCalledExactlyOnceWith('2. Leder');
  });

  it('sends an answer that is not in the list', async () => {
    const { onAnswer, user } = setup(single);

    await user.type(field(), 'Daglig leder');
    await user.click(sendButton());

    expect(onAnswer).toHaveBeenCalledExactlyOnceWith('Daglig leder');
  });
});

describe('QuestionOptions with several answers allowed', () => {
  const multiple = { multiple: true, choices, skippable: false };

  it('sends the ticked options in the agent’s order, with the own words after them', async () => {
    const { onAnswer, user } = setup(multiple);

    await user.click(screen.getByRole('checkbox', { name: '3. Kollega' }));
    await user.click(screen.getByRole('checkbox', { name: '1. HR' }));
    await user.type(field(), 'gjerne vennlige');
    await user.click(sendButton());

    expect(onAnswer).toHaveBeenCalledExactlyOnceWith('1. HR, 3. Kollega. Annet: gjerne vennlige');
  });

  it('can untick an option', async () => {
    const { onAnswer, user } = setup(multiple);

    await user.click(screen.getByRole('checkbox', { name: '1. HR' }));
    await user.click(screen.getByRole('checkbox', { name: '2. Leder' }));
    await user.click(screen.getByRole('checkbox', { name: '1. HR' }));
    await user.click(sendButton());

    expect(onAnswer).toHaveBeenCalledExactlyOnceWith('2. Leder');
  });

  it('can not send before something is chosen or written', () => {
    setup(multiple);

    expect(sendButton()).toBeDisabled();
  });
});

describe('QuestionOptions for an optional question', () => {
  it('skips a question without options, with only the skip button shown', async () => {
    const { onAnswer, user } = setup({ multiple: false, choices: [], skippable: true });

    expect(screen.queryByRole('textbox', { name: 'Annet svar' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Hopp over' }));

    expect(onAnswer).toHaveBeenCalledExactlyOnceWith('Hopp over');
  });

  it('offers to skip next to the options', () => {
    setup({ multiple: false, choices, skippable: true });

    expect(screen.getByRole('button', { name: '1. HR' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hopp over' })).toBeInTheDocument();
  });

  it('has no skip button when the question is required', () => {
    setup({ multiple: false, choices, skippable: false });

    expect(screen.queryByRole('button', { name: 'Hopp over' })).not.toBeInTheDocument();
  });
});

describe('QuestionOptions while the agent is answering', () => {
  it('disables every option, the field and skipping', () => {
    setup({ multiple: false, choices, skippable: true }, { disabled: true });

    expect(screen.getByRole('button', { name: '1. HR' })).toBeDisabled();
    expect(field()).toBeDisabled();
    expect(sendButton()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Hopp over' })).toBeDisabled();
  });
});
