import { describe, it, expect } from 'vitest';
import { generateRouteOptions, ROUTES } from './RouteState';

describe('RouteState Domain Module', () => {
  it('generates 2 base route options for area 1 when random roll is above threshold', () => {
    const options = generateRouteOptions(1, () => 0.5);
    expect(options).toEqual(['wilds', 'ruins']);
    options.forEach((optId) => {
      expect(ROUTES[optId]).toBeDefined();
      expect(ROUTES[optId].title).toBeTruthy();
    });
  });

  it('generates secret riddle node on eligible areas when random roll is <= 0.20', () => {
    const options = generateRouteOptions(1, () => 0.1);
    expect(options).toEqual(['wilds', 'ruins', 'secret_riddle']);
    expect(ROUTES.secret_riddle).toBeDefined();
    expect(ROUTES.secret_riddle.danger).toBe('造化');
  });

  it('always returns boss route for area >= 3', () => {
    const options = generateRouteOptions(3, () => 0.01);
    expect(options).toEqual(['boss']);
  });
});
