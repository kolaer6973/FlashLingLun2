import { _decorator, Component, Node, Prefab, instantiate, NodePool, Vec3, input, Input, KeyCode, EventKeyboard, Label, AudioClip, AudioSource, Sprite, SpriteFrame, UITransform, UIOpacity, tween, resources, Tween, director, Slider, sys } from 'cc';
import { Note } from './Note';
import { LoadingController } from './LoadingController';
import { ChapterProgress } from './ChapterProgress';

const { ccclass, property } = _decorator;

@ccclass('GameController')
export class GameController extends Component {
    @property(Prefab)
    notePrefab: Prefab = null;   // 音符预制体

    @property(Node)
    noteContainer: Node = null;  // 音符的父节点

    @property(Label)
    scoreLabel: Label = null;    // 分数文字

    @property(Label)
    comboLabel: Label = null;    // 连击文字

    @property(Node)
    pauseMenu: Node = null;      // 暂停菜单（点齿轮弹出）

    @property(Slider)
    bgmSlider: Slider = null;    // 背景音乐音量滑条

    @property(Slider)
    sfxSlider: Slider = null;    // 消除音效音量滑条

    @property(Node)
    bgmFill: Node = null;        // BGM 音量条里的蓝色填充条

    @property(Node)
    sfxFill: Node = null;        // 音效音量条里的蓝色填充条

    @property(Label)
    timeLabel: Label = null;    // 倒计时文字

    @property(Node)
    resultPanel: Node = null;      // 结算面板（游戏结束时弹出）

    @property(Label)
    resultTitle: Label = null;     // 结算标题：游戏结束/失败/通关

    @property(Label)
    resultScore: Label = null;     // 结算里的分数

    @property(Label)
    resultCounts: Label = null;    // 结算里的判定统计（竖排，多行）

    @property(Node)
    hintNode: Node = null;         // 「点击任意位置返回」提示，做若隐若现动画

    @property(Label)
    successLabel: Label = null;    // 成功特效文字（判定类型+分数，放 combo 下面）

    @property returnScene: string = 'LevelSelect';   // 结算后回哪个场景
    @property bossMode: boolean = false;             // BOSS 战：赢了标记章节进度并回剧情场景
    @property bossKey: string = 'bear';           // BOSS 标识：bear / tianyu

    @property
    bpm: number = 148;   // 背景乐 BPM（每分钟拍数），调到大致合拍即可

    @property
    levelId: number = 1;   // 这是第几关（存档用；复制成第二关时改成 2）

    @property
    bgmName: string = 'game1';   // 背景乐文件名（不带 .mp3、不带 audio/ 前缀）；第二关改成 game2

    private hitVolume = 1;       // 消除音效音量（0~1）

    private trackX = [-480, -240, 0, 240, 480];   // 5条轨道的 x 坐标
    private judgeY = -300;                        // 判定线的高度（和场景里 JudgeLine 节点的 y 对齐）

    private score = 0;   // 当前分数
    private combo = 0;   // 当前连击

    private missY = -380;   // 漏判线（判定线下 80px）
    private miss = 0;       // 累计漏掉的音符数
    private maxMiss = 10;   // 最多漏 10 个，游戏失败（第一关容错放宽）

    private recentTracks: number[] = [];   // 最近出过音符的轨道，避免同轨音符互相遮挡

    private notePool = new NodePool();   // 音符对象池：复用音符，避免频繁 instantiate/destroy 触发 GC

    private hitSounds: AudioClip[] = [];      // 5 个音色（宫商角徵羽），下标对应轨道
    private audioSource: AudioSource = null;  // 共用一个音源：BGM 用 play，音效用 playOneShot
    private lightDotFrame: SpriteFrame = null; // 消除特效散出的光点贴图

    private paused = false;   // 是否暂停
    private passedLast = false;   // 上一局是否通关（结算返回时用）

    private perfectCount = 0;   // Perfect 次数
    private greatCount = 0;     // Great 次数
    private goodCount = 0;      // Good 次数

