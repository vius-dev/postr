
// src/utils/guards.ts

// This file will contain type guard functions.

export const isString = (value: unknown): value is string => {
  return typeof value === 'string';
};
