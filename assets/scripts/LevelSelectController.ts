import { _decorator, Component, Node, Sprite, SpriteFrame, Button, director, tween, Vec3, Label, sys, UIOpacity, AudioSource, AudioClip, resources } from 'cc';
import { LoadingController } from './LoadingController';
import { BookSeal } from './BookSeal';
import { Marquee } from './Marquee';
const { ccclass, property } = _decorator;

/** 选关界面的两种视图 */
export enum ViewMode {
    Challenge = 0,   // 挑战模式：唱片 + 左右箭头 + 歌名/作者/难度/分数
    Story = 1,       // 剧情模式：换背景、藏起挑战模式专属 UI（点「书」进第一章是下一步）
}

@ccclass('LevelSelectController')
export class LevelSelectController extends Component {
    @property(Node) record: Node = null;        // 唱片节点
    @property(Button) leftBtn: Button = null;   // 左箭头
    @property(Button) rightBtn: Button = null;  // 右箭头
    @property(Button) backBtn: Button = null;   // 返回按钮
    @property(Button) recordBtn: Button = null; // 唱片按钮（点击进关卡）
    @property([SpriteFrame]) recordFrames: SpriteFrame[] = []; //3张唱片图（关1/关2/关3）

    // —— 唱片右侧的信息面板（5 个 Label，编辑器建好拖进来）——
    @property(Label) musicNameLabel: Label = null;    // 歌名
    @property(Label) musicAuthorLabel: Label = null;  // 作者
    @property(Label) difficultyLabel: Label = null;   // 难度星
    @property(Label) highScoreLabel: Label = null;    // 最高分
    @property(Label) lastScoreLabel: Label = null;    // 上次分

    // 两行跑马灯滚动体（歌名+作者一行、最高分+上次得分一行），编辑器里建好拖进来
    @property(Marquee) nameMarquee: Marquee = null;   // 歌名+作者那行的滚动体
    @property(Marquee) scoreMarquee: Marquee = null;  // 分数那行的滚动体

    // 每关固定信息（歌名/作者/难度星），在编辑器面板里一条条填，下标对应关卡 1/2/3
    @property([String]) songNames: string[] = ['《第一关》', '《第二关》', '《快刀》'];
    @property([String]) songAuthors: string[] = ['七朵乐队', '待定', 'AI 生成'];
    @property([Number]) songStars: number[] = [3, 4, 5];

    // —— 挑战 / 剧情 模式切换 ——
    @property(Button) modeBtn: Button = null;            // 底部模式切换按钮（挑战模式 / 剧情模式）
    @property(Label) modeLabel: Label = null;            // 按钮上的文字，随模式变
    @property(Sprite) background: Sprite = null;         // 背景图（两种模式共用同一张 Sprite，切模式时换图）
    @property(SpriteFrame) storyBg: SpriteFrame = null;  // 剧情模式的背景图
    @property([Node]) challengeOnly: Node[] = [];        // 只在挑战模式显示的节点，切到剧情时统一隐藏
    @property([Node]) storyOnly: Node[] = [];            // 只在剧情模式显示的节点（书），切回挑战时隐藏
    @property(Node) bookNode: Node = null;
    @property(Node) fadeMask: Node = null;                // 模式切换用的全屏遮罩
    @property([Sprite]) tintSprites: Sprite[] = [];        // 需要随模式换色的按钮底图
    @property([SpriteFrame]) storyFrames: SpriteFrame[] = [];   // 剧情模式对应的按钮图（顺序同 tintSprites）

    private currentLevel = 0;//当前关卡索引 0/1/2
    private spinSpeed = 30;//唱片旋转速度（度/秒）
    private isSwitching = false;//切关动画中，防止连点

    private switching = false;                     // 模式切换动画中，防连点
    private origFrames: SpriteFrame[] = [];        // 按钮原始贴图（切回挑战模式时还原）
    private mode: ViewMode = ViewMode.Challenge;   // 当前处于哪个模式
    private challengeBg: SpriteFrame = null;       // 挑战模式的背景图（切走前记下来，切回时还原）

    // 记住上次停在哪个模式：从第一章回选关时，要落回剧情模式
    static lastModeStory: boolean = false;

    private bgmSource: AudioSource = null;   // 剧情模式的主题背景乐
    private storyClip: AudioClip = null;
    private challengeClip: AudioClip = null;
    private bgmLoading = false;

