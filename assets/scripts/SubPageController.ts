import { _decorator, Component, Node, Button } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 子页切换（介绍页正文框里的 more-left / more-right 翻子页）：
 *   - subPages：按顺序拖入子页节点（如 特色 / 特色2 / 特色3，或 主角 / 伶伦-神话起源）
 *   - leftBtn / rightBtn：拖入 more-left / more-right 按钮
 *
 * 两种模式（按有没有绑 leftBtn 自动区分）：
 *   - 左右箭头模式（leftBtn + rightBtn 都绑）：非循环翻页，第一子页无左箭头、最后子页无右箭头。
 *   - 单按钮模式（只绑 rightBtn、leftBtn 留空）：点 more-right 循环切换，两个子页时就是来回切，按钮始终显示。
 * 挂在正文框节点上（子页和 more 按钮都是它的子节点）。
 */
@ccclass('SubPageController')
export class SubPageController extends Component {
    @property([Node]) subPages: Node[] = [];      // 子页节点，顺序 = 翻页顺序
    @property(Button) leftBtn: Button = null;     // more-left
    @property(Button) rightBtn: Button = null;    // more-right

    private current = 0;

    start() {
        if (this.leftBtn) this.leftBtn.node.on(Button.EventType.CLICK, this.onPrev, this);
        if (this.rightBtn) this.rightBtn.node.on(Button.EventType.CLICK, this.onNext, this);
        this.show(0);   // 初始显示第一个子页
    }

    onPrev() {
        if (this.current > 0) this.show(this.current - 1);   // 非循环，第一子页不能往左
    }

    onNext() {
        const n = this.subPages.length;
        if (n === 0) return;
        if (this.leftBtn) {
            // 左右箭头模式：非循环，最后子页不能往右
            if (this.current < n - 1) this.show(this.current + 1);
        } else {
            // 单按钮模式（只绑了 more-right）：循环切换，两个子页时就是来回切
            this.show((this.current + 1) % n);
        }
    }

    // 只显示第 index 个子页，其余隐藏；并按位置显隐左右箭头
    show(index: number) {
        this.current = index;
        for (let i = 0; i < this.subPages.length; i++) {
            if (this.subPages[i]) this.subPages[i].active = (i === index);
        }
        const single = !this.leftBtn;   // 只绑了 more-right（leftBtn 留空）= 单按钮模式
        if (this.leftBtn) this.leftBtn.node.active = (index > 0);                                  // 第一子页无左箭头
        if (this.rightBtn) this.rightBtn.node.active = single ? true : (index < this.subPages.length - 1); // 单按钮始终显示；左右模式最后子页无右箭头
    }
}
