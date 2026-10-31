// ============================================================
// 第一章剧情文本（游戏版）
//
// Line 字段：
//   speaker   说话人名；空字符串 = 旁白（无名字、无立绘）
//   text      台词，可用 \n 换行
//   cg        背景插画（assets/resources/cg/ 下的文件名，不带后缀）；留空 = 沿用上一句
//   portrait  立绘节点名（场景里 DialogueBox.portraits 数组中的节点）；留空 = 不显示
// ============================================================

export interface Line {
    speaker: string;
    text: string;
    cg?: string;
    portrait?: string;
    shake?: boolean;   // 这一句播放时画面震动
}

/** 开场黑屏旁白（坠崖） */
export const CH1_OPENING_BLACK: string[] = [
    '风灌进耳朵。',
    '不是崖壁在往上——',
    '是我在往下掉。',
    '笛子……别松手……',
    '水面在瞳孔里放大。',
    '砰。',
];

/** 醒来（地图出现后的第一段对话） */
export const CH1_OPENING: Line[] = [
    { speaker: '', text: '伶伦是被热醒的。', cg: 'ch1_shore' },
    { speaker: '', text: '脸颊上一阵一阵的烘烤感，像有人把暖手宝贴在他脸上，还不肯拿开。' },
    { speaker: '', text: '他睁开眼。先看见一片星空。' },
    { speaker: '伶伦', text: '……好看。', portrait: '伶伦' },
    { speaker: '伶伦', text: '等等。我为什么躺在地上？', portrait: '伶伦' },
    { speaker: '', text: '身后是静得发黑的湖水，面前是一堆篝火，再往前，是密不透光的林子。' },
    { speaker: '伶伦', text: '冷静。先捋一下。', portrait: '伶伦' },
    { speaker: '伶伦', text: '吹了一段不认识的谱子。掉了下去。醒来躺在这里。', portrait: '伶伦' },
    { speaker: '伶伦', text: '……我穿越了？', portrait: '伶伦' },
    { speaker: '伶伦', text: '客服呢。', portrait: '伶伦' },
    { speaker: '', text: '没有人回答。' },
    { speaker: '伶伦', text: '行吧。那我自己来。', portrait: '伶伦' },
    { speaker: '', text: '（点击地面走动，或点击篝火）' },
];

/** 点篝火：观察火堆 + 发现玉笛（结束前自动接熊） */
export const CH1_FIRE: Line[] = [
    { speaker: '', text: '这火很怪。', cg: 'ch1_shore' },
    { speaker: '', text: '柴枝整整齐齐垒着，粗的在下，细的在上，每一根长度都差不多。' },
    { speaker: '伶伦', text: '不是随手点的火。', portrait: '伶伦' },
    { speaker: '', text: '更像是，有人特意为他点的。' },
    { speaker: '', text: '他低头看了看自己的腰，忽然僵住。' },
    { speaker: '', text: '腰上挂着一支笛子。玉色的笛身，通体莹润。', cg: 'ch1_flute' },
    { speaker: '', text: '一端系着细绳，吊着一块指甲盖大小的玉牌，上面刻着一个字。' },
    { speaker: '', text: '伶。' },
    { speaker: '伶伦', text: '这不是我的笛子。', portrait: '伶伦' },
    { speaker: '', text: '他的竹笛，在落水的时候已经被冲走了。' },
    { speaker: '伶伦', text: '……工艺不错。这个孔距，挺讲究。', portrait: '伶伦' },
    { speaker: '', text: '他把玉笛举到唇边，想试一个音。' },
    { speaker: '', text: '手伸到一半，停住了。' },
    { speaker: '奶奶', text: '他还说，不能乱吹。' },
    { speaker: '', text: '他把笛子拿开一寸，没有吹。' },
    { speaker: '伶伦', text: '这不是害怕。是谨慎。', portrait: '伶伦' },
];

/** 熊（篝火剧情结束后自动接上） */
export const CH1_BEAR: Line[] = [
    { speaker: '', text: '夜很静。', cg: 'ch1_shore' },
    { speaker: '', text: '虫鸣，水声，风吹过树梢的沙沙声。' },
    { speaker: '', text: '这些声音之间，有一种隐隐约约的节奏。' },
    { speaker: '伶伦', text: '我这是干嘛。在这儿给林子打拍子。', portrait: '伶伦' },
    { speaker: '', text: '啪。' },
    { speaker: '', text: '像一根枯枝，被踩断了。' },
    { speaker: '伶伦', text: '……风吧。', portrait: '伶伦' },
    { speaker: '', text: '第二声响动。更近了。' },
    { speaker: '', text: '灌木猛地向两边分开。', cg: 'ch1_bear' },
    { speaker: '', text: '一头棕熊。' },
    { speaker: '', text: '伶伦的脑子一片空白。' },
    { speaker: '', text: '手速用不上。音准用不上。背过的几千首谱子，没有一样能挡住一头熊。' },
    { speaker: '', text: '熊低吼了一声。很低，很粗，尾音里带着一丝颤抖。' },
    { speaker: '', text: '那不是饥饿，是惊惧。' },
    { speaker: '', text: '对它来说，他才是闯进来的那个。' },
    { speaker: '', text: '一个很久以前的声音，忽然从记忆深处冒了出来。' },
    { speaker: '爷爷', text: '笛子不是用来炫技的。吹之前，先想清楚，你是在对谁说话。' },
    { speaker: '伶伦', text: '对谁说话。', portrait: '伶伦' },
    { speaker: '', text: '他握住了玉笛。' },
    { speaker: '伶伦', text: '不能吹到第七小节。', portrait: '伶伦' },
    { speaker: '', text: '熊已经冲到了三步之内。' },
    { speaker: '', text: '他把玉笛举到唇边。' },
];

