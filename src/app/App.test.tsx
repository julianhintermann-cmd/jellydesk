import { render, screen } from '@testing-library/react';
import { App } from '@/app/App';

describe('App', () => {
  it('rendert den App-Namen', () => {
    render(<App />);
    expect(screen.getByText('JellyDesk')).toBeInTheDocument();
  });
});
