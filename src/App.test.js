import { render, screen } from '@testing-library/react';
import App from './App';

test('renders save 100 heading', () => {
  render(<App />);
  const heading = screen.getByRole('heading', { name: /save 100/i });
  expect(heading).toBeInTheDocument();
});
