import argon2 from 'argon2';

const options = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

export const hashPassword = (password: string): Promise<string> => argon2.hash(password, options);

export const verifyPassword = (hash: string, password: string): Promise<boolean> =>
  argon2.verify(hash, password);
