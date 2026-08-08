import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders AI Voice Assistant heading', () => {
    render(<App />);
    const headingElement = screen.getByText(/AI Voice Assistant/i);
    expect(headingElement).toBeInTheDocument();
  });

  it('renders start voice command button', () => {
    render(<App />);
    const buttonElement = screen.getByText(/Start Voice Command/i);
    expect(buttonElement).toBeInTheDocument();
  });
});
