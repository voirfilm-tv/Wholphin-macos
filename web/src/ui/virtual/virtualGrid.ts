export interface VirtualGridOptions<T> {
  container: HTMLElement;
  items: T[];
  renderItem: (item: T, index: number) => string;
  itemKey: (item: T) => string;
  minColumnWidth?: number;
  columnGap?: number;
  rowGap?: number;
  overscanRows?: number;
  totalCount?: number;
  loadMore?: () => Promise<{ items: T[]; totalCount?: number }>;
  onRendered?: () => void;
  signal?: AbortSignal;
}

export class VirtualGrid<T> {
  private items: T[];
  private totalCount: number;
  private readonly minColumnWidth: number;
  private readonly columnGap: number;
  private readonly rowGap: number;
  private readonly overscanRows: number;
  private frame = 0;
  private loading = false;
  private columns = 1;
  private columnWidth = 0;
  private rowHeight = 0;
  private start = -1;
  private end = -1;
  private readonly resizeObserver: ResizeObserver;
  private destroyed = false;

  constructor(private readonly options: VirtualGridOptions<T>) {
    this.items = [...options.items];
    this.totalCount = options.totalCount ?? this.items.length;
    this.minColumnWidth = options.minColumnWidth ?? 170;
    this.columnGap = options.columnGap ?? 16;
    this.rowGap = options.rowGap ?? 22;
    this.overscanRows = options.overscanRows ?? 2;
    options.container.classList.add('virtual-grid');
    this.resizeObserver = new ResizeObserver(() => this.schedule(true));
    this.resizeObserver.observe(options.container);
    window.addEventListener('scroll', this.onScroll, { passive: true });
    options.signal?.addEventListener('abort', () => this.destroy(), { once: true });
    this.schedule(true);
  }

  setItems(items: T[], totalCount = items.length): void {
    this.items = [...items];
    this.totalCount = Math.max(totalCount, items.length);
    this.start = -1;
    this.end = -1;
    this.schedule(true);
  }

  appendItems(items: T[], totalCount = this.totalCount): void {
    const existing = new Set(this.items.map(this.options.itemKey));
    this.items.push(...items.filter((item) => !existing.has(this.options.itemKey(item))));
    this.totalCount = Math.max(totalCount, this.items.length);
    this.schedule(true);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    window.removeEventListener('scroll', this.onScroll);
    this.resizeObserver.disconnect();
  }

  private readonly onScroll = () => this.schedule(false);

  private schedule(force: boolean): void {
    if (this.destroyed) return;
    if (force) {
      this.start = -1;
      this.end = -1;
    }
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => void this.render());
  }

  private async render(): Promise<void> {
    if (this.destroyed) return;
    const width = this.options.container.clientWidth;
    if (!width) return;
    this.columns = Math.max(1, Math.floor((width + this.columnGap) / (this.minColumnWidth + this.columnGap)));
    this.columnWidth = (width - (this.columns - 1) * this.columnGap) / this.columns;
    this.rowHeight = this.columnWidth * 1.5 + 68 + this.rowGap;
    const rows = Math.ceil(this.totalCount / this.columns);
    const containerTop = this.options.container.getBoundingClientRect().top + window.scrollY;
    const viewportTop = Math.max(0, window.scrollY - containerTop);
    const viewportBottom = viewportTop + window.innerHeight;
    const startRow = Math.max(0, Math.floor(viewportTop / this.rowHeight) - this.overscanRows);
    const endRow = Math.min(rows, Math.ceil(viewportBottom / this.rowHeight) + this.overscanRows);
    const start = startRow * this.columns;
    const end = Math.min(this.items.length, endRow * this.columns);
    this.options.container.style.height = `${Math.max(1, rows * this.rowHeight)}px`;
    if (start !== this.start || end !== this.end) {
      this.start = start;
      this.end = end;
      const visible = this.items.slice(start, end);
      this.options.container.innerHTML = `<div class="virtual-grid-window" style="transform:translateY(${startRow * this.rowHeight}px);grid-template-columns:repeat(${this.columns},minmax(0,1fr));gap:${this.rowGap}px ${this.columnGap}px">${visible.map((item, offset) => this.options.renderItem(item, start + offset)).join('')}</div>`;
      this.options.onRendered?.();
    }
    if (this.options.loadMore && !this.loading && this.items.length < this.totalCount && end >= this.items.length - this.columns * 3) {
      this.loading = true;
      try {
        const page = await this.options.loadMore();
        this.appendItems(page.items, page.totalCount ?? this.totalCount);
      } finally {
        this.loading = false;
      }
    }
  }
}
