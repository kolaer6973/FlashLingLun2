import { _decorator, Component, AudioSource, AudioClip, resources } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 场景背景音乐：进入场景就循环播放，切场景自动停（场景销毁时 AudioSource 一起没）。
 *
 * 用法：挂在场景的 Canvas 上，填 bgmName（resources/audio/ 下的文件名，不带后缀）。
 */
@ccclass('SceneBgm')
export class SceneBgm extends Component {
    @property({ tooltip: 'resources/audio/ 下的文件名，例如 chapter1' })
    bgmName: string = '';

    @property({ tooltip: '音量 0~1' })
    volume: number = 0.44;

    start() {
        if (!this.bgmName) return;

        resources.load('audio/' + this.bgmName, AudioClip, (err, clip) => {
            if (err || !clip) {
                console.log('[BGM] 加载失败: ' + this.bgmName);
                return;
            }
            const src = this.getComponent(AudioSource) || this.addComponent(AudioSource);
            src.clip = clip;
            src.loop = true;
            src.volume = this.volume;
            src.play();
        });
    }
}