export interface SaveOptions<T> {
  getData: () => T;
  immediate?: boolean; // 是否立即保存（跳过延迟）
  force?: boolean; // 是否强制保存（忽略时间间隔）
}

export interface SaveResult {
  success: boolean;
  timestamp: number;
  reason: string;
}

export class DelayedSaver<T> {
  private saveTimer: number | null = null;
  private lastSaveTime: number = 0;
  private lastGetData: (() => T) | null = null;
  private isSaving: boolean = false;
  private pendingSave: boolean = false;

  // 配置参数
  private readonly DELAY_TIME = 2000; // 基础延迟2秒
  private readonly MAX_INTERVAL = 10000; // 最大间隔10秒
  private readonly MIN_INTERVAL = 1000; // 最小保存间隔1秒（防频繁保存）

  constructor(
    private saveFunction: (data: T) => Promise<void> | void,
    private onSaveSuccess?: (result: SaveResult) => void,
    private onSaveError?: (error: any) => void
  ) { }

  /**
   * 触发保存（延迟或立即）
   */
  public triggerSave(options: SaveOptions<T>): void {
    const now = Date.now();
    this.lastGetData = options.getData;

    // 立即保存的情况
    if (options.immediate || options.force) {
      this.executeSaveImmediately(options);
      return;
    }

    // 取消之前的定时器
    if (this.saveTimer !== null) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    const timeSinceLastSave = now - this.lastSaveTime;

    // 如果距离上次保存已经接近或超过最大间隔，立即保存
    if (timeSinceLastSave >= this.MAX_INTERVAL - 100) { // 留100ms缓冲
      this.executeSaveImmediately(options);
      return;
    }

    // 设置新的延迟保存
    this.saveTimer = window.setTimeout(() => {
      this.executeSave();
    }, this.DELAY_TIME);

    console.debug(`延迟保存已安排，${this.DELAY_TIME}ms后执行`);
  }

  /**
   * 立即执行保存
   */
  private async executeSaveImmediately(options: SaveOptions<T>): Promise<void> {
    // 清除可能的延迟定时器
    if (this.saveTimer !== null) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    await this.executeSave(options.force ? 'force' : 'immediate');
  }

  /**
   * 执行保存操作
   */
  private async executeSave(reason: 'delay' | 'immediate' | 'force' | 'interval' | 'pending' = 'delay'): Promise<void> {
    if (this.isSaving) {
      this.pendingSave = true;
      console.debug('已有保存操作进行中，标记为待处理');
      return;
    }

    if (this.lastGetData === null) {
      console.debug('无数据需要保存');
      return;
    }

    const now = Date.now();
    const timeSinceLastSave = now - this.lastSaveTime;

    // 检查是否达到最小保存间隔
    if (timeSinceLastSave < this.MIN_INTERVAL && reason !== 'force') {
      console.debug(`距离上次保存仅${timeSinceLastSave}ms，跳过`);
      return;
    }

    this.isSaving = true;
    const saveData = this.lastGetData();

    try {
      console.debug(`开始保存，原因: ${reason}`);

      // 执行保存函数
      await this.saveFunction(saveData);

      this.lastSaveTime = now;

      const result: SaveResult = {
        success: true,
        timestamp: now,
        reason
      };

      this.onSaveSuccess?.(result);
      console.debug('保存成功', result);

    } catch (error) {
      console.error('保存失败:', error);
      this.onSaveError?.(error);

    } finally {
      this.isSaving = false;

      // 检查是否有待处理的保存请求
      if (this.pendingSave) {
        this.pendingSave = false;
        console.debug('执行待处理的保存请求');
        setTimeout(() => this.executeSave('pending'), 100);
      }
    }
  }

  /**
   * 获取保存状态信息
   */
  public getStatus(): {
    isSaving: boolean;
    hasPendingSave: boolean;
    timeSinceLastSave: number;
    hasTimer: boolean;
  } {
    return {
      isSaving: this.isSaving,
      hasPendingSave: this.pendingSave,
      timeSinceLastSave: Date.now() - this.lastSaveTime,
      hasTimer: this.saveTimer !== null
    };
  }

  /**
   * 手动强制保存
   */
  public async forceSave(): Promise<void> {
    if (this.lastGetData) {
      await this.executeSaveImmediately({ getData: this.lastGetData, force: true });
    }
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    if (this.saveTimer !== null) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.pendingSave = false;
  }
}