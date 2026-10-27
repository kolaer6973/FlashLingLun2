import { _decorator, Component, Label } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 书名逐字浮现：把 Label 里已经填好的文字，一个字一个字显示出来。
 *
 * 用法：编辑器里把完整书名填进 Label，本组件在 start() 时把文字记下来并清空，
 *      然后按 charInterval 的节奏逐字补回去。
 */
@ccclass('TitleReveal')
export class TitleReveal extends Component {
    @property(Label) label: Label = null;   // 要逐字显示的那个 Label

    @property({ tooltip: '每个字的间隔（秒）' })
    charInterval: number = 0.08;

    @property({ tooltip: '进场后先等多久再开始（秒）' })
    delay: number = 0.3;

    private full = '';       // 完整文字
    private shown = 0;       // 已经显示了多少个字
    private timer = 0;       // 计时

    start() {
        if (!this.label) return;
        this.full = this.label.string;   // 把编辑器里填的文字记下来
        this.label.string = '';          // 先清空

        if (this.charInterval <= 0) {    // 防止除零：间隔为 0 就直接全显示
            this.label.string = this.full;
            this.shown = this.full.length;
        }
    }

    update(dt: number) {
        if (!this.label || this.shown >= this.full.length) return;

        this.timer += dt;
        if (this.timer < this.delay) return;

        // 已经过去的时间能显示几个字
        const n = Math.floor((this.timer - this.delay) / this.charInterval) + 1;
        const count = Math.min(this.full.length, n);

        if (count !== this.shown) {
            this.shown = count;
            this.label.string = this.full.substring(0, count);
        }
    }
}