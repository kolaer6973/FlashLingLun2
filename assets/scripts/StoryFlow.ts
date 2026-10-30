import { _decorator, Component, Node } from 'cc';
import { BlackNarration } from './BlackNarration';
import { DialogueBox } from './DialogueBox';
import { PlayerController } from './PlayerController';
import { CH1_OPENING_BLACK, CH1_OPENING, CH1_FIRE, CH1_BEAR, CH1_ENDING } from './StoryData';
const { ccclass, property } = _decorator;

/**
 * 第一章流程控制。
 *
 * 流程：
 *   黑屏旁白（坠崖）→ 淡出 → 醒来对话 → 允许移动
 *   点篝火 → 篝火剧情（火堆 + 玉笛）→ 自动接熊 → 战斗
 *   战斗胜利回到本场景 → 收尾对话 → 回选关
 */
@ccclass('StoryFlow')
export class StoryFlow extends Component {
    @property(BlackNarration) narration: BlackNarration = null;
    @property(DialogueBox) dialogue: DialogueBox = null;
    @property(PlayerController) player: PlayerController = null;

    @property([Node]) bubbles: Node[] = [];   // 所有提示气泡；开场前先藏起来
    @property(Node) moveHint: Node = null;    // 「点击地面移动」提示

    private started = false;

    start() {
        this.playOpening();
    }

    // ---------- 开场 ----------
    private playOpening() {
        this.started = true;
        this.setCanMove(false);
        this.setBubbles(false);
        if (this.moveHint) this.moveHint.active = false;

        if (!this.narration) {
            this.playOpeningDialogue();
            return;
        }
        this.narration.play(CH1_OPENING_BLACK, () => {
            this.playOpeningDialogue();
        });
    }

    private playOpeningDialogue() {
        if (!this.dialogue) {
            this.enterExplore();
            return;
        }
        this.dialogue.show(CH1_OPENING, () => {
            this.enterExplore();
        });
    }

    /** 进入自由探索：可以走动了，气泡亮起来 */
    private enterExplore() {
        this.setCanMove(true);
        this.setBubbles(true);
        if (this.moveHint) this.moveHint.active = true;
    }

    // ---------- 点篝火后由 Campfire 调用 ----------
    public playFireStory(onFinish?: () => void) {
        if (!this.dialogue) { if (onFinish) onFinish(); return; }
        this.dialogue.show(CH1_FIRE, () => {
            if (onFinish) onFinish();
        });
    }

    // ---------- 篝火剧情结束后：接熊 ----------
    public playBearStory(onFinish?: () => void) {
        if (!this.dialogue) { if (onFinish) onFinish(); return; }
        this.dialogue.show(CH1_BEAR, () => {
            if (onFinish) onFinish();
        });
    }

    // ---------- 战斗胜利后：收尾 ----------
    public playEnding(onFinish?: () => void) {
        if (!this.dialogue) { if (onFinish) onFinish(); return; }
        this.dialogue.show(CH1_ENDING, () => {
            if (onFinish) onFinish();
        });
    }

    // ---------- 工具 ----------
    private setCanMove(v: boolean) {
        if (this.player) this.player.canMove = v;
    }

    private setBubbles(v: boolean) {
        for (const b of this.bubbles) {
            if (b) b.active = v;
        }
    }
}