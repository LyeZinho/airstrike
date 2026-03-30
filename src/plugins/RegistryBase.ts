export abstract class RegistryBase<T> {
  protected items: Map<string, T> = new Map();

  register(id: string, item: T): void {
    if (this.items.has(id)) {
      throw new Error(`Item with id '${id}' already registered`);
    }
    this.items.set(id, item);
  }

  get(id: string): T {
    const item = this.items.get(id);
    if (!item) throw new Error(`Item with id '${id}' not found`);
    return item;
  }

  has(id: string): boolean {
    return this.items.has(id);
  }

  getAll(): T[] {
    return Array.from(this.items.values());
  }

  getIds(): string[] {
    return Array.from(this.items.keys());
  }

  clear(): void {
    this.items.clear();
  }
}