    private remainTime = 90;   // 剩余时间（秒）
    private passScore = 1000;  // 通关所需分数（可调）
    private gameEnded = false;    // 是否已结束，防止重复判断
    private gameStarted = false;  // BGM 真正响起后置 true，倒计时从这刻才开始
    private leadIn = 3;         // 开局让音乐先响的秒数，再开始掉音符（解决「乐没响音符先掉」）

    private fallTime = 2;       // 音符下落时间（秒）= (出生500 - 判定线-300) / 速度400；改 Note.speed 要同步改
    @property
    gameDuration: number = 90;  // 游戏总时长（秒）；第二关 100 秒改成 100


    start() {
        this.remainTime = this.gameDuration;   // 倒计时按关卡时长走
        this.playBgm();         // 进入关卡就播放 BGM（文件名由 bgmName 决定）
        this.loadHitSounds();   // 加载 5 个五声音阶音色
        this.loadLightDot();    // 加载消除特效的光点贴图
        // 音符生成改到 playBgm 里：BGM 真正响起后才按谱面排定（见 startChart）
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);

        if (this.pauseMenu) this.pauseMenu.active = false;   // 开局先隐藏暂停菜单
        if (this.resultPanel) this.resultPanel.active = false;   // 开局先隐藏结算面板

        // 音量滑条：拖动时实时调音量 + 蓝色填充条跟着缩
        if (this.bgmSlider) this.bgmSlider.node.on('slide', this.onBgmVolume, this);
        if (this.sfxSlider) this.sfxSlider.node.on('slide', this.onSfxVolume, this);
        this.onBgmVolume();   // 开局让填充条宽度和滑条初始进度对齐
        this.onSfxVolume();

