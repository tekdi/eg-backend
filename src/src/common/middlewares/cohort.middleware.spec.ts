import { CohortMiddleware } from './cohort.middleware';

describe('CohortMiddleware', () => {
  it('should be defined', () => {
    expect(new CohortMiddleware()).toBeDefined();
  });
});