    start() {
        //三个按钮各自按一个监听事件(点击)
        this.leftBtn.node.on(Button.EventType.CLICK, this.onPrev,this);
        this.rightBtn.node.on(Button.EventType.CLICK,this.onNext,this);
        this.backBtn.node.on(Button.EventType.CLICK,this.onBack,this);
        this.recordBtn.node.on(Button.EventType.CLICK,this.onEnterLevel,this);
        if (this.modeBtn) this.modeBtn.node.on(Button.EventType.CLICK, this.toggleMode, this);   // 底部按钮：切模式
        if (this.bookNode) this.bookNode.on(Node.EventType.TOUCH_END, this.onEnterStory, this);   // 点书：进第一章

        this.refreshRecord();//初始化，显示第一张唱片

        // 记下按钮原始颜色，切回挑战模式时还原
        this.origFrames = this.tintSprites.map((sp) => (sp ? sp.spriteFrame : null));

        // 记下挑战模式的原始背景（切到剧情再切回来时还原），然后按当前模式刷一遍 UI
        if (this.background) this.challengeBg = this.background.spriteFrame;

        // 从第一章回来时，恢复上次的模式（不然会掉回挑战模式，书看不见）
        if (LevelSelectController.lastModeStory && this.mode !== ViewMode.Story) {
            this.mode = ViewMode.Story;
            this.applyMode();
        }
        this.applyMode();
    }

    // —— 模式切换：点一下按钮就在「挑战 / 剧情」之间来回切 ——
    toggleMode() {
        if (this.switching) return;          // 过渡中，忽略连点
        this.switching = true;

        // 没挂遮罩就退回直接切换
        if (!this.fadeMask) {
            this.mode = (this.mode === ViewMode.Challenge) ? ViewMode.Story : ViewMode.Challenge;
            this.applyMode();
            this.switching = false;
            return;
        }

        const mask = this.fadeMask;
        const op = mask.getComponent(UIOpacity) || mask.addComponent(UIOpacity);
        mask.active = true;      // 先激活，否则画不出也点不到
        op.opacity = 0;

        tween(op)
            .to(0.18, { opacity: 215 })     // 压黑
            .call(() => {
                // 全黑时切换，玩家看不到硬切
                this.mode = (this.mode === ViewMode.Challenge) ? ViewMode.Story : ViewMode.Challenge;
                this.applyMode();
            })
            .to(0.22, { opacity: 0 })       // 透出来
            .call(() => {
                mask.active = false;        // 隐藏，避免透明节点挡住点击
                this.switching = false;
            })
            .start();
    }

    // 按当前模式刷新界面：换背景、显隐挑战模式专属节点、改按钮文字
    applyMode() {
        LevelSelectController.lastModeStory = (this.mode === ViewMode.Story);
        const story = (this.mode === ViewMode.Story);

        // ① 背景：剧情模式换成剧情背景；storyBg 没拖进来时保持原图，避免背景变白
        if (this.background) {
            const frame = story ? this.storyBg : this.challengeBg;
            if (frame) this.background.spriteFrame = frame;
        }

        // ② 挑战模式专属节点统一显隐（唱片、左右箭头、歌名作者、难度、分数框…由编辑器数组决定）
        for (const n of this.challengeOnly) {
            if (n) n.active = !story;
        }

        // ③ 剧情模式专属节点（书）：和 ② 相反，剧情模式才显示
        for (const n of this.storyOnly) {
            if (n) n.active = story;
        }

        // ④ 按钮换图：剧情模式换成黑白版，挑战模式换回原图
        for (let i = 0; i < this.tintSprites.length; i++) {
            const sp = this.tintSprites[i];
            if (!sp) continue;
            const next = story ? this.storyFrames[i] : this.origFrames[i];
            if (next) sp.spriteFrame = next;    // 没配就保持原样，避免变白块
        }

        // ⑤ 按钮文字跟随当前模式，点它即切到另一个模式
        if (this.modeLabel) this.modeLabel.string = story ? '剧情模式' : '挑战模式';

        // ⑥ 剧情模式播放本关主题乐，挑战模式静音
        this.updateBgm(story);
    }

