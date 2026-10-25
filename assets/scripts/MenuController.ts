import { _decorator, Component, Node, Button, director, game, sys } from 'cc';
import { LoadingController } from './LoadingController';
import { ConfirmPopup } from './ConfirmPopup';
import { ButtonText } from './ButtonText';
const { ccclass, property } = _decorator;

@ccclass('MenuController')
export class MenuController extends Component {

    @property({ type: Button })
    private startBtn: Button = null;    // 开始按钮

    @property({ type: Button })
    private introBtn: Button = null;    // 介绍按钮

    @property({ type: Button })
    private exitBtn: Button = null;     // 退出按钮

    @property({ type: ConfirmPopup })
    private newGamePopup: ConfirmPopup = null;   // 「新的旅途」确认弹窗

    // 弹窗弹出期间要禁用的所有主菜单按钮（含悬停效果），全部拖进来
    @property([Button])
    private menuButtons: Button[] = [];

    start() {
        // 三个按钮各挂一个点击监听事件
        this.startBtn.node.on(Button.EventType.CLICK, this.onStartGame, this);
        this.introBtn.node.on(Button.EventType.CLICK, this.onIntro, this);
        this.exitBtn.node.on(Button.EventType.CLICK, this.onExit, this);

        // 弹窗打开/关闭时，通知主菜单暂停/恢复背景动画和按钮
        if (this.newGamePopup) {
            this.newGamePopup.onOpened = () => this.onPopupOpened();
            this.newGamePopup.onClosed = () => this.onPopupClosed();
        }
    }

    onStartGame() {
        // 点击「新的旅途」：先弹确认弹窗，点确定清空存档后才进选关
        if (this.newGamePopup) {
            this.newGamePopup.show();
        } else {
            LoadingController.goto('LevelSelect');   // 没挂弹窗就退回直接进选关
        }
    }

    // 弹窗打开：停止背景动画 + 禁用按钮（防止弹窗期间点到别的按钮）
    onPopupOpened() {
        director.pause();
        this.setButtonsEnabled(false);
    }

    // 弹窗关闭：恢复背景动画 + 重新启用按钮
    onPopupClosed() {
        director.resume();
        this.setButtonsEnabled(true);
    }

    // 禁用/启用主菜单所有按钮：interactable 停点击和卷轴过渡，ButtonText.enabled 停悬停变色
    setButtonsEnabled(enabled: boolean) {
        for (const btn of this.menuButtons) {
            if (!btn) continue;
            btn.interactable = enabled;                 // 停点击 + 停 Button 的卷轴过渡
            const bt = btn.node.getComponent(ButtonText);
            if (bt) bt.enabled = enabled;               // 停文字悬停变色（脚本自己监听的 mouse 事件）
        }
    }

    onIntro() {
        director.loadScene('Intro');   // 进入游戏介绍场景（不走加载界面）
    }

    onExit() {
        // 浏览器/编辑器预览里没有真正的「退出」，game.end() 会让预览卡死，直接跳过
        if (sys.isBrowser) return;
        game.end();   // 原生平台（打包成 App）才真正退出游戏
    }
}
