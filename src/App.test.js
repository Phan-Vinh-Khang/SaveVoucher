import { render, screen } from '@testing-library/react';
import App from './App';

test('renders excel orders heading', () => {
  render(<App />);
  const heading = screen.getByRole('heading', { name: /excel orders viewer/i });
  expect(heading).toBeInTheDocument();
});
