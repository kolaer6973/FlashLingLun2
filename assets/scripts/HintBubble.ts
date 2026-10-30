import { _decorator, Component, Node, Vec3, tween } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 剧情提示气泡：浮在地标上方，上下浮动 + 轻微脉动，
 * 用来告诉玩家「这里有东西可以点」。
 *
 * 用法：挂在气泡节点上，节点初始位置就是它浮动的基准点。
 */
@ccclass('HintBubble')
export class HintBubble extends Component {
    @property({ tooltip: '上下浮动多少像素' })
    floatHeight: number = 8;

    @property({ tooltip: '单程时长（秒），越小越快' })
    duration: number = 1.1;

    @property({ tooltip: '是否同时做缩放脉动' })
    pulse: boolean = true;

    private basePos = new Vec3();
    private started = false;

    start() {
        this.play();
    }

    onEnable() {
        // 被重新激活时重启动画（start 只会跑一次）
        if (this.started) this.play();
    }

    private play() {
        this.started = true;
        this.basePos.set(this.node.position);

        const p0 = new Vec3(this.basePos.x, this.basePos.y, 0);
        const p1 = new Vec3(this.basePos.x, this.basePos.y + this.floatHeight, 0);
        tween(this.node)
            .to(this.duration, { position: p1 }, { easing: 'sineInOut' })
            .to(this.duration, { position: p0 }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();

        if (this.pulse) {
            this.node.setScale(1, 1, 1);
            tween(this.node)
                .to(this.duration, { scale: new Vec3(1.08, 1.08, 1) }, { easing: 'sineInOut' })
                .to(this.duration, { scale: new Vec3(1, 1, 1) }, { easing: 'sineInOut' })
                .union()
                .repeatForever()
                .start();
        }
    }

    /** 剧情已经播过，可以把气泡藏起来 */
    public hide() {
        this.node.active = false;
    }
}