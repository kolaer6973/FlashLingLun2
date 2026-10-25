import { _decorator, Component, Node, director, Label, UIOpacity } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('LoadingController')
export class LoadingController extends Component {
    // —— 跨场景传参：static 挂在类上，场景切换不会销毁 ——
    static next: string = '';

    // 所有「切场景」都走这里，代替原来的 director.loadScene('X')
    static goto(target: string) {
        LoadingController.next = target;
        director.loadScene('Loading');
    }

    // —— 编辑器里拖三只律蝶 ——
    @property([Node]) butterflies: Node[] = [];  // 律蝶节点（拖三只进来）

    @property orbitSpeed: number = 80;    // 环绕速度（度/秒）
    @property orbitRadius: number = 120;  // 环绕半径（像素）
    @property stay: number = 1.2;         // 最少停留秒数（中转幻觉感）

    // —— 提示文字（动态轮换）——
    @property(Label) tipLabel: Label = null;   // 提示 Label（拖「提示」节点进来）
    @property([String]) tips: string[] = [];   // 要轮换的话（在面板里一条条填）
    @property tipInterval: number = 1.5;       // 每条提示停留的秒数

    // 背景透明度呼吸（255-100-255）
    @property(Node) background: Node = null;   // 背景节点
    @property bgSpeed: number = 1.5;           // 呼吸速度，越大越快
    @property bgMin: number = 100;             // 透明度最小值
    @property bgMax: number = 255;             // 透明度最大值

    private angle = 0;      // 当前环绕角
    private flapT = 0;      // 扇翅计时
    private elapsed = 0;    // 已停留时间
    private switched = false;
    private tipIndex = 0;   // 当前第几条提示
    private tipTimer = 0;   // 这条提示已停留多久
    private bgOpacity: UIOpacity = null;   // 背景的 UIOpacity 组件
    private bgT = 0;                       // 呼吸计时

    start() {
        // 先显示第一条
        if (this.tipLabel && this.tips.length > 0) {
            this.tipLabel.string = this.tips[0];
        }
        // 缓存背景的 UIOpacity
        if (this.background) {
            this.bgOpacity = this.background.getComponent(UIOpacity);
        }
    }

    update(dt: number) {
        // ① 律蝶绕中心【顺时针】环绕，各自扇翅 + 头朝飞行方向
        this.angle = (this.angle - this.orbitSpeed * dt) % 360;   // 递减 = 顺时针
        this.flapT += dt;

        const n = this.butterflies.length;
        const spacing = 360 / n;   // 等分圆周：三只 → 各差 120°
        for (let i = 0; i < n; i++) {
            const b = this.butterflies[i];
            if (!b) continue;

            const posAngle = this.angle + i * spacing;   // 该只此刻的圆周角（度）
            const rad = posAngle * Math.PI / 180;
            b.setPosition(Math.cos(rad) * this.orbitRadius,
                          Math.sin(rad) * this.orbitRadius, 0);

            // 朝向：头跟着飞行方向转（沿切线）
            b.setRotationFromEuler(0, 0, posAngle - 180);

            // 扇翅（缩放模拟，轻一点）
            const flap = Math.sin(this.flapT * 12 + i * 1.3);
            const fold = (1 - flap) / 2;
            b.setScale(1 - fold * 0.3, 1 + fold * 0.05, 1);
        }

        // 提示文字轮换（有两条以上才轮）
        if (this.tipLabel && this.tips.length > 1) {
            this.tipTimer += dt;
            if (this.tipTimer >= this.tipInterval) {
                this.tipTimer = 0;
                this.tipIndex = (this.tipIndex + 1) % this.tips.length;
                this.tipLabel.string = this.tips[this.tipIndex];
            }
        }

        // 背景呼吸：透明度 255 → 100 → 255（cos 从峰值 255 开始）
        if (this.bgOpacity) {
            this.bgT += dt;
            const mid = (this.bgMax + this.bgMin) / 2;   // 177.5
            const amp = (this.bgMax - this.bgMin) / 2;   // 77.5
            this.bgOpacity.opacity = Math.round(mid + amp * Math.cos(this.bgT * this.bgSpeed));
        }

        // ② 有目标场景才跳；next 为空 = 只是预览，一直待着不跳
        if (!this.switched && LoadingController.next) {
            this.elapsed += dt;
            if (this.elapsed >= this.stay) {
                this.switched = true;
                director.loadScene(LoadingController.next);
            }
        }
    }
}
