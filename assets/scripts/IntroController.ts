import { _decorator, Component, Node, Button, director } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 游戏介绍场景：三页（游戏介绍 / 玩法介绍 / 人物介绍），左右箭头翻页，返回按钮回主菜单。
 * 第一页只有右箭头、最后一页只有左箭头（非循环），箭头显隐由脚本按当前页自动控制。
 *
 * 用法（编辑器里搭）：
 *   Canvas
 *     ├─ Page1（总体介绍页：磨砂白背景 Sprite + 文字 Label）
 *     ├─ Page2（玩法介绍页：磨砂白背景 Sprite + 文字 Label）
 *     ├─ Page3（人物介绍页：人物介绍.png Sprite + 文字 Label）
 *     ├─ LeftArrow（左箭头 Button）
 *     ├─ RightArrow（右箭头 Button）
 *     └─ BackBtn（返回 Button）
 *
 * 三个页面节点按顺序拖进 pages 数组，脚本控制「只显示当前页、其余隐藏」。
 * 文案你自己在每页的 Label 里填，脚本不碰文字。
 */
@ccclass('IntroController')
export class IntroController extends Component {
    @property([Node]) pages: Node[] = [];        // 三个页面节点（顺序 = 翻页顺序）
    @property(Button) leftBtn: Button = null;    // 左箭头
    @property(Button) rightBtn: Button = null;   // 右箭头
    @property(Button) backBtn: Button = null;    // 返回按钮

    private currentPage = 0;

    start() {
        if (this.leftBtn) this.leftBtn.node.on(Button.EventType.CLICK, this.onPrev, this);
        if (this.rightBtn) this.rightBtn.node.on(Button.EventType.CLICK, this.onNext, this);
        if (this.backBtn) this.backBtn.node.on(Button.EventType.CLICK, this.onBack, this);
        this.showPage(0);   // 初始显示第一页
    }

    onPrev() {
        if (this.currentPage > 0) this.showPage(this.currentPage - 1);   // 非循环，第一页不能往左
    }

    onNext() {
        if (this.currentPage < this.pages.length - 1) this.showPage(this.currentPage + 1);   // 非循环，最后一页不能往右
    }

    onBack() {
        director.loadScene('MainMenu');   // 返回主菜单（直接跳，不走加载界面）
    }

    // 只显示第 index 页，其余隐藏
    showPage(index: number) {
        this.currentPage = index;
        for (let i = 0; i < this.pages.length; i++) {
            if (this.pages[i]) this.pages[i].active = (i === index);
        }
        // 第一页隐藏左箭头，最后一页隐藏右箭头
        if (this.leftBtn) this.leftBtn.node.active = (index > 0);
        if (this.rightBtn) this.rightBtn.node.active = (index < this.pages.length - 1);
    }
}
