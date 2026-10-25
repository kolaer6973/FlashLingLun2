import { _decorator, Component, Node, Label, Color } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 卷轴按钮的文字反色：常态黑边白字、悬停黑字白边、按下灰字白边。
 * 卷轴的显示/隐藏由 Button 组件的 SPRITE 过渡负责，本脚本只管文字颜色。
 */
@ccclass('ButtonText')
export class ButtonText extends Component {
    @property(Label) label: Label = null;   // 文字 Label

    // 三态配色（默认：常态黑边白字 / 悬停黑字白边 / 按下灰字白边）
    @property(Color) normalText: Color = new Color(255, 255, 255, 255);
    @property(Color) normalOutline: Color = new Color(0, 0, 0, 255);
    @property(Color) hoverText: Color = new Color(0, 0, 0, 255);
    @property(Color) hoverOutline: Color = new Color(255, 255, 255, 255);
    @property(Color) pressText: Color = new Color(128, 128, 128, 255);
    @property(Color) pressOutline: Color = new Color(255, 255, 255, 255);

    private _hover = false;
    private _press = false;

    onLoad() {
        this.refresh();   // 初始化：常态（黑边白字）
        this.node.on(Node.EventType.MOUSE_ENTER, this.onEnter, this);
        this.node.on(Node.EventType.MOUSE_LEAVE, this.onLeave, this);
        this.node.on(Node.EventType.TOUCH_START, this.onPress, this);
        this.node.on(Node.EventType.TOUCH_END, this.onRelease, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onRelease, this);
    }

    // 组件被禁用时（弹窗期间）立刻回到常态，避免停留在悬停/按下色
    onDisable() {
        this._hover = false;
        this._press = false;
        this.refresh();
    }

    private onEnter() { if (!this.enabled) return; this._hover = true; this.refresh(); }
    private onLeave() { if (!this.enabled) return; this._hover = false; this._press = false; this.refresh(); }
    private onPress() { if (!this.enabled) return; this._press = true; this.refresh(); }
    private onRelease() { if (!this.enabled) return; this._press = false; this.refresh(); }

    private refresh() {
        if (this._press) {
            this.setColor(this.pressText, this.pressOutline);
        } else if (this._hover) {
            this.setColor(this.hoverText, this.hoverOutline);
        } else {
            this.setColor(this.normalText, this.normalOutline);
        }
    }

    private setColor(text: Color, edge: Color) {
        if (this.label) {
            this.label.color = text;
            this.label.outlineColor = edge;
        }
    }
}
