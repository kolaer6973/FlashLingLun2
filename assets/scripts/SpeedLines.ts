import { _decorator, Component, Node, Graphics, Color, view } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('SpeedLines')
export class SpeedLines extends Component {
    @property count: number = 24;//线条数量
    @property speed: number = 700;//线条速度
    @property speedVar: number = 300;//速度随机浮动范围
    @property lineWidth: number = 3;//线宽
    @property lineHeight: number = 90;//线条高度
    @property lineHeightVar: number = 50;//线长随机浮动范围
    @property alpha: number =150;//透明度0-255。越小越淡
    @property lineAreaLeft: number = -960;   // 线条区域左边界（屏幕坐标）
    @property lineAreaRight: number = 0;     // 线条区域右边界（按钮在哪就往左调）

    private lines:{node:Node;speed:number}[] = [];
    private screenW = 1920;
    private screenH = 1080;



    start() {
        const size = view.getVisibleSize();
        this.screenW = size.width;
        this.screenH = size.height;

        for(let i = 0;i < this.count;i++){
            this.lines.push(this.createLine());
        }
    }

    private createLine(){
        const h = this.lineHeight + Math.random() * this.lineHeightVar;

        const node = new Node('line');
        node.layer = this.node.layer;//跟随父节点的UI渲染层
        node.parent = this.node;
        node.setPosition(this.randomX(),this.randomY(),0);

        const g = node.addComponent(Graphics);
        g.fillColor = new Color(126,200,227,this.alpha);
        g.rect(-this.lineWidth/2,-h/2,this.lineWidth,h);
        g.fill();

        return { node, speed:this.speed + Math.random() *this.speedVar};
    }

    private randomX(){
        return this.lineAreaLeft + Math.random() * (this.lineAreaRight - this.lineAreaLeft);
    }


    //首次出生：从屏幕下沿到上沿之上一个屏高之间随机，让部分线条一开始就入屏
      private randomY() {
          return this.screenH / 2 - Math.random() * this.screenH * 2;
      }

      update(dt: number) {
          const bottom = -this.screenH / 2 - 100;   // 出屏下沿
          const top = this.screenH / 2 + 100;       // 出屏上沿

          for (const line of this.lines) {
              const p = line.node.position;
              line.node.setPosition(p.x, p.y + line.speed * dt, 0);

              if (line.node.position.y > top) {
                  line.node.setPosition(
                      this.randomX(),
                      bottom - Math.random() * this.screenH,   // 回到上方再落
                      0
                  );
              }
          }
      }
}


