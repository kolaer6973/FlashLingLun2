import { _decorator, Component, Node, Vec3, UITransform, input, Input, EventTouch, EventKeyboard, KeyCode, tween, UIOpacity, Sprite, SpriteFrame, isValid } from 'cc';
import { LoadingController } from './LoadingController';
import { isWalkable } from './WalkMask';
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
    @property(Node) clickArea: Node = null;  // 点击区域（地图背景），点它才移动
    @property(Node) blockerRoot: Node = null; // 阻挡区容器：它的每个子节点都是一个矩形阻挡
    @property(Node) visual: Node = null;     // 形象子节点（贴图挂这里，走动起伏只影响它）
    @property(Node) shadow: Node = null;     // 脚下阴影（身体抬起时缩小，落地感更强）
    @property(Sprite) bodySprite: Sprite = null;        // 形象上的 Sprite（换帧动画用）
    @property([SpriteFrame]) walkFrames: SpriteFrame[] = [];  // 走路序列帧
    @property walkFps: number = 8;                      // 每秒播放几帧
    @property(SpriteFrame) idleFrame: SpriteFrame = null;    // 站立时的那一帧
    @property speed: number = 320;          // 移动速度（像素/秒）
    @property reachDist: number = 4;        // 离目标小于这个距离就算走到了

    @property({ tooltip: '加速度（像素/秒²）：起步渐快，不会瞬间满速' })
    accel: number = 1400;
    @property({ tooltip: '靠近终点这个距离内开始减速' })
    slowRadius: number = 90;
    @property({ tooltip: '减速时的最低速度，别慢到像卡住' })
    minSpeed: number = 70;
    @property({ tooltip: '每一步身体抬高多少像素' })
    stepHeight: number = 5;
    @property({ tooltip: '步频：每秒起伏几次' })
    stepFreq: number = 9;

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
    private onArrive: (() => void) | null = null;   // 走到目标后的回调（篝火用）
    private facing = 1;                   // 1 = 朝右，-1 = 朝左
    private bobT = 0;                     // 起伏计时
    private curSpeed = 0;                  // 当前速度（做加减速用）
    private stepT = 0;                     // 步伐计时
    private frameT = 0;                    // 帧动画计时
    private frameIndex = 0;
    private visualBaseScale = new Vec3(1, 1, 1);
    private baseScale = new Vec3(1, 1, 1);   // 记下原始缩放，翻转/起伏都以它为基准

    onLoad() {
        console.log('[主角] PlayerController 已启动, 节点=' + this.node.name + ', mapRoot=' + (this.mapRoot ? this.mapRoot.name : '空'));
        this.baseScale = this.node.scale.clone();
        if (this.visual) this.visualBaseScale = this.visual.scale.clone();
        // 点击「地图背景」节点来移动：不用全局 input，这样点篝火按钮时不会同时触发移动
        if (this.clickArea) this.clickArea.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    /** 让角色走到某个点（mapRoot 局部坐标），到达后执行回调 */
    public walkTo(point: Vec3, onArrive?: () => void) {
        this.target = this.resolveTarget(point.clone());
        this.moving = true;
        this.onArrive = onArrive || null;
        this.dismissHint();
    }

    onDestroy() {
        // 切场景时节点会先被销毁，这里的引用随时可能是 null / 已销毁，必须严格判断
        if (isValid(this.clickArea, true)) {
            this.clickArea.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        }
        // input 是全局单例，和节点销毁无关，必须每次都解绑（否则监听泄漏到下一个场景）
        if (input) input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
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

    // 网格判定 + 矩形阻挡，两者都通过才算能站
    private isWalkableAt(x: number, y: number): boolean {
        if (!isWalkable(x, y)) return false;
        return !this.isInBlocker(x, y);
    }

    // 是否落在任何一个矩形阻挡区内
    private isInBlocker(x: number, y: number): boolean {
        if (!this.blockerRoot || !this.mapRoot) return false;
        const mapUT = this.mapRoot.getComponent(UITransform);
        if (!mapUT) return false;
        // 地图局部坐标 -> 世界坐标，再转进每个阻挡框的局部坐标来比较
        const world = mapUT.convertToWorldSpaceAR(new Vec3(x, y, 0));
        const kids = this.blockerRoot.children;
        for (let i = 0; i < kids.length; i++) {
            const ut = kids[i].getComponent(UITransform);
            if (!ut) continue;
            const l = ut.convertToNodeSpaceAR(world);
            if (Math.abs(l.x) <= ut.width * 0.5 && Math.abs(l.y) <= ut.height * 0.5) return true;
        }
        return false;
    }

    /**
     * 把目标点修正成「能站的点」。
     * 点在湖里或崖壁上时，沿「目标 -> 角色当前位置」的连线往回退，
     * 直到踩到第一个可走格子 —— 效果就是角色走到岸边/崖脚就停下。
     */
    private resolveTarget(p: Vec3): Vec3 {
        if (this.isWalkableAt(p.x, p.y)) return p;
        const from = this.node.position;
        for (let t = 0.05; t <= 1.0; t += 0.05) {
            const x = p.x + (from.x - p.x) * t;
            const y = p.y + (from.y - p.y) * t;
            if (this.isWalkableAt(x, y)) return new Vec3(x, y, 0);
        }
        return from.clone();   // 实在找不到就原地不动
    }

    private onTouchEnd(event: EventTouch) {
        if (!this.canMove || !this.mapRoot) return;

        const ui = event.getUILocation();                                  // 屏幕坐标（左下角为原点）
        const ut = this.mapRoot.getComponent(UITransform);
        if (!ut) return;
        const local = ut.convertToNodeSpaceAR(new Vec3(ui.x, ui.y, 0));    // 转成 mapRoot 局部坐标

        // 夹在可行走矩形内：点得再远，角色也只走到边界
        const clamped = new Vec3(
            Math.min(this.maxX, Math.max(this.minX, local.x)),
            Math.min(this.maxY, Math.max(this.minY, local.y)),
            0
        );
        console.log('[主角] 点击地图 -> 目标=(' + clamped.x.toFixed(0) + ',' + clamped.y.toFixed(0) + ')');
        this.target = this.resolveTarget(clamped);
        this.moving = true;
        this.dismissHint();
    }

    // 临时导航：按 ESC 回选关（第一章还没有正式 UI，先留个退路）
    private onKeyDown(event: EventKeyboard) {
        if (event.keyCode === KeyCode.ESCAPE) LoadingController.goto('LevelSelect');
    }

    // 每帧朝目标走一小段。乘 deltaTime 才能保证不同帧率下速度一致。
    // 每帧朝目标走一小段。乘 deltaTime 才能保证不同帧率下速度一致。
    update(dt: number) {
        if (!this.moving || !this.target) {
            this.curSpeed = 0;
            this.resetVisual();
            return;
        }

        const pos = this.node.position;
        const dx = this.target.x - pos.x;
        const dy = this.target.y - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= this.reachDist) {
            this.node.setPosition(this.target);
            this.moving = false;
            this.curSpeed = 0;
            this.resetVisual();
            const cb = this.onArrive;
            this.onArrive = null;
            if (cb) cb();
            return;
        }

        // 起步加速、临近终点减速 —— 这一段决定了「有没有走起来的感觉」
        let maxSpeed = this.speed;
        if (dist < this.slowRadius) {
            maxSpeed = Math.max(this.minSpeed, this.speed * dist / this.slowRadius);
        }
        this.curSpeed = Math.min(maxSpeed, this.curSpeed + this.accel * dt);

        // 这一帧最多走 curSpeed*dt，但不能超过剩余距离（否则会冲过头、左右来回抖）
        const step = Math.min(this.curSpeed * dt, dist);
        this.node.setPosition(
            pos.x + (dx / dist) * step,
            pos.y + (dy / dist) * step,
            pos.z
        );

        // 朝向：贴图默认朝左，所以往右走要翻转（facing=-1），往左走保持原样
        if (dx > 0.5) this.facing = -1;
        else if (dx < -0.5) this.facing = 1;

        // 走路：播放序列帧（不用整体上下弹，弹起来会显得鬼畜）
        this.playWalkAnimation(dt);
        this.applyScale(1);
    }

    // 按固定帧率循环播放走路序列帧
    private playWalkAnimation(dt: number) {
        const frames = this.walkFrames;
        if (!this.bodySprite || !frames || frames.length < 2) return;
        this.frameT += dt;
        const per = 1 / Math.max(1, this.walkFps);
        while (this.frameT >= per) {
            this.frameT -= per;
            this.frameIndex = (this.frameIndex + 1) % frames.length;
            this.bodySprite.spriteFrame = frames[this.frameIndex];
        }
    }

    // 站立/到达时把形象节点复位，并且回到站立帧
    private resetVisual() {
        if (this.visual) this.visual.setPosition(0, 0, 0);
        if (this.shadow) this.shadow.setScale(1, 1, 1);
        if (this.bodySprite && this.idleFrame) this.bodySprite.spriteFrame = this.idleFrame;
        this.frameT = 0;
        this.frameIndex = 0;
        this.applyScale(1);
    }

    // 统一处理缩放：横向乘朝向，纵向乘起伏系数，都以原始缩放为基准
    private applyScale(bobFactor: number) {
        const target = this.visual || this.node;
        const base = this.visual ? this.visualBaseScale : this.baseScale;
        target.setScale(
            base.x * this.facing * bobFactor,
            base.y * bobFactor,
            base.z
        );
    }

    /** 给外部查询某个点能不能站（篝火找站位用） */
    public isPointWalkable(x: number, y: number): boolean {
        return this.isWalkableAt(x, y);
    }

    /** 是否正在移动（剧情触发判定用） */
    public get isMoving(): boolean {
        return this.moving;
    }

    /** 立刻停住（例如触发对话、进入战斗前调用） */
    public stop() {
        this.moving = false;
        this.target = null;
        this.curSpeed = 0;
        this.resetVisual();
    }
}
