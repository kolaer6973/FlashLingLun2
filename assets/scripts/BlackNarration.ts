import { _decorator, Component, Node, Label, UIOpacity, tween, isValid } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 黑屏旁白：全黑背景 + 居中文字，点击推进，播完淡出。
 *
 * 用在哪：章节开场（掉崖）、重大转场。
 * 挂法：挂在一个全屏节点上，节点里放「黑底」「中央文字」「提示」三个子节点。
 *      节点初始 active = false。
 */
@ccclass('BlackNarration')
export class BlackNarration extends Component {
    @property(Label) textLabel: Label = null;    // 居中的旁白文字
    @property(Node) hintNode: Node = null;       // 「点击继续」提示

    @property({ tooltip: '每个字停留多少秒' })
    charInterval: number = 0.06;

    @property({ tooltip: '每句显示完后自动停留几秒再进下一句（0 = 必须点击）' })
    autoDelay: number = 0;

    @property({ tooltip: '最后一句结束后淡出多少秒' })
    fadeOut: number = 0.8;

    private lines: string[] = [];
    private index = 0;
    private typing = false;
    private fullText = '';
    private charT = 0;
    private charCount = 0;
    private waitT = 0;
    private onDone: (() => void) | null = null;

    onLoad() {
        // 注意：这里不能写 this.node.active = false（会在 show 后立刻关掉）
        this.node.on(Node.EventType.TOUCH_END, this.onClick, this);
    }

    onDestroy() {
         if (isValid(this.node)) this.node.off(Node.EventType.TOUCH_END, this.onClick, this);
    }

    /** 播放一段黑屏旁白，全部结束后淡出并回调 */
    public play(lines: string[], onDone?: () => void) {
        if (!lines || lines.length === 0) {
            if (onDone) onDone();
            return;
        }
        this.lines = lines;
        this.index = 0;
        this.onDone = onDone || null;

        this.node.active = true;
        const op = this.node.getComponent(UIOpacity) || this.node.addComponent(UIOpacity);
        op.opacity = 255;

        this.startLine();
    }

    private startLine() {
        this.fullText = this.lines[this.index] || '';
        this.charCount = 0;
        this.charT = 0;
        this.waitT = 0;
        this.typing = true;
        if (this.textLabel) this.textLabel.string = '';
        if (this.hintNode) this.hintNode.active = false;
    }

    update(dt: number) {
        if (this.typing) {
            this.charT += dt;
            const per = Math.max(0.01, this.charInterval);
            while (this.charT >= per) {
                this.charT -= per;
                this.charCount++;
                if (this.charCount >= this.fullText.length) {
                    this.finishTyping();
                    return;
                }
                if (this.textLabel) this.textLabel.string = this.fullText.substring(0, this.charCount);
            }
            return;
        }

        // 打字完成后：配置了 autoDelay 就自动翻页
        if (this.autoDelay > 0) {
            this.waitT += dt;
            if (this.waitT >= this.autoDelay) {
                this.waitT = 0;
                this.next();
            }
        }
    }

    private finishTyping() {
        this.typing = false;
        this.charCount = this.fullText.length;
        if (this.textLabel) this.textLabel.string = this.fullText;
        if (this.hintNode) this.hintNode.active = true;
    }

    private onClick() {
        if (this.typing) {
            this.finishTyping();   // 打字中点一下：直接显示全文
            return;
        }
        this.next();
    }

    private next() {
        this.index++;
        if (this.index >= this.lines.length) {
            this.close();
            return;
        }
        this.startLine();
    }

    private close() {
        const op = this.node.getComponent(UIOpacity) || this.node.addComponent(UIOpacity);
        tween(op)
            .to(this.fadeOut, { opacity: 0 })
            .call(() => {
                this.node.active = false;
                const cb = this.onDone;
                this.onDone = null;
                if (cb) cb();
            })
            .start();
    }

    /** 是否正在演出 */
    /** 只把画面淡到全黑，不放文字（用于进战斗、转场） */
    public fadeToBlack(duration: number, onDone?: () => void) {
        this.node.active = true;
        this.typing = false;
        if (this.textLabel) this.textLabel.string = '';
        if (this.hintNode) this.hintNode.active = false;
        const op = this.node.getComponent(UIOpacity) || this.node.addComponent(UIOpacity);
        op.opacity = 0;
        tween(op)
            .to(duration, { opacity: 255 })
            .call(() => { if (onDone) onDone(); })
            .start();
    }

    public get isPlaying(): boolean {
        return this.node.active;
    }
}
