import { _decorator, Component, Graphics, Button, Color, sys, view } from 'cc';
import { LoadingController } from './LoadingController';
const { ccclass, property } = _decorator;

/**
 * 确认弹窗：点「新的旅途」时弹出，问「是否要开始新的游戏？」。
 *
 * 用法（编辑器里搭）：
 *   Canvas
 *     └─ NewGamePopup（空节点，挂本脚本；脚本只画全屏半透明遮罩）
 *          ├─ Panel      （Sprite，spriteFrame 拖入 textures/ui/弹窗框.png）
 *          │    ├─ TipLabel   （Label，提示文字，文本自己在编辑器填）
 *          │    ├─ ConfirmBtn （Button，确定按钮）
 *          │    └─ CloseBtn   （Button，右上角叉）
 *
 * 弹窗框是图片素材（textures/ui/弹窗框.png，代码生成的白色圆角框），
 * 遮罩由本脚本用 Graphics 画，不需要额外图片。
 */
@ccclass('ConfirmPopup')
export class ConfirmPopup extends Component {
    @property(Button) confirmBtn: Button = null;   // 确定按钮
    @property(Button) closeBtn: Button = null;     // 右上角叉（关闭弹窗）

    // 打开/关闭时的回调（由 MenuController 注入，用于暂停/恢复背景动画和按钮）
    public onOpened: (() => void) | null = null;
    public onClosed: (() => void) | null = null;

    onLoad() {
        this.drawMask();
        if (this.confirmBtn) this.confirmBtn.node.on(Button.EventType.CLICK, this.onConfirm, this);
        if (this.closeBtn) this.closeBtn.node.on(Button.EventType.CLICK, this.onClose, this);
    }

    start() {
        this.hide();   // 进场景先隐藏，等点「新的旅途」才弹
    }

    show() {
        this.node.active = true;
        if (this.onOpened) this.onOpened();
    }

    hide() {
        this.node.active = false;
    }

    // 点「确定」：清空所有关卡存档，恢复背景/按钮，然后进选关
    onConfirm() {
        this.clearSave();
        this.node.active = false;
        if (this.onClosed) this.onClosed();
        LoadingController.goto('LevelSelect');
    }

    // 点右上角叉：不新建存档，恢复背景/按钮，关掉弹窗留在主菜单
    onClose() {
        this.node.active = false;
        if (this.onClosed) this.onClosed();
    }

    // 清空存档：最高分/上次分全部归 0（读档时 || '0' 会显示 0）
    clearSave() {
        for (let i = 1; i <= 3; i++) {
            sys.localStorage.removeItem('level' + i + '_best');
            sys.localStorage.removeItem('level' + i + '_last');
        }
    }

    // 只画全屏半透明深色遮罩，压暗背景、凸显弹窗（弹窗框用图片，不在这里画）
    drawMask() {
        const g = this.node.getComponent(Graphics) || this.node.addComponent(Graphics);
        const vs = view.getVisibleSize();
        g.clear();
        g.fillColor = new Color(15, 25, 40, 160);
        g.rect(-vs.width / 2, -vs.height / 2, vs.width, vs.height);
        g.fill();
    }
}
