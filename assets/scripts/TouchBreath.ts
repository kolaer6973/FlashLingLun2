import { _decorator, Component, tween, UIOpacity } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 提示文字呼吸动画：透明度 255 → 0 → 255 无限循环（若隐若现）。
 * 挂在提示文字节点上。
 */
@ccclass('TouchBreath')
export class TouchBreath extends Component {
    start() {
        const uiOpacity = this.node.getComponent(UIOpacity);
        // 1.5 秒淡出到透明 → 1.5 秒淡入回来 → 循环
        tween(uiOpacity)
            .to(1.5, { opacity: 0 })
            .to(1.5, { opacity: 255 })
            .union()
            .repeatForever()
            .start();
    }
}
