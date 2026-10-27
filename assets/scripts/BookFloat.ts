import { _decorator, Component, Vec3, tween } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 书本浮动：让静止的书缓慢上下浮沉，顺便轻微摆动。
 *
 * 为什么用 tween 而不是自己在 update 里算：
 *   tween 已经把「时长、缓动曲线、循环」都封装好了，
 *   同样的效果手写要维护时间和相位，代码还更长。
 *
 * 挂法：挂在「书」节点上，它会自动记住节点当前位置作为基准点。
 */
@ccclass('BookFloat')
export class BookFloat extends Component {
    @property({ tooltip: '上下浮动的幅度（像素），左右各这么多' })
    amplitude: number = 10;

    @property({ tooltip: '从最低浮到最高需要几秒' })
    duration: number = 1.6;

    @property({ tooltip: '左右摆动的角度（度）' })
    swing: number = 1.5;

    /** 节点在编辑器里的原始位置，作为浮动的中心点 */
    private basePos = new Vec3();

    start() {
        // 1. 先记住起始位置——所有浮动都围绕它，不能围绕「当前值」
        this.basePos = this.node.position.clone();

        this.playFloat();
        this.playSwing();
    }

    private playFloat() {
        const up = new Vec3(this.basePos.x, this.basePos.y + this.amplitude, this.basePos.z);
        const down = new Vec3(this.basePos.x, this.basePos.y - this.amplitude, this.basePos.z);

        tween(this.node)
            .to(this.duration, { position: up }, { easing: 'sineInOut' })
            .to(this.duration, { position: down }, { easing: 'sineInOut' })
            .union()          // 把上面两段合成一组
            .repeatForever()  // 重复这一整组（不是只重复最后一段）
            .start();
    }

    private playSwing() {
        // 摆动比浮沉慢一点，两个节奏错开，看起来更自然
        const t = this.duration * 1.7;

        tween(this.node)
            .to(t, { angle: this.swing }, { easing: 'sineInOut' })
            .to(t, { angle: -this.swing }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
    }
}