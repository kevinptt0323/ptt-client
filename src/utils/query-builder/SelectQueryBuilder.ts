import { QueryBuilder } from './QueryBuilder';

export abstract class SelectQueryBuilder<T> extends QueryBuilder<T> {
  constructor(...args) {
    super(...args);
  }

  abstract where(type: string, condition: any): this;

  abstract get(): Promise<T[]>;

  abstract getOne(): Promise<T|undefined>;
}
