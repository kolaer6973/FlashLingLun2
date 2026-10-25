import { _decorator, Component, UITransform, Label, Layout, Node, tween, Vec3, instantiate } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 跑马灯滚动组件：挂在「滚动体」节点上，实现无缝循环（文字一直往左滚，头尾相接）。
 *
 * 用法（每一行）：
 *   裁剪框节点（加 Mask 组件 + UITransform 固定宽高）
 *     └─ 滚动体节点（挂本组件，子节点就是要滚的 Label，可多个）
 *
 * 注意：滚动体上不要再挂 Layout 组件（本组件会自己把子节点从左到右贴紧排列，
 *   并自动居中），如果挂了会被自动禁用，建议直接删掉。
 *
 * 规则：
 *   - 内容装得下（比裁剪框窄）→ 居中显示，不滚；
 *   - 内容超宽 → 复制成两份首尾相接，滚动体每移动「一份+间距」就瞬间归零，
 *     因为第二份和第一份一模一样，看起来就是无限循环。
 */
@ccclass('Marquee')
export class Marquee extends Component {
    @property({ tooltip: '备用宽度：只有父节点(Mask框)读不到宽度时才用。一般不用填，会自动读 Mask 框宽度' })
    boxWidth: number = 500;

    @property({ tooltip: '滚动速度（像素/秒）' })
    speed: number = 80;

    @property({ tooltip: '两份内容之间的间距（像素），让循环时首尾不挤在一起' })
    gap: number = 40;

    @property({ tooltip: '切换后停留多久再开始滚动（秒）' })
    initialPause: number = 2;

    private scrollTween: any = null;
    private clones: Node[] = [];
    private pendingStartX = 0;
    private pendingY = 0;
    private pendingLoopW = 0;

    // 文本改完后调用它：先立即归位，再重新量宽、决定滚不滚
    refresh() {
        this.unschedule(this.doRefresh);
        this.stopScroll();
        this.node.setPosition(0, this.node.position.y, 0);   // 立即归位，避免切换瞬间显示上一次滚动残留的位置
        this.scheduleOnce(this.doRefresh, 0.05);
    }

    private doRefresh() {
        this.stopScroll();
        this.removeClone();

        // 禁用滚动体上的 Layout（若用户没删），避免它重排干扰
        const layout = this.node.getComponent(Layout);
        if (layout) layout.enabled = false;

        const originals = this.getOriginals();
        this.forceLabelRefresh(originals);
        const contentW = this.layoutRow(originals);   // 贴紧排列 + 居中，返回内容总宽
        const boxW = this.getBoxWidth();
        const y = this.node.position.y;

        if (contentW <= boxW) {
            this.node.setPosition(0, y, 0);   // 装得下：居中，不滚
            return;
        }

        // 超宽：克隆第二份，先停留 initialPause 秒再开始无缝滚动
        const loopW = contentW + this.gap;
        this.ensureClone(originals, loopW);

        const startX = (contentW - boxW) / 2;   // 让第一份左边缘对齐裁剪框左边缘
        this.node.setPosition(startX, y, 0);

        this.pendingStartX = startX;
        this.pendingY = y;
        this.pendingLoopW = loopW;
        this.unschedule(this.onStartDelayDone);
        this.scheduleOnce(this.onStartDelayDone, this.initialPause);
    }

    // 停留结束后，开始无缝滚动循环
    private onStartDelayDone() {
        const rollTime = this.pendingLoopW / this.speed;
        this.scrollTween = tween(this.node)
            .to(rollTime, { position: new Vec3(this.pendingStartX - this.pendingLoopW, this.pendingY, 0) })  // 向左滚一整份
            .call(() => this.node.setPosition(this.pendingStartX, this.pendingY, 0))                        // 瞬间归零，无缝
            .union()
            .repeatForever()
            .start();
    }

    // 把一组节点从左到右贴紧排好（任意锚点都适用），再整体左移让内容居中，返回总宽
    private layoutRow(nodes: Node[]): number {
        let cursor = 0;
        for (const n of nodes) {
            const ut = n.getComponent(UITransform);
            const w = ut ? ut.width : 0;
            const ax = ut ? ut.anchorX : 0;
            n.setPosition(cursor + ax * w, n.position.y, 0);   // 左边缘对齐 cursor
            cursor += w;
        }
        const total = cursor;
        for (const n of nodes) {
            n.setPosition(n.position.x - total / 2, n.position.y, 0);   // 整体居中
        }
        return total;
    }

    // 克隆第二份，接到第一份后面（偏移一个循环单元宽 loopW）
    private ensureClone(originals: Node[], loopW: number) {
        this.removeClone();
        for (const orig of originals) {
            const c = instantiate(orig);
            c.name = orig.name + '_clone';
            c.setParent(this.node);
            c.setPosition(orig.position.x + loopW, orig.position.y, 0);
            this.clones.push(c);
        }
    }

    private removeClone() {
        for (const c of this.clones) {
            if (c && c.isValid) c.destroy();
        }
        this.clones = [];
    }

    // 原始内容（排除掉克隆出来的第二份）
    private getOriginals(): Node[] {
        return this.node.children.filter(c => !c.name.endsWith('_clone'));
    }

    // 裁剪框宽度：优先读父节点(Mask框)的真实宽度
    private getBoxWidth(): number {
        const parent = this.node.parent;
        if (parent) {
            const ut = parent.getComponent(UITransform);
            if (ut && ut.width > 0) return ut.width;
        }
        return this.boxWidth;
    }

    // 强制子 Label 按最新文本刷新，保证量到的宽度是准的
    private forceLabelRefresh(nodes: Node[]) {
        for (const child of nodes) {
            const label = child.getComponent(Label);
            if (label && (label as any).updateRenderData) {
                (label as any).updateRenderData(true);
            }
        }
    }

    private stopScroll() {
        this.unschedule(this.onStartDelayDone);
        if (this.scrollTween) {
            this.scrollTween.stop();
            this.scrollTween = null;
        }
    }
}