    // 选关的背景乐：挑战/剧情各一首，按模式切换
    private updateBgm(story: boolean) {
        const name = story ? 'select_story' : 'select_challenge';
        const cached = story ? this.storyClip : this.challengeClip;
        if (cached) { this.playBgmClip(cached); return; }
        if (this.bgmLoading === name) return;   // 已经在加载同一首
        this.bgmLoading = name;
        resources.load('audio/' + name, AudioClip, (err, clip) => {
            this.bgmLoading = '';
            if (err || !clip) { console.log('[选关] BGM 加载失败: ' + name); return; }
            if (story) this.storyClip = clip; else this.challengeClip = clip;
            this.playBgmClip(clip);
        });
    }

    private playBgmClip(clip: AudioClip) {
        if (!this.bgmSource) {
            this.bgmSource = this.getComponent(AudioSource) || this.addComponent(AudioSource);
            this.bgmSource.loop = true;
            this.bgmSource.volume = 0.4;
        }
        if (this.bgmSource.clip !== clip) {
            this.bgmSource.stop();
            this.bgmSource.clip = clip;
        }
        if (!this.bgmSource.playing) this.bgmSource.play();
    }

    onPrev(){//点左箭头上一关
        this.switchTo(this.currentLevel - 1);
    }

    onNext(){//点右箭头，下一关
        this.switchTo(this.currentLevel + 1);
    }

    // 切关：算好目标关卡（循环），再播一个「缩小→换图→放大」的过渡动画
    switchTo(level: number) {
        if (this.isSwitching) return;              // 动画没播完，忽略连点
        const count = this.recordFrames.length;
        this.currentLevel = ((level % count) + count) % count;   // 循环（负数也正确）
        this.isSwitching = true;

        tween(this.record)
            .to(0.12, { scale: new Vec3(0.6, 0.6, 1) })   // 先缩小
            .call(() => this.refreshRecord())             // 最小瞬间换图
            .to(0.12, { scale: new Vec3(1, 1, 1) })       // 再放大回原样
            .call(() => { this.isSwitching = false; })    // 播完解锁
            .start();
    }


    refreshRecord(){//把唱片替换成当前关卡的图案
        if(this.recordFrames.length > this.currentLevel){
            this.record.getComponent(Sprite).spriteFrame = this.recordFrames[this.currentLevel];
        }
        this.refreshInfo();//同步刷新右侧信息面板
    }

    // 更新右侧信息：歌名/作者/难度星（来自编辑器数组），最高分/上次得分（来自存档）
    refreshInfo(){
        const i = this.currentLevel;
        const name = this.songNames[i];
        const author = this.songAuthors[i];
        const stars = this.songStars[i];
        if (this.musicNameLabel) this.musicNameLabel.string = (name || '') + '/';
        if (this.musicAuthorLabel) this.musicAuthorLabel.string = author || '';
        if (this.difficultyLabel) this.difficultyLabel.string = '难度：' + '⭐'.repeat(stars || 0);
        const levelNo = i + 1;//关卡号 1/2/3
        if (this.highScoreLabel) {
            const best = sys.localStorage.getItem('level' + levelNo + '_best') || '0';
            this.highScoreLabel.string = '最高分：' + best + ' /';
        }
        if (this.lastScoreLabel) {
            const last = sys.localStorage.getItem('level' + levelNo + '_last') || '0';
            this.lastScoreLabel.string = '上次得分：' + last;
        }

        // 文本改完了，通知两行滚动体重新量宽、决定滚不滚
        if (this.nameMarquee) this.nameMarquee.refresh();
        if (this.scoreMarquee) this.scoreMarquee.refresh();
    }

    // 点「书」进入第一章（只在剧情模式下有效）
    onEnterStory() {
        if (this.mode !== ViewMode.Story) return;

        // 封条还在就先播解锁动画，播完再跳转
        const seal = this.bookNode ? this.bookNode.getComponent(BookSeal) : null;
        if (seal && seal.isLocked) {
            seal.unlock(() => LoadingController.goto('Chapter1'));
            return;
        }
        LoadingController.goto('Chapter1');
    }

    onBack(){
        LoadingController.goto('MainMenu');
    }

    onEnterLevel(){//点击唱片，进入关卡
        if (this.currentLevel === 0) {
            LoadingController.goto('Game');   // 第一关
        } else if (this.currentLevel === 1) {
            LoadingController.goto('Game2');  // 第二关
        } else if (this.currentLevel === 2) {
            LoadingController.goto('Game3');  // 第三关
        }
    }

    update(deltaTime: number) {//每帧让唱片转起来
        if (this.mode === ViewMode.Story) return;   // 剧情模式下唱片是隐藏的，不用白转
        this.record.angle += this.spinSpeed * deltaTime;
    }
}