/** 收尾（战斗胜利后） */
export const CH1_ENDING: Line[] = [
    { speaker: '', text: '第一个音落下。清，轻，像是有人在夜里点亮了一盏很小的灯。', cg: 'ch1_play' },
    { speaker: '', text: '笛孔里飘出一点光。淡蓝色，像一粒被风吹起来的萤火。' },
    { speaker: '', text: '接着是第二点，第三点。它们在空中舒展开，变成一对薄得几乎透明的翅膀。' },
    { speaker: '', text: '蝴蝶。', cg: 'ch1_butterfly' },
    { speaker: '', text: '一只，两只，越来越多。绕着他的笛声转了一圈，齐齐朝熊飞去。' },
    { speaker: '', text: '最前面那只，轻轻落在熊的鼻尖上。像一滴水融进水里。' },
    { speaker: '', text: '熊的动作彻底停住了。' },
    { speaker: '', text: '那声低吼，慢慢，慢慢地沉了下去。' },
    { speaker: '', text: '它看了他很久。然后转过身，一步一步走回密林。' },
    { speaker: '', text: '灌木重新合拢，棕红色的影子消失在黑暗里。' },
    { speaker: '', text: '伶伦腿一软，一屁股坐在了地上。', cg: 'ch1_shore' },
    { speaker: '', text: '玉牌在火光里，轻轻晃了一下。' },
    { speaker: '伶伦', text: '刚才吹笛的时候……我没有想过任何人的评价。', portrait: '伶伦' },
    { speaker: '', text: '这是他吹了十几年笛子，第一次。' },
];
/** 第二章：车队遇袭（地图上第二个剧情点触发） */
export const CH1_CONVOY: Line[] = [
    { speaker: '', text: '远处传来一声闷响。', cg: 'ch1_shore' },
    { speaker: '伶伦', text: '……什么声音。', portrait: '伶伦' },
    { speaker: '', text: '接着是第二声。金属撞在一起的声音。' },
    { speaker: '伶伦', text: '有人在打架？', portrait: '伶伦' },
    { speaker: '', text: '他往林子里走了几步。火光从树缝里透出来。', cg: 'ch2_convoy' },
    { speaker: '', text: '一辆马车歪在路中间。货箱被劈开，木片撒了一地。' },
    { speaker: '', text: '火把掉在地上，烧着一小片草。' },
    { speaker: '伶伦', text: '……人。', portrait: '伶伦' },
    { speaker: '', text: '地上躺着人。不止一个。' },
    { speaker: '伶伦', text: '喂！', portrait: '伶伦' },
    { speaker: '', text: '没有人回答。' },
    { speaker: '伶伦', text: '……', portrait: '伶伦' },
    { speaker: '', text: '他退了一步。脚下的枯枝响了。' },
    { speaker: '', text: '林子里的动静，停了。' },
    { speaker: '伶伦', text: '完了。', portrait: '伶伦' },
];

/** 第三章：面纱女子（对话后进入她那一战） */
export const CH1_TIANYU: Line[] = [
    { speaker: '', text: '一个人影站在车顶上。', cg: 'ch3_tianyu' },
    { speaker: '', text: '蒙着面纱。手里一把窄刀。' },
    { speaker: '面纱女子', text: '还有一个。' },
    { speaker: '伶伦', text: '我不是——我只是路过——', portrait: '伶伦' },
    { speaker: '', text: '她没有听。' },
    { speaker: '', text: '刀出鞘的声音很轻。' },
    { speaker: '伶伦', text: '……跑不掉。', portrait: '伶伦' },
    { speaker: '', text: '他的手摸到了腰间的玉笛。' },
    { speaker: '伶伦', text: '不能吹到第七小节。', portrait: '伶伦' },
    { speaker: '', text: '他举起玉笛。' },
];

/** 打完面纱女子：律蝶制住她 → 揭面纱 → 她留下刀走了 */
export const CH1_TIANYU_END: Line[] = [
    { speaker: '', text: '笛声没有停。', cg: 'ch3_subdue' },
    { speaker: '', text: '蓝色的蝴蝶从笛孔里涌出来，围着她转。' },
    { speaker: '', text: '她的动作僵住了。' },
    { speaker: '面纱女子', text: '……这是什么。' },
    { speaker: '', text: '刀停在半空。' },
    { speaker: '', text: '风把她的面纱掀开了一角。', cg: 'ch3_face' },
    { speaker: '伶伦', text: '……', portrait: '伶伦' },
    { speaker: '', text: '很年轻。比他想象中年轻得多。' },
    { speaker: '面纱女子', text: '……你看什么。' },
    { speaker: '', text: '远处传来一声呼哨。' },
    { speaker: '高大的男人', text: '撤。' },
    { speaker: '', text: '她退了半步。' },
    { speaker: '面纱女子', text: '今天就到这儿。' },
    { speaker: '', text: '刀插在地上。她转身，消失在林子里。', cg: 'ch3_blade' },
    { speaker: '', text: '伶伦坐在原地，很久没有动。' },
    { speaker: '伶伦', text: '……我刚才，差点死了。', portrait: '伶伦' },
    { speaker: '', text: '刀还插在地上。刀身很薄，映着一点月光。' },
    { speaker: '', text: '他忽然想到：她明明可以杀了他。' },
    { speaker: '', text: '第一章 完' },
];
