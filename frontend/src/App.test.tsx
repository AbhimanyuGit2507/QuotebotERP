import React from 'react';
import { render, screen } from '@testing-library/react';

test('renders a basic test node', () => {
  render(<div>Quotebot test harness</div>);
  expect(screen.getByText(/quotebot test harness/i)).toBeInTheDocument();
});
