import { _decorator, Component, Node, Vec3, tween, UIOpacity } from 'cc';
import { PlayerController } from './PlayerController';
const { ccclass, property } = _decorator;

/**
 * 篝火地标：可点击的剧情入口。
 *
 * 交互流程（方案 A）：
 *   点击篝火 → 主角走到篝火旁边 → 到达后触发剧情
 *
 * 为什么不用 Button 组件：
 *   Button 的过渡效果需要绑定 Sprite 的颜色/缩放，而我们的动效（呼吸、光晕脉动、
 *   点击回弹）都要用 tween 精确控制，用 Button 反而会互相打架。
 *   直接监听 TOUCH_END 更可控。
 */
@ccclass('Campfire')
export class Campfire extends Component {
    @property(PlayerController) player: PlayerController = null;   // 主角控制器

    @property(Node) visual: Node = null;    // 做呼吸缩放的子节点（放火的那层）
    @property(Node) glow: Node = null;      // 地面光晕子节点（做透明度脉动）

    @property({ tooltip: '玩家站在篝火右边多远（局部坐标）' })
    standOffsetX: number = 95;
    @property standOffsetY: number = 0;

    private busy = false;      // 正在走过去，防止重复点击
    private arrived = false;   // 是否已触发过剧情

    onLoad() {
        this.node.on(Node.EventType.TOUCH_END, this.onClick, this);
        if (this.visual) this.startBreathing();
    }

    onDestroy() {
        this.node.off(Node.EventType.TOUCH_END, this.onClick, this);
    }

    // 呼吸：让玩家一眼看出「这东西能点」
    private startBreathing() {
        this.visual.setScale(1, 1, 1);
        tween(this.visual)
            .to(0.85, { scale: new Vec3(1.05, 1.05, 1) })
            .to(0.95, { scale: new Vec3(0.97, 0.97, 1) })
            .union()
            .repeatForever()
            .start();

        if (this.glow) {
            const op = this.glow.getComponent(UIOpacity) || this.glow.addComponent(UIOpacity);
            op.opacity = 150;
            tween(op)
                .to(1.0, { opacity: 235 })
                .to(1.2, { opacity: 120 })
                .union()
                .repeatForever()
                .start();
        }
    }

    private onClick() {
        if (this.busy || this.arrived || !this.player) return;
        this.busy = true;

        // 点击反馈：整体缩一下再弹回
        tween(this.node)
            .to(0.08, { scale: new Vec3(0.92, 0.92, 1) })
            .to(0.14, { scale: new Vec3(1.0, 1.0, 1) })
            .start();

        // 走到篝火旁边（不是走到篝火中心，否则人站在火里）
        const target = new Vec3(
            this.node.position.x + this.standOffsetX,
            this.node.position.y + this.standOffsetY,
            0
        );

        this.player.walkTo(target, () => {
            this.arrived = true;
            this.busy = false;
            this.onReach();
        });
    }

    /** 到达篝火旁：这里以后接对话框 */
    private onReach() {
        console.log('[篝火] 主角已到达，触发剧情');
        // TODO: 下一步接 DialogueBox
    }
}
