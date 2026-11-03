/**
 * 章节进度（内存里记，切场景不丢；关掉游戏就没了）。
 *
 * 第一章的推进顺序：
 *   开场 → 打败棕熊(bearDefeated) → 车队遇袭 → 打败面纱女子(tianyuDefeated) → 第一章完
 */
export class ChapterProgress {
    /** 是否已经看过开场（黑屏旁白 + 醒来对话）；看过就不重播 */
    static sawOpening: boolean = false;

    /** 第一章中途 BOSS：棕熊 */
    static bearDefeated: boolean = false;

    /** 第一章终章 BOSS：面纱女子（天羽） */
    static tianyuDefeated: boolean = false;

    /** 第一章收尾是否已经演过（演过就不再重复播，让玩家能回地图逛） */
    static sawEnding: boolean = false;

    /** 主线是否完成：两个 BOSS 都打赢了 */
    static get mainDone(): boolean {
        return ChapterProgress.tianyuDefeated;
    }

    static reset() {
        ChapterProgress.bearDefeated = false;
        ChapterProgress.tianyuDefeated = false;
    }
}