        // 成功特效文字先藏起来
        if (this.successLabel) {
            const op = this.successLabel.node.getComponent(UIOpacity) || this.successLabel.node.addComponent(UIOpacity);
            op.opacity = 0;
        }
    }

    // 播放背景音乐：从 resources/audio/ 目录动态加载（文件名由 bgmName 配置），循环播放
    playBgm() {
        resources.load('audio/' + this.bgmName, AudioClip, (err, clip) => {
            if (err) {
                console.log('BGM 加载失败：', err);
                return;
            }
            if (!this.audioSource) {
                this.audioSource = this.node.addComponent(AudioSource);
            }
            this.audioSource.clip = clip;
            this.audioSource.loop = true;   // 循环播放
            this.audioSource.play();
            this.gameStarted = true;   // 音乐响起，倒计时从这刻正式开始（不再提前走）
            // 先让音乐响 leadIn 秒，再开始掉音符，避免「乐还没响、音符先掉」
            this.scheduleOnce(() => this.startChart(), this.leadIn);
        });
    }

    // 按谱面生成音符：BGM 真正响起后调用（三段式：开始→高潮→收尾，音符大致落在拍点上）
    startChart() {
        const beat = 60 / this.bpm;   // 每拍的秒数
        const hits: number[] = [];    // 每个音符「到达判定线」的时刻（秒）

        if (this.levelId === 2 || this.levelId === 3) {
            // 第二/三关：整体衔接更紧（全程每 1 拍），不再额外加密高潮（0.5 拍太密，5 轨道视觉上已经够密）
            // 第三关谱面暂定和第二关相同，等你想加难再单独改
            for (let t = 0; t < this.gameDuration; t += beat) hits.push(t);  // 全程每 1 拍 1 个
        } else {
            // 第一关：三段式谱面：开始(稀) → 高潮(密) → 收尾(稀)
            for (let t = 0; t < 15; t += beat * 2) hits.push(t);                  // 开始：每 2 拍 1 个
            for (let t = 15; t < 55; t += beat) hits.push(t);                     // 高潮：每 1 拍 1 个
            for (let t = 55; t < this.gameDuration; t += beat * 2) hits.push(t);  // 收尾：每 2 拍 1 个
        }

        // 每个音符在「到达时刻 - 下落时间」时生成，这样落到判定线正好卡在拍点上
        for (const hitTime of hits) {
            const delay = hitTime - this.fallTime;
            if (delay >= 0) {
                this.scheduleOnce(() => this.spawnNote(), delay);
            }
        }
    }

    // 加载 5 个五声音阶音色（宫商角徵羽 = C D E G A），下标对应轨道 0~4
    loadHitSounds() {
        const names = ['C4', 'D4', 'E4', 'G4', 'A4'];   // 从左到右音越来越高
        names.forEach((name, i) => {
            resources.load('audio/' + name, AudioClip, (err, clip) => {
                if (err) {
                    console.log('音色加载失败：', name, err);
                    return;
                }
                this.hitSounds[i] = clip;
            });
        });
    }

    // 加载光点粒子贴图（消除特效：蝴蝶收缩成光点后散出）
    loadLightDot() {
        resources.load('effects/光点/spriteFrame', SpriteFrame, (err, frame) => {
            if (err) {
                console.log('光点加载失败：', err);
                return;
            }
            this.lightDotFrame = frame;
        });
    }

    // 命中音符时播放对应轨道的音（用 playOneShot，不会打断 BGM）
    playHitSound(track: number) {
        if (!this.audioSource) {
            this.audioSource = this.node.addComponent(AudioSource);
        }
        const clip = this.hitSounds[track];
        if (clip) {
            this.audioSource.playOneShot(clip, this.hitVolume);
        }
    }

    spawnNote() {
        if (this.gameEnded) return;   // 游戏已结束，不再生成（防止已排定的音符继续掉）

        // 从对象池取一个音符，池空才真正 instantiate（复用，避免频繁创建销毁触发 GC）
        let note = this.notePool.get();
        if (!note) {
            note = instantiate(this.notePrefab);
        }

        // 随机选一条「最近没出过」的轨道，避免同轨音符连续撞在一起
        let track = Math.floor(Math.random() * 5);
        while (this.recentTracks.indexOf(track) !== -1) {
            track = Math.floor(Math.random() * 5);
        }
        this.recentTracks.push(track);
        if (this.recentTracks.length > 2) {                  // 只记最近 2 条，约 1 秒后该轨道可复用
            this.recentTracks.shift();
        }

        note.active = true;                                  // 重新显示（复用的音符被隐藏过）
        note.setPosition(new Vec3(this.trackX[track], 500, 0));  // 落在随机轨道顶部
        const noteComp = note.getComponent(Note);
        if (noteComp) noteComp.reset();                      // 重置成「刚出生」状态
        this.noteContainer.addChild(note);
    }

    // 结算时清掉所有还在下落的音符，避免结算面板出来了音符还在掉
    clearNotes() {
        const notes = [...this.noteContainer.children];   // 先拷贝一份，避免边删边遍历出错
        for (const note of notes) {
            if (note.getComponent(Note)) this.recycleNote(note);   // 回收进对象池
        }
    }

    onKeyDown(event: EventKeyboard) {
        if (this.paused) return;   // 暂停时按键不判定
        switch (event.keyCode) {
            case KeyCode.KEY_A: this.judgeTrack(0); break;  // A → 轨道0（最左）
            case KeyCode.KEY_S: this.judgeTrack(1); break;  // S → 轨道1
            case KeyCode.KEY_D: this.judgeTrack(2); break;  // D → 轨道2（中间）
            case KeyCode.KEY_J: this.judgeTrack(3); break;  // J → 轨道3
            case KeyCode.KEY_K: this.judgeTrack(4); break;  // K → 轨道4（最右）
        }
    }

    // 连击倍率：10 连击 1.5 倍，20 连击 2.0 倍，鼓励玩家打连击
    private comboMultiplier(): number {
        if (this.combo >= 20) return 2.0;
        if (this.combo >= 10) return 1.5;
        return 1.0;
    }

    judgeTrack(trackIndex: number) {
        const targetX = this.trackX[trackIndex];   // 这条轨道的 x 坐标
        let bestNote: Node = null;                 // 最近的音符
        let bestDist = 99999;                      // 最近的距离，先设超大

        // 遍历所有音符，找这条轨道上离判定线最近的
        for (const note of this.noteContainer.children) {
            const noteComp = note.getComponent(Note);
            if (!noteComp) continue;                    // 只考虑真音符，跳过特效光点
            if (!noteComp.enabled) continue;            // 已被消除（缩小动画中）的音符跳过，防止连点重复判定
            if (Math.abs(note.position.x - targetX) > 0.5) continue;  // 不是这条轨道，跳过
            const dist = Math.abs(note.position.y - this.judgeY);      // 音符中心到判定线的距离
            if (dist < bestDist) {
                bestDist = dist;
                bestNote = note;
            }
        }

        if (!bestNote) {                          // 这条轨道一个音符都没有
            return;
        }

        // 按距离分等级：只有 good/great/perfect 算命中；太远（提前/晚按）算 miss，连击归零
        let base = 0;         // 本次命中的基础分
        let judgeName = '';   // 判定类型（显示成功特效用）
        if (bestDist <= 10) {
            this.perfectCount++;
            base = 100;
            judgeName = 'Perfect';
            console.log('Perfect!');
        } else if (bestDist <= 30) {
            this.greatCount++;
            base = 60;
            judgeName = 'Great';
            console.log('Great!');
        } else if (bestDist <= 80) {
            this.goodCount++;
            base = 30;
            judgeName = 'Good';
            console.log('Good!');
        } else {
            console.log('太远了，没打中');
            this.combo = 0;          // 提前/晚按也算 miss，连击重置
            this.updateHUD();        // 刷新连击显示
            return;                  // 没打中，不销毁，音符继续掉
        }

        this.combo++;                            // 命中，连击 +1
        const gain = base * this.comboMultiplier();   // 本次实际加分（基础分 × 连击倍率）
        this.score += gain;
        this.playHitSound(trackIndex);           // 打中，播放这条轨道的音
        this.eliminateNote(bestNote);            // 打中了，播放消除特效
        this.updateHUD();                        // 更新屏幕上的分数和连击
        this.flashCombo();
        this.showSuccessEffect(judgeName, gain); // 显示「判定类型 + 加分」特效
    }

    // 命中后的消除特效：蝴蝶收缩成一个光点，再散出几颗光点
    eliminateNote(note: Node) {
        const pos = note.position.clone();
        const noteComp = note.getComponent(Note);
        if (noteComp) noteComp.enabled = false;   // 停住，不再往下掉、不再摆动

        // 1. 蝴蝶快速收缩成一个点，缩完回收进对象池（而不是销毁）
        tween(note)
            .to(0.12, { scale: new Vec3(0.01, 0.01, 1) })
            .call(() => this.recycleNote(note))
            .start();

        // 2. 朝四周散出光点
        this.spawnLightBurst(pos);
    }

    // 音符用完：停住、隐藏、放回对象池（不销毁，下次生成直接复用）
    recycleNote(note: Node) {
        if (!note || !note.isValid) return;
        const noteComp = note.getComponent(Note);
        if (noteComp) noteComp.enabled = false;   // 停住 update
        note.active = false;                       // 隐藏
        this.notePool.put(note);                   // 放回池（内部会 removeFromParent）
    }

     //连击闪现：瞬间显示，再逐渐淡出
     flashCombo(){
        const node = this.comboLabel.node;
        const s = Math.min(1.3 + this.combo * 0.05, 1.6);//连击越高，s越大，封顶1.6
        const op = this.comboLabel.node.getComponent(UIOpacity);
        if(!op) return;
        Tween.stopAllByTarget(op);//打断上一次还没淡完的动画
        Tween.stopAllByTarget(node);//打断上一次还没缩放完的动画
        op.opacity = 255;
        node.setScale(s,s,1);//弹大到s倍
        tween(node).to(0.3,{scale: new Vec3(1,1,1) }).start();//0.3秒恢复原来大小
        tween(op).to(1.0,{opacity: 0}).start();//再花1秒淡到全透明
     }

    // 成功特效：在 combo 下方显示「判定类型 + 本次加分」，弹一下再淡出
    showSuccessEffect(judgeName: string, gain: number) {
        if (!this.successLabel) return;
        this.successLabel.string = judgeName + ' +' + gain;
        const node = this.successLabel.node;
        const op = node.getComponent(UIOpacity) || node.addComponent(UIOpacity);
        Tween.stopAllByTarget(op);   // 打断上一次还没淡完的动画
        Tween.stopAllByTarget(node);
        op.opacity = 255;
        node.setScale(1.3, 1.3, 1);
        tween(node).to(0.15, { scale: new Vec3(1, 1, 1) }).start();   // 弹回原大小
        tween(op).to(0.8, { opacity: 0 }).start();                    // 淡出
    }

     pauseGame(){
        if(this.paused) return;
        this.paused = true;
        director.pause();//停所有的update/动画/生成
        if(this.audioSource) this.audioSource.pause();//手动停BGM
        if(this.pauseMenu) this.pauseMenu.active = true;//显示暂停菜单
     }

     resumeGame(){
        if(!this.paused) return;
        this.paused = false;
        director.resume();
        if(this.audioSource) this.audioSource.play();//恢复BGM
        if(this.pauseMenu) this.pauseMenu.active = false;//隐藏暂停菜单
     }

    // 齿轮按钮：点一下暂停，再点一下继续
    togglePause() {
        if (this.paused) {
            this.resumeGame();
        } else {
            this.pauseGame();
        }
    }

    // BGM 音量：进度(0~1) 映射到 audioSource.volume，蓝色填充条跟着缩
    onBgmVolume() {
        if (!this.bgmSlider) return;
        const p = this.bgmSlider.progress;
        if (this.audioSource) this.audioSource.volume = p;
        if (this.bgmFill) {
            const trackW = this.bgmSlider.node.getComponent(UITransform).width;
            this.bgmFill.getComponent(UITransform).width = trackW * p;
        }
    }

    // 消除音效音量：存进 hitVolume，命中时用；填充条跟着缩
    onSfxVolume() {
        if (!this.sfxSlider) return;
        const p = this.sfxSlider.progress;
        this.hitVolume = p;
        if (this.sfxFill) {
            const trackW = this.sfxSlider.node.getComponent(UITransform).width;
            this.sfxFill.getComponent(UITransform).width = trackW * p;
        }
    }

    // 返回选关：先恢复再切场景（不恢复的话下个场景还是暂停状态）
    returnToSelect() {
        director.resume();
        if (this.bossMode) {
            if (this.bossKey === 'tianyu') {
                ChapterProgress.tianyuDefeated = this.passedLast;
            } else {
                ChapterProgress.bearDefeated = this.passedLast;
            }
        }
        LoadingController.goto(this.returnScene);
    }

    // 在 pos 位置向四周散出 6 颗光点，飞出去并逐渐消失
    spawnLightBurst(pos: Vec3) {
        if (!this.lightDotFrame) return;   // 光点图还没加载好，先跳过
        const count = 6;
        for (let i = 0; i < count; i++) {
            const dot = new Node('光点');
            dot.layer = this.noteContainer.layer;   // 和音符同一层，确保被 UI 相机渲染
            const ut = dot.addComponent(UITransform);
            ut.setContentSize(36, 36);
            const sp = dot.addComponent(Sprite);
            sp.spriteFrame = this.lightDotFrame;
            sp.sizeMode = Sprite.SizeMode.CUSTOM;
            dot.setPosition(pos);
            this.noteContainer.addChild(dot);

            // 每个光点朝不同方向飞出去，并缩成一个点
            const ang = (Math.PI * 2 * i) / count + Math.random() * 0.6;
            const dist = 50 + Math.random() * 40;
            const target = new Vec3(
                pos.x + Math.cos(ang) * dist,
                pos.y + Math.sin(ang) * dist,
                0
            );
            tween(dot)
                .to(0.35, { position: target, scale: new Vec3(0.1, 0.1, 1) })
                .call(() => dot.destroy())
                .start();
            // 同时淡出
            const op = dot.addComponent(UIOpacity);
            tween(op)
                .to(0.35, { opacity: 0 })
                .start();
        }
    }

    updateHUD() {
        if (this.scoreLabel) {
            this.scoreLabel.string = '分数：' + this.score;
        }
        if (this.comboLabel) {
            this.comboLabel.string = '连击：' + this.combo;
        }
    }

    update(deltaTime: number) {
        if(this.gameEnded || !this.gameStarted) return;//已结束或还没开始（乐没响）就不再更新

        //倒计时
        this.remainTime -= deltaTime;
        if(this.remainTime <= 0){
            this.remainTime = 0;
            this.endGame(true);//时间到，判断通关还是结束
            return;
        }
        if(this.timeLabel){
            this.timeLabel.string = '时间：' + Math.ceil(this.remainTime) + 's';
        }
        // 每帧检查：有没有音符掉过漏判线还没被打中
        for (const note of this.noteContainer.children) {
            if (!note.getComponent(Note)) continue;   // 跳过特效光点
            if (note.position.y < this.missY) {
                this.miss++;          // 漏掉一个
                this.combo = 0;       // 连击清0
                console.log('Miss!');
                this.recycleNote(note);   // 漏掉，回收进对象池
                this.updateHUD();

                if (this.miss >= this.maxMiss) {
                    this.endGame(false);  // 漏太多，游戏结束
                    return;
                }
                break;                // 一帧只处理一个漏掉的
            }
        }
    }

    // 结算时存分数：只有通关才更新最高分（只增不减）；上次分无论通关与否都直接覆盖
    saveScore(passed: boolean) {
        const bestKey = 'level' + this.levelId + '_best';
        const lastKey = 'level' + this.levelId + '_last';
        if (passed) {
            const prevBest = parseInt(sys.localStorage.getItem(bestKey) || '0');
            if (this.score > prevBest) {
                sys.localStorage.setItem(bestKey, String(this.score));
            }
        }
        sys.localStorage.setItem(lastKey, String(this.score));
    }

    endGame(timeUp: boolean) {
        if (this.gameEnded) return;   // 防止连调两次
        this.gameEnded = true;
        this.unschedule(this.spawnNote);                              // 停止生成音符
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);    // 停止监听按键
        if (this.audioSource) this.audioSource.stop();                // 停 BGM
        this.clearNotes();                                            // 清掉还在下落的音符
        // 只有「通关」（时间到且分数达标）才记录最高分；失败/分数不够只记录上次分
        const passed = timeUp && this.score >= this.passScore;
        this.passedLast = passed;
        this.saveScore(passed);

        // 判断三种结局
        if (!timeUp) {
            this.showResult('游戏失败');                 // 漏满 maxMiss 个音符，失败
        } else if (this.score >= this.passScore) {
            this.showResult('游戏通关');                 // 时间到、分数够
        } else {
            this.showResult('游戏结束');                 // 时间到、分数不够
        }
    }

    // 结算：显示结果面板，填入标题、最终分数、竖排判定统计，并让提示文字若隐若现
    showResult(title: string) {
        if (this.resultPanel) this.resultPanel.active = true;
        if (this.resultTitle) this.resultTitle.string = title;
        if (this.resultScore) this.resultScore.string = '分数：' + this.score;
        if (this.resultCounts) {
            // 竖排：每种判定占一行，只写数量，「:」前后各留一个空格
            this.resultCounts.string =
                'Perfect : ' + this.perfectCount + '\n' +
                'Great : ' + this.greatCount + '\n' +
                'Good : ' + this.goodCount + '\n' +
                'Miss : ' + this.miss;
        }
        // 提示文字「点击任意位置返回」若隐若现（循环淡入淡出）
        if (this.hintNode) {
            let op = this.hintNode.getComponent(UIOpacity);
            if (!op) op = this.hintNode.addComponent(UIOpacity);
            op.opacity = 255;
            tween(op)
                .repeatForever(
                    tween()
                        .to(1.5, { opacity: 40 })
                        .to(1.5, { opacity: 255 })
                )
                .start();
        }
    }
}

