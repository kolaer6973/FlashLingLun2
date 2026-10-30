import { _decorator, Component, Node, Vec3, tween, UIOpacity } from 'cc';
import { PlayerController } from './PlayerController';
import { StoryFlow } from './StoryFlow';
const { ccclass, property } = _decorator;

/**
 * 篝火地标：可点击的剧情入口。
 *
 * 交互：点击 → 藏掉气泡 → 主角走到篝火旁 → 到达后交给 StoryFlow 播剧情。
 */
@ccclass('Campfire')
export class Campfire extends Component {
    @property(PlayerController) player: PlayerController = null;
    @property(StoryFlow) flow: StoryFlow = null;

    @property(Node) visual: Node = null;
    @property(Node) glow: Node = null;
    @property(Node) bubble: Node = null;

    @property({ tooltip: '玩家站在篝火右边多远' })
    standOffsetX: number = 85;
    @property standOffsetY: number = 0;

    private busy = false;

    onLoad() {
        this.node.on(Node.EventType.TOUCH_END, this.onClick, this);
        if (this.visual) this.startBreathing();
    }

    onDestroy() {
        this.node.off(Node.EventType.TOUCH_END, this.onClick, this);
    }

    private startBreathing() {
        this.visual.setScale(1, 1, 1);
        tween(this.visual)
            .to(0.85, { scale: new Vec3(1.05, 1.05, 1) }, { easing: 'sineInOut' })
            .to(0.95, { scale: new Vec3(0.97, 0.97, 1) }, { easing: 'sineInOut' })
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
        if (this.busy || !this.player) return;
        this.busy = true;

        // 点过就藏掉气泡
        if (this.bubble && this.bubble.active) this.bubble.active = false;

        // 点击反馈
        tween(this.node)
            .to(0.08, { scale: new Vec3(0.92, 0.92, 1) })
            .to(0.14, { scale: new Vec3(1, 1, 1) })
            .start();

        // 找一个能站的落脚点
        const px = this.node.position.x;
        const py = this.node.position.y;
        const d = this.standOffsetX;
        const tries = [
            [d, this.standOffsetY], [-d, this.standOffsetY],
            [0, d], [0, -d],
            [d * 0.7, d * 0.7], [-d * 0.7, d * 0.7],
            [d * 0.7, -d * 0.7], [-d * 0.7, -d * 0.7],
        ];
        let target = new Vec3(px + d, py + this.standOffsetY, 0);
        for (const t of tries) {
            if (this.player.isPointWalkable(px + t[0], py + t[1])) {
                target = new Vec3(px + t[0], py + t[1], 0);
                break;
            }
        }

        this.player.walkTo(target, () => this.onReach());
    }

    private onReach() {
        if (!this.flow) {
            console.log('[篝火] 没挂 StoryFlow，跳过剧情');
            this.busy = false;
            return;
        }
        // 篝火剧情 → 熊剧情 → （下一版）进战斗
        this.flow.playFireStory(() => {
            this.flow.playBearStory(() => {
                console.log('[篝火] 熊剧情结束，下一步进战斗');
                this.busy = false;
            });
        });
    }
}