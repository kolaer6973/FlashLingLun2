import { _decorator, Component, Node, Sprite, SpriteFrame, Button, director, tween, Vec3, Label, sys } from 'cc';
import { LoadingController } from './LoadingController';
import { Marquee } from './Marquee';
const { ccclass, property } = _decorator;

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
    @property([String]) songNames: string[] = ['《第一关》', '《第二关》', '《寄明月》'];
    @property([String]) songAuthors: string[] = ['七朵乐队', '待定', '待定'];
    @property([Number]) songStars: number[] = [3, 4, 5];

    private currentLevel = 0;//当前关卡索引 0/1/2
    private spinSpeed = 30;//唱片旋转速度（度/秒）
    private isSwitching = false;//切关动画中，防止连点

    start() {
        //三个按钮各自按一个监听事件(点击)
        this.leftBtn.node.on(Button.EventType.CLICK, this.onPrev,this);
        this.rightBtn.node.on(Button.EventType.CLICK,this.onNext,this);
        this.backBtn.node.on(Button.EventType.CLICK,this.onBack,this);
        this.recordBtn.node.on(Button.EventType.CLICK,this.onEnterLevel,this);

        this.refreshRecord();//初始化，显示第一张唱片
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
        this.record.angle += this.spinSpeed * deltaTime;
    }
}


