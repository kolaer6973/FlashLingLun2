import { _decorator, Component, tween, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Falling')
export class Falling extends Component {
    @property dropDist: number = 200;    // 向下移动的距离（像素）
    @property downTime: number = 1.5;    // 向下（慢慢）的时长，越大越慢
    @property upTime: number = 0.5;      // 向上（迅速）的时长，越小越快

    start() {
        // 下坠：慢慢往下（缓冲）→ 迅速弹回（顶部再缓一下），循环
        tween(this.node)
            .by(this.downTime, { position: new Vec3(0, -this.dropDist, 0) }, { easing: 'sineInOut' })
            .by(this.upTime, { position: new Vec3(0, this.dropDist, 0) }, { easing: 'sineOut' })
            .union()
            .repeatForever()
            .start();

        // 身体轻微倾斜，让下坠更生动（动的是 angle，和 position 不冲突）
        tween(this.node)
            .to(1.5, { angle: -5 }, { easing: 'sineInOut' })
            .to(1.5, { angle: 5 }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();
    }
}
