import { _decorator, Component, Node, Label, Sprite, SpriteFrame, UITransform, UIOpacity, tween, Tween, Vec3, resources, isValid } from 'cc';
import { Line } from './StoryData';
const { ccclass, property } = _decorator;

/**
 * Galgame 对话框：背景插画 + 左侧立绘 + 逐字正文 + 点击推进。
 *
 * 挂法：挂在一个全屏节点（1920x1080）上，节点初始 active = false。
 *
 * 层级（子节点顺序，越靠后越上层）：
 *   背景插画 -> 立绘 -> 底板 -> 说话人 -> 正文 -> 继续提示
 *
 * 资源规则：
 *   插画放 assets/resources/cg/xxx.png
 *   立绘放 assets/resources/portrait/xxx.png
 *   台词里写名字（不带后缀），运行时按需加载并缓存
 */
@ccclass('DialogueBox')
export class DialogueBox extends Component {
    @property(Sprite) bgSprite: Sprite = null;         // 背景插画（可选）
    @property([Node]) portraits: Node[] = [];          // 所有立绘节点（节点名 = 角色名，默认全部隐藏）
    @property(Node) portraitFrame: Node = null;        // 立绘的框（有立绘才显示）
    @property(Label) speakerLabel: Label = null;       // 说话人
    @property(Label) textLabel: Label = null;          // 正文
    @property(Node) continueHint: Node = null;         // 「▼ 点击继续」

    @property({ tooltip: '每个字停留多少秒，越小越快' })
    charInterval: number = 0.035;

    @property({ tooltip: '有立绘时正文向右移动多少像素，避免被立绘挡住' })
    textIndent: number = 260;

    private lines: Line[] = [];
    private index = 0;
    private typing = false;
    private fullText = '';
    private charT = 0;
    private charCount = 0;
    private onDone: (() => void) | null = null;

    private currentCg = '';
    private frameCache: { [key: string]: SpriteFrame } = {};

    // 记录文字的原始位置，有/无立绘时来回平移
    private baseSpeakerX = 0;
    private baseSpeakerY = 0;
    private baseTextX = 0;
    private baseTextY = 0;
    private baseTextWidth = 0;

    onLoad() {
        // 注意：不要在这里写 this.node.active = false
        // 节点在场景里本来就是关着的；如果这里再关一次，
        // show() 刚把 active 设成 true，onLoad 又会立刻把它关掉
        this.node.on(Node.EventType.TOUCH_END, this.onClick, this);
        if (this.speakerLabel) {
            this.baseSpeakerX = this.speakerLabel.node.position.x;
            this.baseSpeakerY = this.speakerLabel.node.position.y;
        }
        if (this.textLabel) {
            this.baseTextX = this.textLabel.node.position.x;
            this.baseTextY = this.textLabel.node.position.y;
            const ut = this.textLabel.node.getComponent(UITransform);
            if (ut) this.baseTextWidth = ut.width;
        }
    }

    onDestroy() {
         if (isValid(this.node)) this.node.off(Node.EventType.TOUCH_END, this.onClick, this);
    }

    /** 播放一段对话，播完执行回调 */
    public show(lines: Line[], onDone?: () => void) {
        if (!lines || lines.length === 0) {
            if (onDone) onDone();
            return;
        }
        this.lines = lines;
        this.index = 0;
        this.onDone = onDone || null;
        this.currentCg = '';
        if (this.bgSprite) this.bgSprite.node.active = false;
        this.node.active = true;
        this.startLine();
    }

    public get isShowing(): boolean {
        return this.node.active;
    }

    // ---------- 每一句 ----------
    /** 每句开始时回调（StoryFlow 用来做震动等演出） */
    public onLineStart: ((line: any) => void) | null = null;

    private startLine() {
        const line = this.lines[this.index];

        if (this.speakerLabel) this.speakerLabel.string = line.speaker || '';

        if (this.onLineStart) this.onLineStart(line);
        this.applyCg(line.cg);
        this.applyPortrait(line.portrait);

        this.fullText = line.text || '';
        this.charCount = 0;
        this.charT = 0;
        this.typing = true;
        if (this.textLabel) this.textLabel.string = '';
        if (this.continueHint) this.continueHint.active = false;
    }

    // ---------- 背景插画 ----------
    // 规则：台词写了 cg 才换图；没写就沿用上一张，直到出现下一张。
    private applyCg(name?: string) {
        if (!this.bgSprite) return;
        if (!name) return;
        if (name === this.currentCg) { this.bgSprite.node.active = true; return; }
        this.currentCg = name;
        this.bgSprite.node.active = true;
        this.loadFrame('cg', name, (f) => {
            if (!f || !this.bgSprite) return;
            this.bgSprite.spriteFrame = f;
            this.fadeInCg();
        });
    }

