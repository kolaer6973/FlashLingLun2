import { _decorator, Component, tween, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 背景呼吸动画：缓慢放大到 1.06 倍再缩回原样，无限循环。
 * 挂在背景节点上，营造「呼吸感」的沉浸效果。
 */
@ccclass('BgBreath')
export class BgBreath extends Component {
    start() {
        // 10 秒放大到 1.06 倍 → 10 秒缩回 1 倍 → 循环
        tween(this.node)
            .to(10, { scale: new Vec3(1.06, 1.06, 1) })
            .to(10, { scale: new Vec3(1, 1, 1) })
            .union()
            .repeatForever()
            .start();
    }
}
