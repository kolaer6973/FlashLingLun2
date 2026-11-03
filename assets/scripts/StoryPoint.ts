import { _decorator, Component, Node, Vec3, tween, UIOpacity, isValid } from 'cc';
import { PlayerController } from './PlayerController';
import { StoryFlow } from './StoryFlow';
import { ChapterProgress } from './ChapterProgress';
const { ccclass, property } = _decorator;

/**
 * 剧情点：地图上可以点击、会触发剧情的地标。
 *
 * 交互：点击 → 藏掉气泡 → 主角走过去 → 到达后：
 *   · 剧情还没看过 → 播对应剧情
 *   · 已经看过了   → 只弹一句提示（「火还在烧着，但是什么都没有了」）
 *
 * pointId：'fire' 篝火 / 'convoy' 车队
 */
@ccclass('StoryPoint')
export class StoryPoint extends Component {
    @property({ tooltip: "剧情点 id：fire = 篝火，convoy = 车队" })
    pointId: string = 'fire';

    @property(PlayerController) player: PlayerController = null;
    @property(StoryFlow) flow: StoryFlow = null;

    @property(Node) visual: Node = null;
    @property(Node) glow: Node = null;
    @property(Node) bubble: Node = null;

    @property({ tooltip: '玩家站在目标点多远' })
    standOffsetX: number = 85;
    @property standOffsetY: number = 0;

    private busy = false;

    onLoad() {
        this.node.on(Node.EventType.TOUCH_END, this.onClick, this);
        if (this.visual) this.startBreathing();
    }

    onDestroy() {
        if (isValid(this.node)) this.node.off(Node.EventType.TOUCH_END, this.onClick, this);
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

    /** 这处剧情是不是已经过完了 */
    private isDone(): boolean {
        if (this.pointId === 'convoy') return ChapterProgress.tianyuDefeated;
        return ChapterProgress.bearDefeated;
    }

    private onClick() {
        if (this.busy || !this.player) return;
        this.busy = true;

        if (this.bubble && this.bubble.active) this.bubble.active = false;

        tween(this.node)
            .to(0.08, { scale: new Vec3(0.92, 0.92, 1) })
            .to(0.14, { scale: new Vec3(1, 1, 1) })
            .start();

        this.walkTo(() => {
            this.busy = false;
            if (!this.flow) return;
            if (this.isDone()) {
                this.flow.showEmptyHint(this.pointId);
                return;
            }
            if (this.pointId === 'convoy') this.flow.playConvoyStory();
            else this.flow.playFireStory();
        });
    }

    /** 走到这个剧情点旁边，到了再执行 cb */
    private walkTo(cb: () => void) {
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
        this.player.walkTo(target, cb);
    }
}