    /** 画面震动（插画抖一下） */
    public shake(strength: number = 14, duration: number = 0.45) {
        if (!this.bgSprite) return;
        const n = this.bgSprite.node;
        const p = n.position.clone();
        const s = strength;
        Tween.stopAllByTarget(n);
        tween(n)
            .to(0.04, { position: new Vec3(p.x + s, p.y + s * 0.6, 0) })
            .to(0.04, { position: new Vec3(p.x - s * 0.85, p.y - s * 0.7, 0) })
            .to(0.04, { position: new Vec3(p.x + s * 0.6, p.y + s * 0.45, 0) })
            .to(0.05, { position: new Vec3(p.x - s * 0.35, p.y - s * 0.3, 0) })
            .to(duration * 0.4, { position: p })
            .start();
    }

    private fadeInCg() {
        if (!this.bgSprite) return;
        const op = this.bgSprite.node.getComponent(UIOpacity) || this.bgSprite.node.addComponent(UIOpacity);
        op.opacity = 0;
        tween(op).to(0.28, { opacity: 255 }).start();
    }

    // ---------- 立绘 ----------
    // 场景里预先摆好所有立绘（默认 active=false），
    // 台词写 portrait: '伶伦' 就把名叫「伶伦」的那个节点激活，其余关掉。
    private applyPortrait(name?: string) {
        let shown = false;
        for (const n of this.portraits) {
            if (!n) continue;
            const on = !!name && n.name === name;
            if (n.active !== on) n.active = on;   // 只在状态变化时才写，避免多余刷新
            if (on) shown = true;
        }
        // 一个立绘都没有时，框也一起藏起来
        if (this.portraitFrame) this.portraitFrame.active = shown;
        this.shiftText(0);   // 立绘在框外，文字不缩进
    }
    // 把说话人和正文整体左右平移（0 = 原位）
    // 有立绘时同时收窄正文宽度，保证右边界不被推出面板
    private shiftText(dx: number) {
        if (this.speakerLabel) {
            this.speakerLabel.node.setPosition(this.baseSpeakerX + dx, this.baseSpeakerY, 0);
        }
        if (this.textLabel) {
            this.textLabel.node.setPosition(this.baseTextX + dx, this.baseTextY, 0);
            const ut = this.textLabel.node.getComponent(UITransform);
            if (ut && this.baseTextWidth > 0) {
                ut.width = Math.max(200, this.baseTextWidth - dx);
            }
        }
    }

    // ---------- 资源加载（带缓存） ----------
    private loadFrame(dir: string, name: string, cb: (f: SpriteFrame | null) => void) {
        const path = dir + '/' + name;
        const cached = this.frameCache[path];
        if (cached) {
            cb(cached);
            return;
        }
        resources.load(path + '/spriteFrame', SpriteFrame, (err, frame) => {
            if (err || !frame) {
                console.log('[对话] 图片加载失败: resources/' + path);
                cb(null);
                return;
            }
            this.frameCache[path] = frame;
            cb(frame);
        });
    }

    // ---------- 打字机 ----------
    update(dt: number) {
        if (!this.typing) return;

        this.charT += dt;
        const per = Math.max(0.005, this.charInterval);
        while (this.charT >= per) {
            this.charT -= per;
            this.charCount++;
            if (this.charCount >= this.fullText.length) {
                this.finishTyping();
                return;
            }
            if (this.textLabel) this.textLabel.string = this.fullText.substring(0, this.charCount);
        }
    }

    private finishTyping() {
        this.typing = false;
        this.charCount = this.fullText.length;
        if (this.textLabel) this.textLabel.string = this.fullText;
        if (this.continueHint) {
            this.continueHint.active = true;
            this.blinkHint();
        }
    }

    private blinkHint() {
        if (!this.continueHint) return;
        const op = this.continueHint.getComponent(UIOpacity) || this.continueHint.addComponent(UIOpacity);
        op.opacity = 255;
        tween(op)
            .to(0.55, { opacity: 90 })
            .to(0.55, { opacity: 255 })
            .union()
            .repeatForever()
            .start();
    }

    // ---------- 点击 ----------
    private onClick() {
        if (this.typing) {
            this.finishTyping();   // 打字中点一下：直接显示全文
            return;
        }
        this.index++;
        if (this.index >= this.lines.length) {
            this.close();
            return;
        }
        this.startLine();
    }

    private close() {
        this.typing = false;
        this.node.active = false;
        const cb = this.onDone;
        this.onDone = null;
        if (cb) cb();
    }
}
