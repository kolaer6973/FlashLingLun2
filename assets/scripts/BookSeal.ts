import { _decorator, Component, Node, Vec3, UIOpacity, UITransform, tween } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 封条解锁：书腰上贴着纸封条 + 朱印，点击时印章先碎、封条再往左右飘走。
 *
 * 方向靠「锚点」判断，不靠角度：
 *   anchorX = 1 的那半截向左伸展，所以往左飞；
 *   anchorX = 0 的向右伸展，所以往右飞。
 * 这样两半都能保持 angle = 0，纸的撕边不会被翻转。
 */
@ccclass('BookSeal')
export class BookSeal extends Component {
    @property([Node]) strips: Node[] = [];   // 封条的左右两半
    @property(Node) seal: Node = null;       // 中间的朱印

    @property({ tooltip: '封条飞出的距离（像素）' })
    flyOut: number = 320;

    public isLocked = true;
    private busy = false;

    unlock(onDone: () => void) {
        if (!this.isLocked || this.busy) return;
        this.busy = true;

        const strips = this.strips.filter((n) => !!n);
        const total = strips.length + (this.seal ? 1 : 0);
        if (total === 0) { this.finish(onDone); return; }

        let done = 0;
        const oneFinished = () => {
            done++;
            if (done >= total) this.finish(onDone);
        };

        // ① 朱印：抖动 → 放大淡出
        if (this.seal) {
            const seal = this.seal;
            const op = seal.getComponent(UIOpacity) || seal.addComponent(UIOpacity);
            tween(seal)
                .to(0.06, { angle: 6 })
                .to(0.06, { angle: -6 })
                .to(0.06, { angle: 3 })
                .to(0.06, { angle: 0 })
                .to(0.28, { scale: new Vec3(1.25, 1.25, 1) }, { easing: 'quadOut' })
                .call(() => { seal.active = false; oneFinished(); })
                .start();
            tween(op).delay(0.24).to(0.3, { opacity: 0 }).start();
        }

        // ② 封条两半：延迟一点再往左右飞
        for (const s of strips) {
            const ut = s.getComponent(UITransform);
            const dirX = (ut && ut.anchorX > 0.5) ? -1 : 1;   // 靠锚点判断伸展方向
            const outVec = new Vec3(dirX * this.flyOut, 0, 0);
            const op = s.getComponent(UIOpacity) || s.addComponent(UIOpacity);

            tween(s)
                .delay(0.24)
                .by(0.42, { position: outVec }, { easing: 'quadIn' })
                .call(oneFinished)
                .start();
            tween(op).delay(0.24).to(0.42, { opacity: 0 }).start();
        }
    }

    private finish(onDone: () => void) {
        this.isLocked = false;
        this.busy = false;
        if (onDone) onDone();
    }
}