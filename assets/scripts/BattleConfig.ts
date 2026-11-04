/**
 * 剧情战斗的临时配置。
 *
 * 剧情的所有 BOSS 战都共用 Boss.scene，进场景前把这一场的参数写在这里，
 * GameController 在 start() 里读走，之后场景本身不用改。
 */
export class BattleConfig {
    /** 是否启用了覆盖配置（false = 用场景里序列化的默认值，即挑战模式） */
    static active: boolean = false;

    static bgm: string = 'game1';        // resources/audio/ 下的文件名
    static bpm: number = 120;
    static levelId: number = 90;
    static bossKey: string = 'bear';     // 打赢后写哪个进度：bear / tianyu
    static bgImage: string = '';
    static difficulty: string = 'normal';   // easy / normal / hard         // resources/cg/ 下的文件名，空 = 不改背景
    static gameDuration: number = 90;

    static set(cfg: {
        bgm: string; bpm: number; levelId: number;
        bossKey: string; bgImage: string; difficulty?: string; gameDuration?: number;
    }) {
        BattleConfig.active = true;
        BattleConfig.bgm = cfg.bgm;
        BattleConfig.bpm = cfg.bpm;
        BattleConfig.levelId = cfg.levelId;
        BattleConfig.bossKey = cfg.bossKey;
        BattleConfig.bgImage = cfg.bgImage;
        BattleConfig.difficulty = cfg.difficulty || 'normal';
        BattleConfig.gameDuration = cfg.gameDuration || 90;
    }

    static clear() {
        BattleConfig.active = false;
    }
}