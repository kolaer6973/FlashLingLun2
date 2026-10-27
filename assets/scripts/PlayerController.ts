import { _decorator, Component, Node, Vec3, UITransform, input, Input, EventTouch, EventKeyboard, KeyCode, tween, UIOpacity } from 'cc';
import { LoadingController } from './LoadingController';
const { ccclass, property } = _decorator;

/**
 * 地图角色控制器：点击地面，角色朝点击处匀速走过去。
 *
 * 挂法：挂在「主角」节点上，且主角必须是 mapRoot 的子节点（坐标才能对得上）。
 *
 * 坐标换算思路：
 *   点击事件给的是屏幕坐标（左下角为原点），而角色的 position 是「相对父节点」的局部坐标。
 *   所以先 convertToNodeSpaceAR 把屏幕点换成 mapRoot 的局部坐标，再夹在可行走矩形内。
 */
@ccclass('PlayerController')
export class PlayerController extends Component {
    @property(Node) mapRoot: Node = null;   // 地图根节点（主角的父节点），点击坐标按它换算
    @property(Node) hintNode: Node = null;   // 提示节点：玩家第一次点击后淡出隐藏
    @property speed: number = 320;          // 移动速度（像素/秒）
    @property reachDist: number = 4;        // 离目标小于这个距离就算走到了

    @property({ tooltip: '可行走区域边界（mapRoot 的局部坐标）' })
    minX: number = -820;
    @property maxX: number = 820;
    @property minY: number = -420;
    @property maxY: number = 240;

    @property({ tooltip: '走路时上下轻微起伏，避免完全僵直' })
    bob: boolean = true;

    public canMove = true;   // 对话时外部把它置 false，屏蔽点击移动

    private target: Vec3 | null = null;   // 当前要走到的点（null = 没在走）
    private moving = false;
    private hintHidden = false;            // 提示是否已隐藏
    private facing = 1;                   // 1 = 朝右，-1 = 朝左
    private bobT = 0;                     // 起伏计时
    private baseScale = new Vec3(1, 1, 1);   // 记下原始缩放，翻转/起伏都以它为基准

    onLoad() {
        console.log('[主角] PlayerController 已启动, 节点=' + this.node.name + ', mapRoot=' + (this.mapRoot ? this.mapRoot.name : '空'));
        this.baseScale = this.node.scale.clone();
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    onDestroy() {
        // 一定要解绑：否则切场景后回调仍指向已销毁的节点，会报错
        input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    // 玩家第一次点击后，把提示淡出并隐藏
    private dismissHint() {
        if (this.hintHidden || !this.hintNode) return;
        this.hintHidden = true;
        const op = this.hintNode.getComponent(UIOpacity) || this.hintNode.addComponent(UIOpacity);
        tween(op)
            .to(0.35, { opacity: 0 })
            .call(() => { if (this.hintNode) this.hintNode.active = false; })
            .start();
    }

    private onTouchEnd(event: EventTouch) {
        if (!this.canMove || !this.mapRoot) return;

        const ui = event.getUILocation();                                  // 屏幕坐标（左下角为原点）
        const ut = this.mapRoot.getComponent(UITransform);
        if (!ut) return;
        const local = ut.convertToNodeSpaceAR(new Vec3(ui.x, ui.y, 0));    // 转成 mapRoot 局部坐标

        // 夹在可行走矩形内：点得再远，角色也只走到边界
        this.target = new Vec3(
            Math.min(this.maxX, Math.max(this.minX, local.x)),
            Math.min(this.maxY, Math.max(this.minY, local.y)),
            0
        );
        this.moving = true;
        this.dismissHint();
    }

    // 临时导航：按 ESC 回选关（第一章还没有正式 UI，先留个退路）
    private onKeyDown(event: EventKeyboard) {
        if (event.keyCode === KeyCode.ESCAPE) LoadingController.goto('LevelSelect');
    }

    // 每帧朝目标走一小段。乘 deltaTime 才能保证不同帧率下速度一致。
    update(dt: number) {
        if (!this.moving || !this.target) return;

        const pos = this.node.position;
        const dx = this.target.x - pos.x;
        const dy = this.target.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= this.reachDist) {
            // 到位：直接贴上去，别留一像素的抖动
            this.node.setPosition(this.target);
            this.moving = false;
            this.applyScale(1);
            return;
        }

        // 这一帧最多走 speed*dt，但不能超过剩余距离（否则会冲过头、左右来回抖）
        const step = Math.min(this.speed * dt, dist);
        this.node.setPosition(
            pos.x + (dx / dist) * step,
            pos.y + (dy / dist) * step,
            pos.z
        );

        // 朝向：往右走就朝右，往左走就朝左
        if (dx > 0.5) this.facing = 1;
        else if (dx < -0.5) this.facing = -1;

        if (this.bob) {
            this.bobT += dt;
            this.applyScale(1 + Math.sin(this.bobT * 18) * 0.02);   // 纵向轻微起伏
        } else {
            this.applyScale(1);
        }
    }

    // 统一处理缩放：横向乘朝向，纵向乘起伏系数，都以原始缩放为基准
    private applyScale(bobFactor: number) {
        this.node.setScale(
            this.baseScale.x * this.facing * bobFactor,
            this.baseScale.y * bobFactor,
            this.baseScale.z
        );
    }

    /** 是否正在移动（剧情触发判定用） */
    public get isMoving(): boolean {
        return this.moving;
    }

    /** 立刻停住（例如触发对话、进入战斗前调用） */
    public stop() {
        this.moving = false;
        this.target = null;
        this.applyScale(1);
    }
}
