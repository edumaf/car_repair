import { Stack, router } from 'expo-router';
import { act, renderRouter } from 'expo-router/testing-library';

import { openCarStep } from './openCar';

const Empty = () => null;

function renderApp() {
  return renderRouter({
    _layout: () => <Stack />,
    index: Empty,
    'car/[id]/index': Empty,
    'car/[id]/inspect': Empty,
    'car/[id]/verdict': Empty,
  });
}

describe('openCarStep', () => {
  it.each(['inspect', 'verdict'] as const)('opens the %s with the car report underneath', async (step) => {
    const screen = await renderApp();
    await act(async () => openCarStep('7', step));
    expect(screen).toHavePathname(`/car/7/${step}`);
    await act(async () => router.back());
    expect(screen).toHavePathname('/car/7');
    await act(async () => router.back());
    expect(screen).toHavePathname('/');
  });
});
