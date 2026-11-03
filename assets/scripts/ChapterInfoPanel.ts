import { _decorator, Component, Node, Label, UITransform } from 'cc';
import { ChapterProgress } from './ChapterProgress';
const { ccclass, property } = _decorator;

/**
 * 章节信息面板：章节名下方显示「探索进度」条、百分比、主线/支线明细。
 *
 * 进度算法（主线只占 1 份，支线占大头）：
 *     进度 = (主线完成 ? 1 : 0) + 已完成支线数
 *            ────────────────────────────────
 *                   1 + 支线总数
 *
 * 这样主线通关后进度不会直接跳到 100%，玩家一眼看得出「还有支线没探索」。
 *
 * 现在数据来自 Inspector 面板（还没接存档）；以后接存档时只换数据来源，UI 不用改。
 */
@ccclass('ChapterInfoPanel')
export class ChapterInfoPanel extends Component {
    @property(Label) percentLabel: Label = null;   // 「45%」
    @property(Label) detailLabel: Label = null;    // 「主线 1/1 · 支线 1/3」
    @property(Node) fillBar: Node = null;          // 进度条填充（改宽度即改进度）

    @property({ tooltip: '进度条满格时的宽度（像素）' })
    barWidth: number = 420;

    @property({ tooltip: '主线是否已完成' })
    mainDone: boolean = false;

    @property({ tooltip: '已完成的支线条数' })
    sideDone: number = 0;

    @property({ tooltip: '本章支线总数' })
    sideTotal: number = 3;

    start() {
        // 主线进度来自运行时（通关第一章后 ChapterProgress.mainDone 为 true）
        this.mainDone = ChapterProgress.mainDone;
        this.refresh();
    }

    /** 按当前数值刷新 UI。改完 Inspector 里的值后也能手动调用。 */
    refresh() {
        const total = 1 + Math.max(0, this.sideTotal);
        const sideTotal = Math.max(0, this.sideTotal);
        const side = Math.min(Math.max(0, this.sideDone), sideTotal);
        const done = (this.mainDone ? 1 : 0) + side;
        const ratio = total > 0 ? done / total : 0;

        // 进度条：只改宽度，左端固定
        if (this.fillBar) {
            const ut = this.fillBar.getComponent(UITransform);
            if (ut) ut.width = this.barWidth * ratio;
        }
        if (this.percentLabel) {
            this.percentLabel.string = Math.round(ratio * 100) + '%';
        }
        if (this.detailLabel) {
            this.detailLabel.string = '主线 ' + (this.mainDone ? 1 : 0) + '/1 · 支线 ' + side + '/' + sideTotal;
        }
    }
}
