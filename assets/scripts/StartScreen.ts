import { _decorator, Component, input, Input, director } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 标题屏：点击屏幕任意位置进入主菜单。
 * 挂在标题屏场景的任意节点上（如 Canvas）。
 */
@ccclass('StartScreen')
export class StartScreen extends Component {
    onLoad() {
        input.on(Input.EventType.TOUCH_START, this.startGame, this);
    }

    startGame() {
        director.loadScene('MainMenu');   // 点击任意位置，加载主菜单
    }

    onDestroy() {
        input.off(Input.EventType.TOUCH_START, this.startGame, this);   // 移除监听，防泄漏
    }
}
