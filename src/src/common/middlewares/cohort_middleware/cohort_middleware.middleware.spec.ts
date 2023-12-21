import { CohortMiddleware } from './cohort_middleware.middleware';

describe('CohortMiddleware', () => {
  it('should be defined', () => {
    expect(new CohortMiddleware()).toBeDefined();
  });
});
