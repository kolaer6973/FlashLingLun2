import { _decorator, Component, Node } from 'cc';
import { BlackNarration } from './BlackNarration';
import { DialogueBox } from './DialogueBox';
import { PlayerController } from './PlayerController';
import { LoadingController } from './LoadingController';
import { ChapterProgress } from './ChapterProgress';
import {
    CH1_OPENING_BLACK, CH1_OPENING, CH1_FIRE, CH1_BEAR, CH1_ENDING,
    CH1_CONVOY, CH1_TIANYU, CH1_TIANYU_END
} from './StoryData';
const { ccclass, property } = _decorator;

/**
 * 第一章流程控制。
 *
 *   第一次进：黑屏旁白 → 醒来对话 → 自由探索（篝火气泡）
 *   点篝火：火堆+玉笛 → 熊出场（震动）→ 淡黑 → 棕熊战
 *   打赢回来：熊离开的收尾 → 自由探索
 *   打输了：重进本场景直接进探索，不重播开场
 */
@ccclass('StoryFlow')
export class StoryFlow extends Component {
    @property(BlackNarration) narration: BlackNarration = null;
    @property(DialogueBox) dialogue: DialogueBox = null;
    @property(PlayerController) player: PlayerController = null;

    @property(Node) fireBubble: Node = null;
    @property(Node) convoyBubble: Node = null;
    @property(Node) moveHint: Node = null;

    @property({ tooltip: '第二条线（车队→面纱女子）做完后再打开' })
    enableConvoy: boolean = false;

    start() {
        this.wireEffects();

        // ① 面纱女子也打赢了 → 播第一章收尾 → 回选关
        if (ChapterProgress.tianyuDefeated) {
            this.lockPlayer();
            this.showDialogue(CH1_TIANYU_END, () => LoadingController.goto('LevelSelect'));
            return;
        }

        // ② 棕熊打完了 → 播「熊离开」的收尾
        if (ChapterProgress.bearDefeated) {
            this.lockPlayer();
            this.showDialogue(CH1_ENDING, () => {
                this.setCanMove(true);
                if (this.enableConvoy && this.convoyBubble) this.convoyBubble.active = true;
                if (this.moveHint) this.moveHint.active = true;
            });
            return;
        }

        // ③ 看过开场但还没打赢（上次战败）→ 直接进探索
        if (ChapterProgress.sawOpening) {
            this.enterExplore();
            return;
        }

        // ④ 第一次进来 → 开场
        this.playOpening();
    }

    // ---------- 开场 ----------
    private playOpening() {
        this.lockPlayer();
        if (!this.narration) {
            this.showDialogue(CH1_OPENING, () => this.enterExplore());
            return;
        }
        this.narration.play(CH1_OPENING_BLACK, () => {
            this.showDialogue(CH1_OPENING, () => this.enterExplore());
        });
    }

    private enterExplore() {
        ChapterProgress.sawOpening = true;
        this.setCanMove(true);
        if (this.fireBubble) this.fireBubble.active = true;
        if (this.convoyBubble) this.convoyBubble.active = false;
        if (this.moveHint) this.moveHint.active = true;
    }

    // ---------- 篝火：火堆 + 玉笛 → 熊 → 棕熊战 ----------
    public playFireStory(onFinish?: () => void) {
        this.showDialogue(CH1_FIRE, () => {
            this.showDialogue(CH1_BEAR, () => {
                if (onFinish) onFinish();
                this.enterBattle('BossBear');
            });
        });
    }

    // ---------- 车队：遇袭 → 面纱女子 → 面纱女子战（暂时关闭）----------
    public playConvoyStory(onFinish?: () => void) {
        if (!this.enableConvoy) { if (onFinish) onFinish(); return; }
        this.lockPlayer();
        this.showDialogue(CH1_CONVOY, () => {
            this.showDialogue(CH1_TIANYU, () => {
                if (onFinish) onFinish();
                this.enterBattle('BossTianyu');
            });
        });
    }

    // ---------- 战斗 ----------
    public enterBattle(scene: string) {
        // 先淡到黑屏再切场景，避免硬切
        if (this.narration) {
            this.narration.fadeToBlack(0.5, () => LoadingController.goto(scene));
        } else {
            LoadingController.goto(scene);
        }
    }

    // ---------- 工具 ----------
    private showDialogue(lines: any[], onDone?: () => void) {
        if (!this.dialogue) { if (onDone) onDone(); return; }
        this.dialogue.show(lines, onDone);
    }

    private lockPlayer() {
        this.setCanMove(false);
        if (this.fireBubble) this.fireBubble.active = false;
        if (this.convoyBubble) this.convoyBubble.active = false;
        if (this.moveHint) this.moveHint.active = false;
    }

    private setCanMove(v: boolean) {
        if (this.player) this.player.canMove = v;
    }

    /** 把「每句开始」回调接到演出上（画面震动） */
    private wireEffects() {
        if (!this.dialogue) return;
        this.dialogue.onLineStart = (line: any) => {
            if (line && line.shake) this.dialogue.shake(16, 0.45);
        };
    }
}