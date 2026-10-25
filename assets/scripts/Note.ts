import { _decorator, Component, Node, Vec3, Sprite, SpriteFrame, UITransform, UIOpacity, Color, tween, resources } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Note')
export class Note extends Component {
    @property
    speed: number = 400;   // 音符下落速度（像素/每秒）

    private t: number = Math.random() * 100;   // 飞舞动画计时器，随机相位避免所有蝴蝶同步
    private trailTimer: number = 0;            // 拖尾粒子生成计时

    private static trailFrame: SpriteFrame = null;   // 拖尾用的淡蓝光点贴图（所有蝴蝶共用一份）
    private static trailLoading: boolean = false;

    onLoad() {
        // 蝴蝶头朝下，看起来是「向下飞」而不是「坠落」
        this.node.setRotationFromEuler(0, 0, 180);
        Note.loadTrailFrame();
    }

    // 从对象池取出时调用：把复用的音符重置成「刚出生」的状态
    reset() {
        this.enabled = true;                       // 重新启用 update（消除时会被停掉）
        this.trailTimer = 0;                       // 拖尾计时清零
        this.t = Math.random() * 100;              // 重新随机相位，避免复用后所有蝴蝶同频扇翅
        this.node.setScale(1, 1, 1);               // 恢复原大小（消除动画会缩到接近 0）
        this.node.setRotationFromEuler(0, 0, 180); // 恢复头朝下
    }

    // 只加载一次拖尾贴图，之后所有蝴蝶复用
    private static loadTrailFrame() {
        if (Note.trailFrame || Note.trailLoading) return;
        Note.trailLoading = true;
        resources.load('effects/光点/spriteFrame', SpriteFrame, (err, frame) => {
            Note.trailLoading = false;
            if (!err) Note.trailFrame = frame;
        });
    }

    update(deltaTime: number) {
        const pos = this.node.position;
        this.node.setPosition(new Vec3(
            pos.x,
            pos.y - this.speed * deltaTime,   // 往下掉
            pos.z
        ));

        // 蝴蝶扇翅：X 温和收窄（不挤扁），只动缩放、不动坐标，不影响判定
        this.t += deltaTime;
        const flap = Math.sin(this.t * 12); // 扇翅
        const fold = (1 - flap) / 2; // 0=展开，1=半合
        this.node.setScale(1 - fold * 0.25, 1 + fold * 0.06, 1); // X 收到 0.75，不再挤扁

        // 拖尾：每隔一段时间在身后留一颗微小的淡蓝光点（极少，避免挡住音符）
        this.trailTimer += deltaTime;
        if (this.trailTimer >= 0.15 && Note.trailFrame) {
            this.trailTimer = 0;
            this.spawnTrail(pos);
        }

        if (this.node.position.y < -500) {
            // 极端兜底：正常由 GameController 在 y<-380（missY）时回收进对象池，
            // 走到这说明 miss 检查没跑（如暂停等），直接销毁兜底
            this.node.destroy();
        }
    }

    // 在蝴蝶身后留一颗淡蓝光点，向上飘并淡出
    private spawnTrail(pos: Vec3) {
        const parent = this.node.parent;
        if (!parent) return;

        const p = new Node('拖尾');
        p.layer = parent.layer;                     // 和音符同一层，确保被 UI 相机渲染
        const ut = p.addComponent(UITransform);
        ut.setContentSize(12, 12);                  // 微小
        const sp = p.addComponent(Sprite);
        sp.spriteFrame = Note.trailFrame;
        sp.sizeMode = Sprite.SizeMode.CUSTOM;
        sp.color = new Color(175, 215, 255, 255);   // 淡蓝
        p.setPosition(pos.x + (Math.random() - 0.5) * 12, pos.y + 25, 0);
        parent.addChild(p);

        const op = p.addComponent(UIOpacity);
        op.opacity = 150;
        tween(p).by(0.4, { position: new Vec3(0, 25, 0) }).start();            // 向上飘
        tween(op).to(0.4, { opacity: 0 }).call(() => p.destroy()).start();      // 淡出后销毁
    }
}
