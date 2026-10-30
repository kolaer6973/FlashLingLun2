import { _decorator, Component, Node, Vec3, tween, UIOpacity } from 'cc';
import { PlayerController } from './PlayerController';
import { DialogueBox } from './DialogueBox';
import { CH1_FIRE_SPAWN, CH1_FIRE_FAR } from './StoryData';
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
    @property(DialogueBox) dialogue: DialogueBox = null;   // 对话框
    @property({ tooltip: '0 = 出生点篝火剧情，1 = 远处篝火剧情' })
    story: number = 0;

    @property({ tooltip: '玩家站在篝火右边多远（局部坐标）' })
    standOffsetX: number = 95;
    @property standOffsetY: number = 0;

    private busy = false;      // 正在走过去，防止重复点击

    onLoad() {
        console.log('[篝火] 已启动, 位置=(' + this.node.position.x.toFixed(0) + ',' + this.node.position.y.toFixed(0) + ') 玩家=' + (this.player ? '有' : '空') + ' 对话框=' + (this.dialogue ? '有' : '空'));
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
        console.log('[篝火] 被点击');
        if (this.busy || !this.player) return;   // 只防连点，不阻止再次触发
        this.busy = true;

        // 点击反馈：整体缩一下再弹回
        tween(this.node)
            .to(0.08, { scale: new Vec3(0.92, 0.92, 1) })
            .to(0.14, { scale: new Vec3(1.0, 1.0, 1) })
            .start();

        // 找一个能站的落脚点：优先右侧，其次上下左右各方向试一遍
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
            const tx = px + t[0];
            const ty = py + t[1];
            if (this.player.isPointWalkable(tx, ty)) {
                target = new Vec3(tx, ty, 0);
                break;
            }
        }
        console.log('[篝火] 站位 -> (' + target.x.toFixed(0) + ',' + target.y.toFixed(0) + ')');

        this.player.walkTo(target, () => {
            this.onReach();      // busy 在剧情播完后才释放
        });
    }

    /** 到达篝火旁：弹出对话 */
    private onReach() {
        if (!this.dialogue) {
            console.log('[篝火] 没挂对话框，跳过剧情');
            this.busy = false;
            return;
        }
        const lines = this.story === 1 ? CH1_FIRE_FAR : CH1_FIRE_SPAWN;
        this.dialogue.show(lines, () => {
            console.log('[篝火] 剧情播放完毕');
            this.busy = false;   // 剧情结束，允许再次点击
            // 以后这里接：进音游战斗 / 解锁下一个地标
        });
    }
}
