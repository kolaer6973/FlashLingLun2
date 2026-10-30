// ============================================================
// 第一章剧情文本（游戏文本版）
//
// 格式：
//   speaker   说话人名字。空字符串 '' = 旁白，不显示名字、不显示立绘
//   text      台词内容，可以写 \n 换行
//   cg        可选。背景插画文件名（放在 assets/resources/cg/ 下，不带后缀）
//             留空 = 沿用上一句的背景
//   portrait  可选。立绘文件名（放在 assets/resources/portrait/ 下，不带后缀）
//             留空 = 隐藏立绘（旁白、过渡语就该留空）
//
// 资源放法（必须以 assets/resources/ 开头，才能用 resources.load 按名字加载）：
//   assets/resources/cg/ch1_fire.png
//   assets/resources/portrait/linglun.png
// ============================================================

export interface Line {
    speaker: string;
    text: string;
    cg?: string;
    portrait?: string;
}

/** 篝火旁醒来：第一部分剧情（出生点） */
export const CH1_FIRE_SPAWN: Line[] = [
    {
        speaker: '',
        text: '（此处待填）湖水灌进耳朵的声音，慢慢退成了风声。',
        cg: 'ch1_fire',
    },
    {
        speaker: '林沦',
        text: '（此处待填）……这是哪里？我明明还在台上。',
        portrait: '林沦',
    },
    {
        speaker: '',
        text: '（此处待填）掌心残留着一丝温热，像是某种东西在回应他。',
    },
    {
        speaker: '林沦',
        text: '（此处待填）音律……还在。',
        portrait: '林沦',
    },
];

/** 远处篝火：第二部分剧情 */
export const CH1_FIRE_FAR: Line[] = [
    {
        speaker: '',
        text: '（此处待填）更远处的火光，隐约有身影在动。',
        cg: 'ch1_far',
    },
    {
        speaker: '？？？',
        text: '（此处待填）别出声。',
        portrait: 'jiling',
    },
];